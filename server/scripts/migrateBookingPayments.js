import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

const statusMap = { pending: 'PENDING', paid: 'PAID', failed: 'FAILED', refunded: 'REFUNDED', partially_refunded: 'REFUNDED', cancelled: 'CANCELLED' };

await mongoose.connect(env.mongoUri);
const payments = await Payment.find({});
const paidByBooking = new Map();
const initialByBooking = new Map();
for (const payment of payments) {
  const status = String(payment.status || '').toLowerCase();
  const net = ['paid', 'partially_refunded'].includes(status)
    ? Math.max(0, Number(payment.amount || 0) - Number(payment.refundAmount || 0))
    : 0;
  if (net) paidByBooking.set(String(payment.booking), (paidByBooking.get(String(payment.booking)) || 0) + net);
  if (payment.paymentPurpose === 'INITIAL' && Number(payment.amount || 0) > 0) {
    const current = initialByBooking.get(String(payment.booking)) || 0;
    initialByBooking.set(String(payment.booking), Math.max(current, Number(payment.amount || 0)));
  }

  const update = {};
  if (!payment.paymentPurpose) update.paymentPurpose = 'INITIAL';
  if (!payment.paymentType) update.paymentType = 'FULL';
  if (payment.paymentType === 'HALF') update.paymentType = 'BOOKING';
  if (Object.keys(update).length) await Payment.updateOne({ _id: payment._id }, { $set: update });
}

let updated = 0;
let convertedLegacyHalf = 0;
for await (const booking of Booking.find({})) {
  const total = Number(booking.totalAmount ?? booking.price ?? 0);
  const paid = Math.min(total, Math.max(0, Number(paidByBooking.get(String(booking._id)) ?? (String(booking.paymentStatus || '').toLowerCase() === 'paid' ? total : Number(booking.paidAmount || 0)))));
  const legacy = String(booking.paymentStatus || '').toLowerCase();
  const existingType = String(booking.paymentType || 'FULL').toUpperCase();
  const wasHalf = existingType === 'HALF';
  const nextType = wasHalf ? 'BOOKING' : existingType;
  const bookingAmount = wasHalf
    ? Math.min(total, Math.max(1, Number(initialByBooking.get(String(booking._id)) || Math.round(total / 2))))
    : Number(booking.bookingAmount || 0);
  const initialPaymentAmount = Number(booking.initialPaymentAmount || (nextType === 'BOOKING' ? bookingAmount : total));
  const nextStatus = paid >= total && total > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : (booking.bookingStatus === 'cancelled' ? 'CANCELLED' : statusMap[legacy] || 'PENDING');
  await Booking.updateOne({ _id: booking._id }, { $set: {
    extraServices: booking.extraServices || [],
    subtotal: Number(booking.subtotal ?? total),
    discountAmount: Number(booking.discountAmount || 0),
    discountPercentage: Number(booking.discountPercentage || 0),
    totalAmount: total,
    price: total,
    paidAmount: paid,
    remainingAmount: Math.max(0, total - paid),
    paymentType: nextType,
    initialPaymentAmount,
    bookingAmount,
    paymentStatus: nextStatus,
  }});
  if (wasHalf) convertedLegacyHalf += 1;
  updated += 1;
}
console.log(`Migrated ${updated} booking records and ${payments.length} payment records.`);
console.log(`Converted ${convertedLegacyHalf} legacy HALF bookings to BOOKING while preserving their original initial amount.`);
await mongoose.disconnect();
