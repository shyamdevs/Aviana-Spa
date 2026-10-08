import crypto from 'node:crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Setting from '../models/Setting.js';
import BookingOption from '../models/BookingOption.js';
import { razorpay, verifyPaymentSignature } from '../utils/razorpay.js';
import { logActivity } from '../utils/activity.js';
import { sendEmail, bookingConfirmationHtml } from '../utils/email.js';
import { env } from '../config/env.js';
import { publicBooking } from '../utils/serializers.js';
import { legacyBookingAmounts, PAYMENT_STATUSES, PAYMENT_TYPES, roundMoney } from '../utils/bookingPricing.js';

function paymentAmountForInitial(booking) {
  const { totalAmount, remainingAmount } = legacyBookingAmounts(booking);
  const type = String(booking.paymentType || 'FULL').toUpperCase();
  if (type === PAYMENT_TYPES.HALF) return roundMoney(totalAmount / 2);
  if (type === PAYMENT_TYPES.BOOKING) {
    const fixedAmount = Number(booking.initialPaymentAmount ?? (totalAmount - remainingAmount));
    return roundMoney(fixedAmount);
  }
  return totalAmount;
}


async function createOrderForPayment({ booking, userId, paymentPurpose, amount, paymentType, checkoutKey, description }) {
  if (!razorpay || !env.razorpayKeyId) {
    const error = new Error('Razorpay is not configured on the server.');
    error.status = 503;
    throw error;
  }

  let existing = await Payment.findOne({ booking: booking._id, user: userId, paymentPurpose, status: 'created' }).sort({ createdAt: -1 });
  if (existing && String(existing.orderId).startsWith('pending_') && existing.createdAt) {
    const ageMs = Date.now() - new Date(existing.createdAt).getTime();
    if (ageMs > 60_000) {
      existing.status = 'failed';
      existing.failureReason = 'Checkout initialization expired';
      existing.meta = { ...(existing.meta || {}), orderState: 'expired' };
      await existing.save();
      existing = null;
    }
  }
  if (existing) {
    if (String(existing.orderId).startsWith('pending_')) {
      return { initializing: true };
    }
    return { payment: existing, order: { id: existing.orderId, amount: roundMoney(existing.amount * 100), currency: existing.currency }, keyId: env.razorpayKeyId, reused: true };
  }

  let payment;
  const placeholderOrderId = `pending_${crypto.randomUUID()}`;
  try {
    payment = await Payment.create({
      booking: booking._id,
      user: userId,
      provider: 'razorpay',
      orderId: placeholderOrderId,
      amount: roundMoney(amount),
      currency: 'INR',
      status: 'created',
      paymentPurpose,
      paymentType,
      method: '',
      meta: { checkoutKey: checkoutKey || '', orderState: 'initializing' },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existingPayment = await Payment.findOne({ booking: booking._id, user: userId, paymentPurpose, status: 'created' }).sort({ createdAt: -1 });
      if (existingPayment) {
        if (String(existingPayment.orderId).startsWith('pending_')) return { initializing: true };
        return { payment: existingPayment, order: { id: existingPayment.orderId, amount: roundMoney(existingPayment.amount * 100), currency: existingPayment.currency }, keyId: env.razorpayKeyId, reused: true };
      }
    }
    throw error;
  }

  try {
    const order = await razorpay.orders.create({ amount: Math.round(Number(amount) * 100), currency: 'INR', receipt: `aviana_${booking._id}_${paymentPurpose.toLowerCase()}`.slice(0, 40), notes: { bookingId: booking._id.toString(), paymentPurpose, paymentType, description: String(description || booking.service?.title || 'Aviana booking').slice(0, 200) } });
    payment.orderId = order.id;
    payment.razorpayOrderId = order.id;
    payment.meta = { ...(payment.meta || {}), orderState: 'ready', checkoutKey: checkoutKey || '' };
    await payment.save();
    if (paymentPurpose === 'INITIAL' && !booking.razorpayOrderId) {
      booking.razorpayOrderId = order.id;
      await booking.save();
    }
    return { payment, order, keyId: env.razorpayKeyId };
  } catch (error) {
    payment.status = 'failed';
    payment.meta = { ...(payment.meta || {}), orderState: 'failed', error: error.message };
    await payment.save();
    throw error;
  }
}

export async function paymentOptions(req, res) {
  const settings = await Setting.findOne({ key: 'global' }) || {};
  const bookingOption = await BookingOption.findOne({ key: 'BOOKING', isActive: true }).lean();
  res.json({ success: true, paymentOptions: {
    fullPaymentDiscountEnabled: Boolean(settings.fullPaymentDiscountEnabled),
    fullPaymentDiscountPercent: Number(settings.fullPaymentDiscountPercent || 0),
    fullPaymentDiscountMaxAmount: settings.fullPaymentDiscountMaxAmount == null ? null : Number(settings.fullPaymentDiscountMaxAmount),
    bookingOption: bookingOption ? { _id: bookingOption._id, name: bookingOption.name, description: bookingOption.description, price: Number(bookingOption.price) } : null,
  } });
}

export async function createOrder(req, res) {
  const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user._id }).populate('service therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['payment_pending'].includes(booking.bookingStatus)) return res.status(400).json({ success: false, message: 'This booking is not awaiting its initial payment.' });
  if (!['PENDING', 'FAILED', 'pending', 'failed'].includes(String(booking.paymentStatus))) return res.status(400).json({ success: false, message: 'This booking is no longer awaiting its initial payment.' });
  const amount = paymentAmountForInitial(booking);
  const result = await createOrderForPayment({ booking, userId: req.user._id, paymentPurpose: 'INITIAL', amount, paymentType: String(booking.paymentType || 'FULL').toUpperCase(), checkoutKey: `INITIAL:${booking._id}`, description: booking.service?.title });
  if (result.initializing) return res.status(409).json({ success: false, message: 'Payment order is being initialized. Please retry in a moment.' });
  res.status(result.reused ? 200 : 201).json({ success: true, order: { id: result.order.id, amount: result.order.amount, currency: result.order.currency }, keyId: result.keyId, paymentId: result.payment._id });
}

