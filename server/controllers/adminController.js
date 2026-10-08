import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Therapist from '../models/Therapist.js';
import Service from '../models/Service.js';
import ActivityLog from '../models/ActivityLog.js';
import Setting from '../models/Setting.js';
import { setAdminCookie, clearAdminCookie } from '../utils/cookies.js';
import { signAdminToken } from '../utils/tokens.js';
import { logActivity } from '../utils/activity.js';
import { razorpay } from '../utils/razorpay.js';
import { env } from '../config/env.js';
import AvailabilityBlock from '../models/AvailabilityBlock.js';
import { publicBooking, publicService, publicTherapist } from '../utils/serializers.js';
import { storeImage } from '../utils/storage.js';

const safeAdmin = (admin) => ({ id: admin._id, name: admin.name, email: admin.email });
const cleanSkills = (skills) => Array.isArray(skills) ? skills.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 20) : [];
const therapistFields = ['name', 'gender', 'profileImage', 'coverImage', 'bio', 'experience', 'specialization', 'rating', 'skills', 'services', 'isActive', 'offersHomeService', 'workingDays', 'shiftStart', 'shiftEnd'];
const serviceFields = ['title', 'slug', 'category', 'description', 'durationMinutes', 'spaPrice', 'homePrice', 'image', 'homeServiceAvailable', 'isActive'];
const pickFields = (source, fields) => Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));

export async function adminLogin(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const admin = await Admin.findOne({ email }).select('+passwordHash');
  if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  setAdminCookie(res, signAdminToken(admin));
  await logActivity({ actorType: 'admin', actorId: admin._id, action: 'admin_login', entityType: 'admin', entityId: admin._id, ip: req.ip });
  res.json({ success: true, admin: safeAdmin(admin) });
}

export function adminMe(req, res) { res.json({ success: true, admin: safeAdmin(req.admin) }); }

export function adminLogout(req, res) { clearAdminCookie(res); res.json({ success: true }); }

export async function dashboard(req, res) {
  const [users, activeUsers, blockedUsers, bookings, upcomingBookings, completedBookings, cancelledBookings, paymentStats, revenueAgg, fullyPaidRevenueAgg, advancePayments, remainingPayments, activeTherapists, activeServices, extraRevenueAgg] = await Promise.all([
    User.countDocuments(), User.countDocuments({ isBlocked: false }), User.countDocuments({ isBlocked: true }), Booking.countDocuments(),
    Booking.countDocuments({ bookingStatus: { $in: ['confirmed', 'payment_pending'] }, date: { $gte: new Date() } }),
    Booking.countDocuments({ bookingStatus: 'completed' }), Booking.countDocuments({ bookingStatus: 'cancelled' }),
    Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: { $in: ['paid', 'partially_refunded'] } } }, { $group: { _id: null, amount: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundAmount', 0] }] } } } }]),
    Payment.aggregate([{ $match: { status: { $in: ['paid', 'partially_refunded'] } } }, { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'booking' } }, { $unwind: '$booking' }, { $match: { 'booking.remainingAmount': 0 } }, { $group: { _id: null, amount: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundAmount', 0] }] } } } }]),
    Payment.aggregate([{ $match: { paymentPurpose: 'INITIAL', status: { $in: ['paid', 'partially_refunded'] } } }, { $group: { _id: null, amount: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundAmount', 0] }] } }, count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { paymentPurpose: { $in: ['REMAINING', 'MANUAL'] }, status: { $in: ['paid', 'partially_refunded'] } } }, { $group: { _id: null, amount: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundAmount', 0] }] } }, count: { $sum: 1 } } }]),
    Therapist.countDocuments({ isActive: true }), Service.countDocuments({ isActive: true }),
    Booking.aggregate([
      { $match: { bookingStatus: { $in: ['confirmed', 'completed'] }, paidAmount: { $gt: 0 } } },
      { $project: { totalAmount: 1, paidAmount: 1, extraTotal: { $sum: { $map: { input: { $ifNull: ['$extraServices', []] }, as: 'extra', in: { $ifNull: ['$$extra.price', 0] } } } } } },
      { $project: { extraRevenue: { $multiply: ['$extraTotal', { $cond: [ { $gt: ['$totalAmount', 0] }, { $divide: ['$paidAmount', '$totalAmount'] }, 0 ] } ] } } },
      { $group: { _id: null, amount: { $sum: '$extraRevenue' } } },
    ]),
  ]);
  const paymentMap = Object.fromEntries(paymentStats.map((item) => [item._id, item]));
  const totalRevenue = Number(revenueAgg[0]?.amount || 0);
  res.json({ success: true, admin: safeAdmin(req.admin), stats: {
    totalUsers: users, activeUsers, blockedUsers, totalBookings: bookings, upcomingBookings, completedBookings, cancelledBookings,
    totalRevenue, successfulPayments: paymentMap.paid?.count || 0, pendingPayments: paymentMap.created?.count || 0,
    failedPayments: paymentMap.failed?.count || 0, refundedPayments: (paymentMap.refunded?.count || 0) + (paymentMap.partially_refunded?.count || 0),
    fullyPaidRevenue: Number(fullyPaidRevenueAgg[0]?.amount || 0), advancePayments: Number(advancePayments[0]?.amount || 0), advancePaymentCount: Number(advancePayments[0]?.count || 0),
    remainingPayments: Number(remainingPayments[0]?.amount || 0), remainingPaymentCount: Number(remainingPayments[0]?.count || 0),
    extraServiceRevenue: extraRevenueAgg[0]?.amount || 0, activeTherapists, activeServices,
    users, bookings, revenue: totalRevenue, therapists: activeTherapists, services: activeServices,
  } });
}

