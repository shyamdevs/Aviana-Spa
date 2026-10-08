import Booking from '../models/Booking.js';
import AvailabilityBlock from '../models/AvailabilityBlock.js';
import Service from '../models/Service.js';
import Therapist from '../models/Therapist.js';
import Setting from '../models/Setting.js';
import Payment from '../models/Payment.js';
import { assertBookingInput } from '../validators/booking.js';
import { fromMinutes, releaseExpiredBookings, toMinutes } from '../utils/availability.js';
import { env } from '../config/env.js';
import { razorpay } from '../utils/razorpay.js';
import { logActivity } from '../utils/activity.js';
import { sendEmail, bookingConfirmationHtml } from '../utils/email.js';
import { getIndiaNow } from '../utils/indiaTime.js';
import { publicBooking } from '../utils/serializers.js';
import { calculateBookingAmounts, getActiveBookingOption, normalizePaymentType, resolveExtraServices, PAYMENT_STATUSES, roundMoney } from '../utils/bookingPricing.js';

const activeStatuses = ['payment_pending', 'confirmed', 'completed', 'no_show'];

async function pickTherapist({ therapistId, gender, bookingType, date, time, service }) {
  const day = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = day.getUTCDay();
  const query = {
    isActive: true,
    workingDays: dayOfWeek,
    ...(gender && gender !== 'any' ? { gender } : {}),
    ...(bookingType === 'home' ? { offersHomeService: true } : {}),
    ...(therapistId ? { _id: therapistId } : {}),
  };
  const candidates = await Therapist.find(query).populate('services', 'title slug').sort({ rating: -1, name: 1 });
  const start = toMinutes(time);
  const slots = Array.from({ length: Math.ceil(service.durationMinutes / 15) }, (_, index) => fromMinutes(start + index * 15));
  const blocks = await AvailabilityBlock.find({ date: day, $or: [{ therapist: null }, { therapist: { $in: candidates.map((item) => item._id) } }] }).select('therapist startTime endTime');
  for (const therapist of candidates) {
    if (therapistId && !therapist.services?.some((item) => String(item._id) === String(service._id))) continue;
    if (start < toMinutes(therapist.shiftStart) || start + service.durationMinutes > toMinutes(therapist.shiftEnd)) continue;
    if (blocks.some((block) => (!block.therapist || String(block.therapist) === String(therapist._id)) && start < toMinutes(block.endTime) && start + service.durationMinutes > toMinutes(block.startTime))) continue;
    const clash = await Booking.findOne({ therapist: therapist._id, date: day, slotKeys: { $in: slots }, bookingStatus: { $in: activeStatuses } }).select('_id');
    if (!clash) return { therapist, slots };
  }
  return null;
}

async function loadBookingForUser(id, userId) {
  return Booking.findOne({ _id: id, user: userId })
    .populate('service', 'title slug category description durationMinutes spaPrice homePrice image homeServiceAvailable')
    .populate('therapist', 'name gender profileImage image coverImage bio experience specialization rating skills services workingDays shiftStart shiftEnd offersHomeService');
}