export async function createRemainingOrder(req, res) {
  const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user._id }).populate('service therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['HALF', PAYMENT_TYPES.BOOKING].includes(String(booking.paymentType || '').toUpperCase())) return res.status(400).json({ success: false, message: 'This booking does not have a remaining balance.' });
  if (booking.bookingStatus !== 'completed') return res.status(400).json({ success: false, message: 'The remaining balance becomes payable after the service is completed.' });
  const { remainingAmount } = legacyBookingAmounts(booking);
  if (remainingAmount <= 0) return res.status(400).json({ success: false, message: 'There is no remaining balance to pay.' });
  const result = await createOrderForPayment({ booking, userId: req.user._id, paymentPurpose: 'REMAINING', amount: remainingAmount, paymentType: String(booking.paymentType).toUpperCase(), checkoutKey: `REMAINING:${booking._id}`, description: `Remaining balance for ${booking.service?.title || 'Aviana booking'}` });
  if (result.initializing) return res.status(409).json({ success: false, message: 'Payment order is being initialized. Please retry in a moment.' });
  res.status(result.reused ? 200 : 201).json({ success: true, order: { id: result.order.id, amount: result.order.amount, currency: result.order.currency }, keyId: result.keyId, paymentId: result.payment._id });
}

async function applyCapturedPayment(payment, booking, gatewayPayment) {
  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ['created', 'failed'] } },
    { $set: { status: 'paid', paymentId: gatewayPayment.id, razorpayPaymentId: gatewayPayment.id, razorpayOrderId: gatewayPayment.order_id, method: gatewayPayment.method || '', meta: { ...(payment.meta || {}), email: gatewayPayment.email, contact: gatewayPayment.contact, capturedAt: new Date() } } },
    { new: true },
  );
  if (!updatedPayment) return { duplicate: true, booking };

  const expected = legacyBookingAmounts(booking);
  const paid = Math.min(expected.totalAmount, roundMoney((booking.paidAmount || 0) + Number(payment.amount || 0)));
  booking.paidAmount = paid;
  booking.totalAmount = expected.totalAmount;
  booking.price = expected.totalAmount;
  booking.remainingAmount = Math.max(0, expected.totalAmount - paid);
  booking.paymentStatus = booking.remainingAmount === 0 ? PAYMENT_STATUSES.PAID : PAYMENT_STATUSES.PARTIAL;
  if (updatedPayment.paymentPurpose === 'INITIAL' && booking.bookingStatus === 'payment_pending') booking.bookingStatus = 'confirmed';
  if (updatedPayment.paymentPurpose === 'INITIAL') booking.razorpayOrderId = gatewayPayment.order_id;
  booking.razorpayPaymentId = gatewayPayment.id;
  await booking.save();
  return { duplicate: false, booking, payment: updatedPayment };
}