export async function listUsers(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const search = String(req.query.search || '').trim();
  const query = search ? { $or: [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] } : {};
  const [users, total] = await Promise.all([
    User.find(query).select('-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt -googleId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function userDetail(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user identifier.' });
  const user = await User.findById(req.params.id).select('-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt -googleId');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  const [bookings, payments] = await Promise.all([
    Booking.find({ user: user._id }).populate('service therapist').sort({ date: -1 }),
    Payment.find({ user: user._id }).populate({ path: 'booking', populate: { path: 'service', select: 'title' } }).sort({ createdAt: -1 }),
  ]);
  res.json({ success: true, user, bookings: bookings.map(publicBooking), payments });
}

export async function setUserBlocked(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user identifier.' });
  const blocked = req.body.blocked === true;
  const update = blocked
    ? { isBlocked: true, blockedAt: new Date(), blockedReason: String(req.body.reason || 'Blocked by Aviana administration').trim().slice(0, 300), $unset: { refreshTokenHash: 1 } }
    : { isBlocked: false, blockedAt: null, blockedReason: '' };
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt -googleId');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: user.isBlocked ? 'user_blocked' : 'user_unblocked', entityType: 'user', entityId: user._id, metadata: { reason: user.blockedReason }, ip: req.ip });
  res.json({ success: true, user });
}

export async function deleteUser(req, res) {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'user_deleted', entityType: 'user', entityId: user._id, ip: req.ip });
  res.json({ success: true });
}