export async function createBooking(req, res) {
  await releaseExpiredBookings();
  assertBookingInput(req.body);
  const { serviceId, therapistId, therapistGender = 'any', bookingType, date, time, customerName, customerEmail, customerPhone, spaAddress, homeAddress, notes, extraServiceIds = [], paymentType } = req.body;
  const normalizedPaymentType = normalizePaymentType(paymentType);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ success: false, message: 'Choose a valid date and time.' });
  const indiaNow = getIndiaNow();
  if (date < indiaNow.date) return res.status(400).json({ success: false, message: 'Booking date must be today or later.' });
  if (date === indiaNow.date && toMinutes(time) <= indiaNow.minutes) return res.status(400).json({ success: false, message: 'Choose a future time.' });
  if (String(customerEmail).trim().toLowerCase() !== req.user.email) return res.status(400).json({ success: false, message: 'Booking email must match your account email.' });
  if (!['spa', 'home'].includes(bookingType)) return res.status(400).json({ success: false, message: 'Invalid booking type.' });
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  if (bookingType === 'home' && !service.homeServiceAvailable) return res.status(400).json({ success: false, message: 'Home service is not available for this treatment.' });
  if (therapistId) {
    const selectedTherapist = await Therapist.findOne({ _id: therapistId, isActive: true }).select('services name');
    if (!selectedTherapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
    const canPerformService = (selectedTherapist.services || []).some((id) => String(id) === String(service._id));
    if (!canPerformService) return res.status(400).json({ success: false, message: `${selectedTherapist.name} does not offer this treatment. Please choose one of their listed services.` });
  }
  const settings = await Setting.findOne({ key: 'global' });
  const startMinutes = toMinutes(time);
  const opening = toMinutes(settings?.openingTime || '09:00');
  const closing = toMinutes(settings?.closingTime || '20:00');
  if (startMinutes < opening || startMinutes + service.durationMinutes > closing) return res.status(400).json({ success: false, message: 'That time is outside spa operating hours.' });

  const requestedDate = new Date(`${date}T00:00:00.000Z`);
  const picked = await pickTherapist({ therapistId, gender: therapistGender, bookingType, date, time, service });
  if (!picked) return res.status(409).json({ success: false, message: 'That slot is no longer available. Please choose another.' });
  const { therapist, slots } = picked;
  if (bookingType === 'home' && !homeAddress) return res.status(400).json({ success: false, message: 'Home address is required.' });
  const finalSpaAddress = spaAddress || settings?.spaAddress || '';
  if (bookingType === 'spa' && !finalSpaAddress) return res.status(400).json({ success: false, message: 'Spa location is required.' });

  const baseServiceAmount = roundMoney((bookingType === 'home' ? service.homePrice : service.spaPrice) + (bookingType === 'home' ? (settings?.homeVisitFee ?? env.homeVisitFee) : 0));
  const extras = await resolveExtraServices(extraServiceIds);
  const bookingOption = normalizedPaymentType === 'BOOKING' ? await getActiveBookingOption() : null;
  const pricing = calculateBookingAmounts({ baseServiceAmount, extraServices: extras, paymentType: normalizedPaymentType, settings: settings || {}, bookingOption });
  const snapshotExtras = extras.map((extra) => ({ serviceId: extra._id, name: extra.name, price: roundMoney(extra.price) }));

  let booking;
  try {
    booking = await Booking.create({
      user: req.user._id, service: service._id, therapist: therapist._id, therapistGender: therapist.gender, bookingType,
      date: requestedDate, time, durationMinutes: service.durationMinutes, slotKeys: slots,
      spaAddress: bookingType === 'spa' ? finalSpaAddress : '', homeAddress: bookingType === 'home' ? homeAddress.trim() : '',
      customerName: customerName.trim(), customerEmail: req.user.email, customerPhone: customerPhone.trim(), notes: notes?.trim() || '',
      extraServices: snapshotExtras,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discountPercentage: pricing.discountPercentage,
      totalAmount: pricing.totalAmount,
      price: pricing.totalAmount,
      paidAmount: 0,
      remainingAmount: pricing.remainingAmount,
      initialPaymentAmount: pricing.initialAmount,
      bookingAmount: pricing.bookingAmount,
      paymentType: normalizedPaymentType,
      paymentStatus: PAYMENT_STATUSES.PENDING,
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'That slot was just booked by someone else. Please choose another time.' });
    throw error;
  }
  await logActivity({ actorType: 'user', actorId: req.user._id, action: 'booking_created', entityType: 'booking', entityId: booking._id, metadata: { serviceId, therapistId: therapist._id, totalAmount: pricing.totalAmount, paymentType: normalizedPaymentType, extraServiceIds: snapshotExtras.map((extra) => extra.serviceId) }, ip: req.ip });
  const populated = await loadBookingForUser(booking._id, req.user._id);
  res.status(201).json({ success: true, booking: publicBooking(populated), pricing });
}