async function captureAndVerifyPayment(paymentId, orderId, expectedAmountPaise) {
  let latest;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    latest = await razorpay.payments.fetch(paymentId);
    if (latest.order_id !== orderId || Number(latest.amount) !== expectedAmountPaise || latest.currency !== 'INR') {
      const error = new Error('Payment amount or order could not be verified.');
      error.status = 400;
      throw error;
    }

    if (latest.status === 'captured') return latest;

    if (latest.status === 'authorized') {
      try {
        const captured = await razorpay.payments.capture(paymentId, expectedAmountPaise, 'INR');
        if (captured?.status === 'captured') return captured;
        latest = captured || latest;
      } catch (error) {
        // Another capture process (for example auto-capture) may have won the race.
        latest = await razorpay.payments.fetch(paymentId);
        if (latest.status === 'captured') return latest;
        if (attempt === 4) {
          const captureError = new Error('Payment was authorised but could not be captured yet. Please check the payment status before retrying.');
          captureError.status = 409;
          captureError.cause = error;
          throw captureError;
        }
      }
    }

    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const error = new Error(latest?.status === 'failed' ? 'Razorpay marked this payment as failed. Please retry payment.' : 'Payment is still being processed. Please wait a moment and check your booking status before retrying.');
  error.status = latest?.status === 'failed' ? 400 : 409;
  throw error;
}

export async function verifyPayment(req, res) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (!orderId || !paymentId || !signature) return res.status(400).json({ success: false, message: 'Payment verification details are incomplete.' });
  if (!razorpay) return res.status(503).json({ success: false, message: 'Payment service is not configured on the server. Add the Razorpay server keys and retry.' });

  const payment = await Payment.findOne({ orderId, user: req.user._id });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment order was not found for your account.' });
  const trustedOrderId = payment.orderId;
  if (orderId !== trustedOrderId || !verifyPaymentSignature(trustedOrderId, paymentId, signature)) return res.status(400).json({ success: false, message: 'Payment verification failed.' });

  const booking = await Booking.findOne({ _id: payment.booking, user: req.user._id }).populate('service therapist');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking for this payment was not found.' });
  if (payment.status === 'paid') return res.json({ success: true, booking: publicBooking(booking), payment });

  const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
  const gatewayPayment = await captureAndVerifyPayment(paymentId, trustedOrderId, expectedAmountPaise);
  const result = await applyCapturedPayment(payment, booking, gatewayPayment);
  if (!result.duplicate) {
    await logActivity({ actorType: 'user', actorId: req.user._id, action: payment.paymentPurpose === 'REMAINING' ? 'remaining_payment_verified' : 'payment_verified', entityType: 'booking', entityId: booking._id, metadata: { paymentId, orderId, amount: payment.amount, paymentPurpose: payment.paymentPurpose }, ip: req.ip });
    try {
      if (payment.paymentPurpose === 'INITIAL') {
        await sendEmail({ to: booking.customerEmail, subject: 'Your Aviana booking is confirmed', html: bookingConfirmationHtml(booking), text: `Booking confirmed for ${booking.date} at ${booking.time}.` });
      } else {
        await sendEmail({ to: booking.customerEmail, subject: 'Aviana remaining balance received', html: bookingConfirmationHtml(booking), text: `Your remaining Aviana balance has been received. Thank you.` });
      }
    } catch (error) { console.error('Payment email failed', error.message); }
  }
  res.json({ success: true, booking: publicBooking(result.booking), payment: result.payment || payment });
}