export async function listBookings(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const query = {};
  if (req.query.status) {
    if (req.query.status === 'upcoming') {
      query.bookingStatus = { $in: ['confirmed', 'payment_pending'] };
      query.date = { $gte: new Date() };
    } else {
      query.bookingStatus = req.query.status;
    }
  }
  if (req.query.paymentStatus) {
    const map = { partial: ['PARTIAL', 'partially_refunded'], paid: ['PAID', 'paid'], failed: ['FAILED', 'failed'], pending: ['PENDING', 'pending'], refunded: ['REFUNDED', 'refunded', 'partially_refunded'] };
    query.paymentStatus = { $in: map[String(req.query.paymentStatus).toLowerCase()] || [String(req.query.paymentStatus).toUpperCase()] };
  }
  if (req.query.search) {
    const search = String(req.query.search).trim();
    const users = await User.find({ $or: [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id').limit(100);
    const therapists = await Therapist.find({ name: { $regex: search, $options: 'i' } }).select('_id').limit(100);
    const services = await Service.find({ title: { $regex: search, $options: 'i' } }).select('_id').limit(100);
    query.$or = [{ user: { $in: users.map((x) => x._id) } }, { therapist: { $in: therapists.map((x) => x._id) } }, { service: { $in: services.map((x) => x._id) } }];
  }
  if (req.query.from || req.query.to) query.date = { ...(req.query.from ? { $gte: new Date(`${req.query.from}T00:00:00.000Z`) } : {}), ...(req.query.to ? { $lte: new Date(`${req.query.to}T23:59:59.999Z`) } : {}) };
  const [items, total] = await Promise.all([
    Booking.find(query).populate('user service therapist').sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(query),
  ]);
  res.json({ success: true, bookings: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function updateBookingStatus(req, res) {
  const allowed = ['confirmed', 'completed', 'cancelled', 'no_show'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid booking status.' });
  const booking = await Booking.findById(req.params.id).populate('user service therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const paymentState = String(booking.paymentStatus || '').toUpperCase();
  if (!['PAID', 'PARTIAL'].includes(paymentState) && ['completed', 'no_show', 'confirmed'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'A booking must have a verified payment before it can be confirmed or completed.' });
  booking.bookingStatus = req.body.status;
  if (req.body.status === 'cancelled' && !booking.cancellation?.cancelledAt) booking.cancellation = { cancelledAt: new Date(), reason: 'Cancelled by admin' };
  await booking.save();
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'booking_status_updated', entityType: 'booking', entityId: booking._id, metadata: { status: req.body.status }, ip: req.ip });
  res.json({ success: true, booking: publicBooking(booking) });
}

export async function listPayments(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) {
    const search = String(req.query.search).trim();
    const [users, bookings] = await Promise.all([
      User.find({ $or: [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id').limit(100),
      Booking.find({ $or: [{ customerName: { $regex: search, $options: 'i' } }, { razorpayOrderId: { $regex: search, $options: 'i' } }, { razorpayPaymentId: { $regex: search, $options: 'i' } }] }).select('_id').limit(100),
    ]);
    query.$or = [{ orderId: { $regex: search, $options: 'i' } }, { razorpayOrderId: { $regex: search, $options: 'i' } }, { paymentId: { $regex: search, $options: 'i' } }, { razorpayPaymentId: { $regex: search, $options: 'i' } }, { user: { $in: users.map((x) => x._id) } }, { booking: { $in: bookings.map((x) => x._id) } }];
  }
  if (req.query.from || req.query.to) query.createdAt = { ...(req.query.from ? { $gte: new Date(`${req.query.from}T00:00:00.000Z`) } : {}), ...(req.query.to ? { $lte: new Date(`${req.query.to}T23:59:59.999Z`) } : {}) };
  const [payments, total] = await Promise.all([
    Payment.find(query).populate('user').populate({ path: 'booking', populate: [{ path: 'service', select: 'title' }, { path: 'therapist', select: 'name gender profileImage image' }] }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(query),
  ]);
  res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

function normalizeTherapist(body) {
  const payload = pickFields(body, therapistFields);
  if (payload.skills !== undefined) payload.skills = cleanSkills(payload.skills);
  if (payload.services !== undefined) payload.services = Array.isArray(payload.services) ? payload.services.filter((id) => mongoose.isValidObjectId(id)) : [];
  if (payload.experience !== undefined) payload.experience = Number(payload.experience);
  if (payload.rating !== undefined) payload.rating = Number(payload.rating);
  if (payload.workingDays !== undefined) payload.workingDays = payload.workingDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return payload;
}

export async function listTherapists(req, res) {
  const therapists = await Therapist.find().populate('services', 'title slug image').sort({ isActive: -1, name: 1 });
  res.json({ success: true, therapists: therapists.map(publicTherapist) });
}

export async function createTherapist(req, res) {
  const payload = normalizeTherapist(req.body);
  if (!payload.name || !payload.gender) return res.status(400).json({ success: false, message: 'Name and gender are required.' });
  const therapist = await Therapist.create(payload);
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'therapist_created', entityType: 'therapist', entityId: therapist._id, ip: req.ip });
  res.status(201).json({ success: true, therapist: publicTherapist(therapist) });
}

export async function updateTherapist(req, res) {
  const therapist = await Therapist.findByIdAndUpdate(req.params.id, normalizeTherapist(req.body), { new: true, runValidators: true }).populate('services', 'title slug image');
  if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'therapist_updated', entityType: 'therapist', entityId: therapist._id, ip: req.ip });
  res.json({ success: true, therapist: publicTherapist(therapist) });
}

export async function setTherapistActive(req, res) {
  const therapist = await Therapist.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true });
  if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: therapist.isActive ? 'therapist_activated' : 'therapist_disabled', entityType: 'therapist', entityId: therapist._id, ip: req.ip });
  res.json({ success: true, therapist: publicTherapist(therapist) });
}

export async function deleteTherapist(req, res) {
  const therapist = await Therapist.findById(req.params.id);
  if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
  const hasBookings = await Booking.exists({ therapist: therapist._id });
  if (hasBookings) return res.status(409).json({ success: false, message: 'This therapist has booking history. Deactivate the therapist instead of deleting the record.' });
  await therapist.deleteOne();
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'therapist_deleted', entityType: 'therapist', entityId: therapist._id, ip: req.ip });
  res.json({ success: true });
}