export async function quoteBooking(req, res) {
  const { serviceId, therapistId = '', bookingType = 'spa', extraServiceIds = [], paymentType = 'FULL' } = req.body || {};
  if (!serviceId || !['spa', 'home'].includes(bookingType)) return res.status(400).json({ success: false, message: 'Service and booking type are required.' });
  const normalizedPaymentType = normalizePaymentType(paymentType);
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  if (bookingType === 'home' && !service.homeServiceAvailable) return res.status(400).json({ success: false, message: 'Home service is not available for this treatment.' });
  if (therapistId) {
    const selectedTherapist = await Therapist.findOne({ _id: therapistId, isActive: true }).select('services name');
    if (!selectedTherapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
    const canPerformService = (selectedTherapist.services || []).some((id) => String(id) === String(service._id));
    if (!canPerformService) return res.status(400).json({ success: false, message: `${selectedTherapist.name} does not offer this treatment. Please choose one of their listed services.` });
  }
  const settings = await Setting.findOne({ key: 'global' }) || {};
  const baseServiceAmount = roundMoney((bookingType === 'home' ? service.homePrice : service.spaPrice) + (bookingType === 'home' ? (settings.homeVisitFee ?? env.homeVisitFee) : 0));
  const extras = await resolveExtraServices(extraServiceIds);
  const bookingOption = normalizedPaymentType === 'BOOKING' ? await getActiveBookingOption() : null;
  const pricing = calculateBookingAmounts({ baseServiceAmount, extraServices: extras, paymentType: normalizedPaymentType, settings, bookingOption });
  res.json({ success: true, pricing, extraServices: extras.map((extra) => ({ _id: extra._id, name: extra.name, description: extra.description, price: roundMoney(extra.price), image: extra.image || '' })) });
}

export async function myBookings(req, res) {
  await releaseExpiredBookings();
  const bookings = await Booking.find({ user: req.user._id })
    .populate('service', 'title slug category description durationMinutes spaPrice homePrice image homeServiceAvailable')
    .populate('therapist', 'name gender profileImage image coverImage bio experience specialization rating skills workingDays shiftStart shiftEnd offersHomeService')
    .sort({ date: 1, createdAt: -1 });
  res.json({ success: true, bookings: bookings.map(publicBooking) });
}

export async function getBooking(req, res) {
  const booking = await loadBookingForUser(req.params.id, req.user._id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const payment = await Payment.findOne({ booking: booking._id, user: req.user._id }).sort({ createdAt: -1 }).select('orderId paymentId amount currency status method paymentPurpose paymentType provider createdAt updatedAt refundId refundAmount');
  res.json({ success: true, booking: publicBooking(booking), payment });
}

async function refundIfEligible(booking, reason, userId) {
  const settings = await Setting.findOne({ key: 'global' });
  const cutoff = (settings?.cancellationWindowHours ?? env.cancellationWindowHours) * 60 * 60 * 1000;
  if (new Date(booking.date).getTime() - Date.now() < cutoff) return { refundAmount: 0, reason: `Cancellation window passed (${settings?.cancellationWindowHours ?? env.cancellationWindowHours}h).` };
  const bookingPaymentStatus = String(booking.paymentStatus || '').toUpperCase();
  if (!['PAID', 'PARTIAL', 'paid', 'partially_refunded'].includes(bookingPaymentStatus) && Number(booking.paidAmount || 0) <= 0) return { refundAmount: 0 };
  if (!razorpay) { const error = new Error('Refund service is not configured. Contact Aviana support before cancelling this paid booking.'); error.status = 503; throw error; }

  const refundPercent = Math.max(0, Math.min(100, settings?.refundPercent ?? env.refundPercent));
  const payments = await Payment.find({ booking: booking._id, user: userId, provider: 'razorpay', status: { $in: ['paid', 'partially_refunded'] }, paymentId: { $exists: true, $ne: '' } });
  let refunded = 0;
  const refunds = [];
  for (const payment of payments) {
    const remaining = Number(payment.amount || 0) - Number(payment.refundAmount || 0);
    const amount = Math.min(remaining, Math.round(Number(payment.amount || 0) * refundPercent / 100));
    if (amount <= 0) continue;
    const locked = await Payment.findOneAndUpdate({ _id: payment._id, refundInProgress: false }, { $set: { refundInProgress: true } }, { new: true });
    if (!locked) continue;
    try {
      const refund = await razorpay.payments.refund(payment.paymentId, { amount: amount * 100, notes: { reason: reason || 'Customer cancellation', bookingId: booking._id.toString() } });
      locked.status = amount >= remaining ? 'refunded' : 'partially_refunded';
      locked.refundId = refund.id;
      locked.refundAmount = Number(locked.refundAmount || 0) + amount;
      locked.refundInProgress = false;
      await locked.save();
      refunded += amount;
      refunds.push({ paymentId: locked.paymentId, refundId: refund.id, refundAmount: amount });
    } catch (error) {
      locked.refundInProgress = false;
      await locked.save();
      throw error;
    }
  }
  return { refundAmount: refunded, refunds };
}

export async function cancelBooking(req, res) {
  const booking = await loadBookingForUser(req.params.id, req.user._id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['payment_pending', 'confirmed'].includes(booking.bookingStatus)) return res.status(400).json({ success: false, message: 'This booking can no longer be cancelled.' });
  const refund = await refundIfEligible(booking, req.body.reason, req.user._id);
  booking.bookingStatus = 'cancelled';
  booking.cancellation = { cancelledAt: new Date(), reason: req.body.reason?.trim() || 'Customer cancellation', ...refund };
  const totalAmount = roundMoney(booking.totalAmount ?? booking.price ?? 0);
  const paidTotals = await Payment.aggregate([
    { $match: { booking: booking._id, status: { $in: ['paid', 'partially_refunded'] } } },
    { $group: { _id: null, gross: { $sum: '$amount' }, refunded: { $sum: '$refundAmount' } } },
  ]);
  const paidAmount = Math.max(0, roundMoney((paidTotals[0]?.gross || 0) - (paidTotals[0]?.refunded || 0)));
  booking.totalAmount = totalAmount;
  booking.price = totalAmount;
  booking.paidAmount = Math.min(totalAmount, paidAmount);
  booking.remainingAmount = Math.max(0, totalAmount - booking.paidAmount);
  booking.paymentStatus = booking.paidAmount === 0 ? (refund.refundAmount ? 'REFUNDED' : 'CANCELLED') : booking.remainingAmount === 0 ? 'PAID' : 'PARTIAL';
  await booking.save();
  if (booking.bookingStatus === 'cancelled') await Payment.updateMany({ booking: booking._id, status: 'created' }, { $set: { status: 'failed' } });
  await logActivity({ actorType: 'user', actorId: req.user._id, action: 'booking_cancelled', entityType: 'booking', entityId: booking._id, metadata: refund, ip: req.ip });
  res.json({ success: true, booking: publicBooking(booking) });
}

export async function rescheduleBooking(req, res) {
  await releaseExpiredBookings();
  const booking = await loadBookingForUser(req.params.id, req.user._id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.bookingStatus !== 'confirmed' || !['paid', 'PAID', 'PARTIAL'].includes(String(booking.paymentStatus))) return res.status(400).json({ success: false, message: 'This booking is not eligible for rescheduling.' });
  const settings = await Setting.findOne({ key: 'global' });
  const rescheduleWindow = (settings?.rescheduleWindowHours ?? 2) * 60 * 60 * 1000;
  if (new Date(booking.date).getTime() - Date.now() < rescheduleWindow) return res.status(400).json({ success: false, message: `Rescheduling closes ${settings?.rescheduleWindowHours ?? 2} hours before the appointment.` });
  const { date, time } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ success: false, message: 'Choose a valid future date and time.' });
  const indiaNow = getIndiaNow();
  if (date < indiaNow.date || (date === indiaNow.date && toMinutes(time) <= indiaNow.minutes)) return res.status(400).json({ success: false, message: 'Choose a future date and time.' });
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  if (!booking.therapist.workingDays.includes(nextDate.getUTCDay())) return res.status(400).json({ success: false, message: 'Therapist is not available that day.' });
  const start = toMinutes(time);
  if (start < toMinutes(settings?.openingTime || '09:00') || start + booking.durationMinutes > toMinutes(settings?.closingTime || '20:00')) return res.status(400).json({ success: false, message: 'That time is outside spa operating hours.' });
  if (start < toMinutes(booking.therapist.shiftStart) || start + booking.durationMinutes > toMinutes(booking.therapist.shiftEnd)) return res.status(400).json({ success: false, message: 'That time is outside the therapist shift.' });
  const slots = Array.from({ length: Math.ceil(booking.durationMinutes / 15) }, (_, index) => fromMinutes(start + index * 15));
  const blocks = await AvailabilityBlock.find({ date: nextDate, $or: [{ therapist: null }, { therapist: booking.therapist._id }] }).select('startTime endTime');
  if (blocks.some((block) => start < toMinutes(block.endTime) && start + booking.durationMinutes > toMinutes(block.startTime))) return res.status(409).json({ success: false, message: 'That time is blocked from availability.' });
  const clash = await Booking.findOne({ _id: { $ne: booking._id }, therapist: booking.therapist._id, date: nextDate, slotKeys: { $in: slots }, bookingStatus: { $in: activeStatuses } });
  if (clash) return res.status(409).json({ success: false, message: 'That time slot is already booked.' });
  booking.rescheduleHistory.push({ fromDate: booking.date, fromTime: booking.time, toDate: nextDate, toTime: time, changedAt: new Date() });
  booking.date = nextDate;
  booking.time = time;
  booking.slotKeys = slots;
  try { await booking.save(); } catch (error) { if (error?.code === 11000) return res.status(409).json({ success: false, message: 'That time was just taken. Please choose another slot.' }); throw error; }
  const populated = await loadBookingForUser(booking._id, req.user._id);
  try { await sendEmail({ to: populated.customerEmail, subject: 'Aviana booking rescheduled', html: bookingConfirmationHtml(populated), text: `Your Aviana appointment was rescheduled to ${date} at ${time}.` }); } catch (error) { console.error('Reschedule email failed', error.message); }
  await logActivity({ actorType: 'user', actorId: req.user._id, action: 'booking_rescheduled', entityType: 'booking', entityId: booking._id, metadata: { date, time }, ip: req.ip });
  res.json({ success: true, booking: publicBooking(populated) });
}