export async function paymentFailed(req, res) {
  const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const purpose = String(req.body.paymentPurpose || 'INITIAL').toUpperCase() === 'REMAINING' ? 'REMAINING' : 'INITIAL';
  await Payment.updateMany({ booking: booking._id, user: req.user._id, paymentPurpose: purpose, status: 'created' }, { $set: { status: 'failed', 'meta.failureReason': 'Checkout dismissed or payment.failed event' } });
  if (purpose === 'INITIAL' && booking.bookingStatus === 'payment_pending' && Number(booking.paidAmount || 0) === 0) booking.paymentStatus = PAYMENT_STATUSES.FAILED;
  await booking.save();
  res.json({ success: true });
}

export async function paymentHistory(req, res) {
  const payments = await Payment.find({ user: req.user._id })
    .populate({ path: 'booking', select: 'date time bookingType bookingStatus service therapist totalAmount paidAmount remainingAmount paymentType paymentStatus extraServices subtotal discountAmount', populate: [{ path: 'service', select: 'title image' }, { path: 'therapist', select: 'name gender profileImage image' }] })
    .sort({ createdAt: -1 });
  res.json({ success: true, payments });
}

export async function webhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  if (!env.razorpayWebhookSecret || !signature || !Buffer.isBuffer(req.body)) return res.status(400).json({ success: false, message: 'Invalid webhook request.' });
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(req.body).digest('hex');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ success: false, message: 'Invalid webhook body.' }); }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  if (!orderId) return res.json({ success: true });
  const payment = await Payment.findOne({ orderId });
  const booking = payment ? await Booking.findById(payment.booking).populate('service therapist') : null;
  if (!payment || !booking) return res.json({ success: true });
  if (payment.lastWebhookEvent === event.id) return res.json({ success: true });

  payment.lastWebhookEvent = event.id;
  await payment.save();

  if (['payment.captured', 'order.paid'].includes(event.event) || entity.status === 'captured') {
    if (Number(entity.amount) !== Math.round(Number(payment.amount) * 100) || payment.status === 'paid') return res.json({ success: true });
    const result = await applyCapturedPayment(payment, booking, entity);
    if (!result.duplicate && payment.paymentPurpose === 'INITIAL') {
      try { await sendEmail({ to: booking.customerEmail, subject: 'Your Aviana booking is confirmed', html: bookingConfirmationHtml(booking), text: `Booking confirmed for ${booking.date} at ${booking.time}.` }); } catch (error) { console.error('Webhook confirmation email failed', error.message); }
    }
  } else if (event.event === 'payment.authorized' || entity.status === 'authorized') {
    try {
      const captured = await captureAndVerifyPayment(entity.id, payment.orderId, Math.round(Number(payment.amount) * 100));
      if (payment.status !== 'paid') {
        const result = await applyCapturedPayment(payment, booking, captured);
        if (!result.duplicate && payment.paymentPurpose === 'INITIAL') {
          try { await sendEmail({ to: booking.customerEmail, subject: 'Your Aviana booking is confirmed', html: bookingConfirmationHtml(booking), text: `Booking confirmed for ${booking.date} at ${booking.time}.` }); } catch (error) { console.error('Webhook confirmation email failed', error.message); }
        }
      }
    } catch (error) {
      payment.meta = { ...(payment.meta || {}), gatewayStatus: 'authorized', captureError: error.message };
      await payment.save();
    }
  } else if (event.event === 'payment.failed') {
    if (payment.status === 'paid') return res.json({ success: true });
    payment.status = 'failed';
    await payment.save();
    if (payment.paymentPurpose === 'INITIAL' && booking.bookingStatus === 'payment_pending' && Number(booking.paidAmount || 0) === 0) { booking.paymentStatus = PAYMENT_STATUSES.FAILED; await booking.save(); }
  }
  res.json({ success: true });
}