export async function uploadTherapistImage(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, WEBP or AVIF image up to 5MB.' });
  const stored = await storeImage(req.file, 'aviana/therapists');
  const therapist = await Therapist.findByIdAndUpdate(req.params.id, { profileImage: stored.url, image: stored.url }, { new: true });
  if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
  res.json({ success: true, therapist: publicTherapist(therapist) });
}

function normalizeService(body) {
  const payload = pickFields(body, serviceFields);
  for (const key of ['durationMinutes', 'spaPrice', 'homePrice']) if (payload[key] !== undefined) payload[key] = Number(payload[key]);
  if (payload.title && !payload.slug) payload.slug = payload.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return payload;
}
export async function listServices(req, res) { res.json({ success: true, services: (await Service.find().sort({ isActive: -1, category: 1, title: 1 })).map(publicService) }); }
export async function createService(req, res) { const service = await Service.create(normalizeService(req.body)); await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'service_created', entityType: 'service', entityId: service._id, ip: req.ip }); res.status(201).json({ success: true, service: publicService(service) }); }
export async function updateService(req, res) { const service = await Service.findByIdAndUpdate(req.params.id, normalizeService(req.body), { new: true, runValidators: true }); if (!service) return res.status(404).json({ success: false, message: 'Service not found.' }); await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'service_updated', entityType: 'service', entityId: service._id, ip: req.ip }); res.json({ success: true, service: publicService(service) }); }
export async function setServiceActive(req, res) { const service = await Service.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true }); if (!service) return res.status(404).json({ success: false, message: 'Service not found.' }); await logActivity({ actorType: 'admin', actorId: req.admin._id, action: service.isActive ? 'service_activated' : 'service_disabled', entityType: 'service', entityId: service._id, ip: req.ip }); res.json({ success: true, service: publicService(service) }); }
export async function deleteService(req, res) {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  const hasBookings = await Booking.exists({ service: service._id });
  if (hasBookings) return res.status(409).json({ success: false, message: 'This service has booking history. Deactivate the service instead of deleting the record.' });
  await service.deleteOne();
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'service_deleted', entityType: 'service', entityId: service._id, ip: req.ip });
  res.json({ success: true });
}
export async function uploadServiceImage(req, res) { if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, WEBP or AVIF image up to 5MB.' }); const stored = await storeImage(req.file, 'aviana/services'); const service = await Service.findByIdAndUpdate(req.params.id, { image: stored.url }, { new: true }); if (!service) return res.status(404).json({ success: false, message: 'Service not found.' }); res.json({ success: true, service: publicService(service) }); }

export async function activityLogs(req, res) { res.json({ success: true, logs: await ActivityLog.find().sort({ createdAt: -1 }).limit(250).populate('actorId', 'name email fullName') }); }
export async function getSettings(req, res) {
  const defaults = { spaAddress: 'Aviana Wellness, Jaipur', openingTime: '09:00', closingTime: '20:00', slotIntervalMinutes: 15, homeVisitFee: env.homeVisitFee, cancellationWindowHours: env.cancellationWindowHours, rescheduleWindowHours: 2, refundPercent: env.refundPercent, fullPaymentDiscountEnabled: false, fullPaymentDiscountPercent: 10, fullPaymentDiscountMaxAmount: null };
  let settings = await Setting.findOne({ key: 'global' });
  if (!settings) settings = await Setting.create({ key: 'global', ...defaults });
  else {
    const missing = Object.fromEntries(Object.entries(defaults).filter(([key]) => settings[key] === undefined));
    if (Object.keys(missing).length) { settings.set(missing); await settings.save(); }
  }
  res.json({ success: true, settings });
}
export async function updateSettings(req, res) {
  const allowed = ['spaAddress', 'openingTime', 'closingTime', 'slotIntervalMinutes', 'homeVisitFee', 'cancellationWindowHours', 'rescheduleWindowHours', 'refundPercent', 'phone', 'contactEmail', 'fullPaymentDiscountEnabled', 'fullPaymentDiscountPercent', 'fullPaymentDiscountMaxAmount'];
  const payload = pickFields(req.body, allowed);
  for (const key of ['slotIntervalMinutes', 'homeVisitFee', 'cancellationWindowHours', 'rescheduleWindowHours', 'refundPercent', 'fullPaymentDiscountPercent']) if (payload[key] !== undefined) payload[key] = Number(payload[key]);
  if (payload.fullPaymentDiscountMaxAmount !== undefined) payload.fullPaymentDiscountMaxAmount = payload.fullPaymentDiscountMaxAmount === '' || payload.fullPaymentDiscountMaxAmount === null ? null : Number(payload.fullPaymentDiscountMaxAmount);
  if (payload.fullPaymentDiscountEnabled !== undefined) payload.fullPaymentDiscountEnabled = Boolean(payload.fullPaymentDiscountEnabled);
  const settings = await Setting.findOneAndUpdate({ key: 'global' }, payload, { upsert: true, new: true, runValidators: true });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'settings_updated', entityType: 'setting', entityId: settings._id, ip: req.ip });
  res.json({ success: true, settings });
}

export async function refundPayment(req, res) {
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, provider: 'razorpay', status: { $in: ['paid', 'partially_refunded'] }, refundInProgress: false },
    { $set: { refundInProgress: true } }, { new: true },
  );
  if (!payment || !payment.paymentId || !razorpay) return res.status(400).json({ success: false, message: 'Refund cannot be created.' });
  const remaining = Number(payment.amount) - Number(payment.refundAmount || 0);
  const amount = Number(req.body.amount ?? remaining);
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) { await Payment.findByIdAndUpdate(payment._id, { $set: { refundInProgress: false } }); return res.status(400).json({ success: false, message: 'Invalid refund amount.' }); }
  try {
    const refund = await razorpay.payments.refund(payment.paymentId, { amount: Math.round(amount * 100) });
    const nextRefundAmount = Number(payment.refundAmount || 0) + amount;
    payment.refundId = refund.id;
    payment.refundAmount = nextRefundAmount;
    payment.status = nextRefundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.refundInProgress = false;
    await payment.save();
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      const paidPayments = await Payment.aggregate([{ $match: { booking: booking._id, status: { $in: ['paid', 'partially_refunded'] } } }, { $group: { _id: null, gross: { $sum: '$amount' }, refunded: { $sum: '$refundAmount' } } }]);
      const totals = paidPayments[0] || { gross: 0, refunded: 0 };
      booking.paidAmount = Math.max(0, Number(totals.gross || 0) - Number(totals.refunded || 0));
      booking.remainingAmount = Math.max(0, Number(booking.totalAmount ?? booking.price ?? 0) - booking.paidAmount);
      booking.paymentStatus = booking.paidAmount === 0 ? 'REFUNDED' : booking.remainingAmount === 0 ? 'PAID' : 'PARTIAL';
      await booking.save();
    }
    await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'payment_refunded', entityType: 'payment', entityId: payment._id, metadata: { amount, refundId: refund.id }, ip: req.ip });
    return res.json({ success: true, refund, payment });
  } catch (error) {
    await Payment.findByIdAndUpdate(payment._id, { $set: { refundInProgress: false } });
    throw error;
  }
}

export async function bookingDetail(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid booking identifier.' });
  const booking = await Booking.findById(req.params.id).populate('user', 'fullName email phone').populate('service').populate('therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: 1 });
  res.json({ success: true, booking: publicBooking(booking), customer: booking.user, payments });
}

export async function recordRemainingPayment(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid booking identifier.' });
  const booking = await Booking.findById(req.params.id).populate('user service therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['HALF', 'BOOKING'].includes(String(booking.paymentType || '').toUpperCase()) || booking.bookingStatus !== 'completed') return res.status(400).json({ success: false, message: 'This booking is not eligible for remaining-payment collection.' });
  const remaining = Number(booking.remainingAmount ?? Math.max(0, Number(booking.totalAmount ?? booking.price ?? 0) - Number(booking.paidAmount || 0)));
  if (remaining <= 0) return res.status(400).json({ success: false, message: 'There is no remaining balance to collect.' });
  const amount = Number(req.body.amount ?? remaining);
  if (!Number.isFinite(amount) || amount !== remaining) return res.status(400).json({ success: false, message: `Remaining payment must be exactly ₹${remaining.toLocaleString('en-IN')}.` });
  const method = String(req.body.method || 'Cash').trim().slice(0, 80);
  const reference = String(req.body.reference || '').trim().slice(0, 120);
  const paymentId = `OFFLINE-${Date.now()}-${cryptoRandomId()}`;
  const payment = await Payment.create({ booking: booking._id, user: booking.user._id, provider: 'offline', orderId: paymentId, paymentId, amount, currency: 'INR', status: 'paid', method, paymentPurpose: 'MANUAL', paymentType: String(booking.paymentType).toUpperCase(), meta: { reference, recordedBy: req.admin._id.toString() } });
  const updatedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, bookingStatus: 'completed', paymentType: { $in: ['BOOKING', 'HALF'] }, remainingAmount: remaining, paymentStatus: { $in: ['PARTIAL', 'partially_refunded'] } },
    { $inc: { paidAmount: amount }, $set: { remainingAmount: 0, paymentStatus: 'PAID' } },
    { new: true },
  ).populate('user service therapist');
  if (!updatedBooking) { await payment.deleteOne(); return res.status(409).json({ success: false, message: 'The remaining balance was already collected. Refresh the booking and try again.' }); }
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'remaining_payment_recorded', entityType: 'booking', entityId: updatedBooking._id, metadata: { amount, method, reference }, ip: req.ip });
  res.status(201).json({ success: true, booking: publicBooking(updatedBooking), payment });
}

function cryptoRandomId() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }

export async function listAvailabilityBlocks(req, res) { res.json({ success: true, blocks: await AvailabilityBlock.find({}).populate('therapist', 'name gender profileImage image').sort({ date: 1, startTime: 1 }) }); }
export async function createAvailabilityBlock(req, res) {
  const { date, therapist = null, startTime = '00:00', endTime = '23:59', reason = 'Unavailable' } = req.body;
  if (!date || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return res.status(400).json({ success: false, message: 'Date and valid times are required.' });
  if (startTime >= endTime) return res.status(400).json({ success: false, message: 'End time must be after start time.' });
  const blockDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(blockDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid date.' });
  if (therapist && !mongoose.isValidObjectId(therapist)) return res.status(400).json({ success: false, message: 'Invalid therapist.' });
  const block = await AvailabilityBlock.create({ date: blockDate, therapist: therapist || null, startTime, endTime, reason });
  await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'availability_block_created', entityType: 'availability_block', entityId: block._id, metadata: { date, therapist, startTime, endTime }, ip: req.ip });
  res.status(201).json({ success: true, block: await block.populate('therapist', 'name gender profileImage image') });
}
export async function deleteAvailabilityBlock(req, res) { const block = await AvailabilityBlock.findByIdAndDelete(req.params.id); if (!block) return res.status(404).json({ success: false, message: 'Availability block not found.' }); await logActivity({ actorType: 'admin', actorId: req.admin._id, action: 'availability_block_deleted', entityType: 'availability_block', entityId: block._id, ip: req.ip }); res.json({ success: true }); }
