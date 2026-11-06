import mongoose from 'mongoose';
import ExtraService from '../models/ExtraService.js';
import BookingOption from '../models/BookingOption.js';

// HALF is kept only for legacy bookings already stored in the database. New bookings can only use FULL or BOOKING.
export const PAYMENT_TYPES = Object.freeze({ FULL: 'FULL', BOOKING: 'BOOKING', HALF: 'HALF' });
export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
});

export const roundMoney = (value) => Math.round(Number(value || 0));

export function normalizePaymentType(value) {
  const normalized = String(value || '').toUpperCase();
  if (!['FULL', 'BOOKING'].includes(normalized)) {
    const error = new Error('Choose a valid payment option.');
    error.status = 400;
    throw error;
  }
  return normalized;
}

export async function resolveExtraServices(extraServiceIds = []) {
  if (!Array.isArray(extraServiceIds)) {
    const error = new Error('Extra services must be provided as a list.');
    error.status = 400;
    throw error;
  }

  const uniqueIds = [...new Set(extraServiceIds.map(String).filter(Boolean))];
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    const error = new Error('One or more extra services are invalid.');
    error.status = 400;
    throw error;
  }

  if (!uniqueIds.length) return [];

  const extras = await ExtraService.find({ _id: { $in: uniqueIds }, isActive: true }).select('_id name description price image');
  const found = new Set(extras.map((extra) => String(extra._id)));
  if (found.size !== uniqueIds.length) {
    const error = new Error('One or more selected extra services are no longer available.');
    error.status = 409;
    throw error;
  }

  return uniqueIds.map((id) => extras.find((extra) => String(extra._id) === id));
}

export async function getActiveBookingOption() {
  return BookingOption.findOne({ key: 'BOOKING', isActive: true }).lean();
}

export function calculateBookingAmounts({ baseServiceAmount, extraServices = [], paymentType, settings = {}, bookingOption = null }) {
  const type = normalizePaymentType(paymentType);
  const base = roundMoney(baseServiceAmount);
  const extrasTotal = roundMoney(extraServices.reduce((sum, extra) => sum + Number(extra.price || 0), 0));
  const subtotal = roundMoney(base + extrasTotal);

  let discountPercentage = 0;
  let discountAmount = 0;
  if (type === PAYMENT_TYPES.FULL && settings.fullPaymentDiscountEnabled) {
    discountPercentage = Math.max(0, Math.min(100, Number(settings.fullPaymentDiscountPercent || 0)));
    discountAmount = roundMoney(subtotal * discountPercentage / 100);
    if (Number.isFinite(Number(settings.fullPaymentDiscountMaxAmount)) && Number(settings.fullPaymentDiscountMaxAmount) > 0) {
      discountAmount = Math.min(discountAmount, roundMoney(settings.fullPaymentDiscountMaxAmount));
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount);
  let initialAmount = totalAmount;
  if (type === PAYMENT_TYPES.BOOKING) {
    const fixedBookingAmount = roundMoney(bookingOption?.price);
    if (!fixedBookingAmount) {
      const error = new Error('The Booking payment option is not configured. Please contact Aviana support.');
      error.status = 503;
      throw error;
    }
    if (fixedBookingAmount > totalAmount) {
      const error = new Error(`The configured booking amount of ₹${fixedBookingAmount.toLocaleString('en-IN')} is higher than this appointment total of ₹${totalAmount.toLocaleString('en-IN')}. Please contact Aviana support.`);
      error.status = 409;
      throw error;
    }
    initialAmount = fixedBookingAmount;
  }
  const remainingAmount = Math.max(0, totalAmount - initialAmount);

  return {
    baseServiceAmount: base, extrasTotal, subtotal, discountPercentage, discountAmount, totalAmount,
    initialAmount, remainingAmount, bookingAmount: type === PAYMENT_TYPES.BOOKING ? initialAmount : 0,
    bookingOption: bookingOption ? { _id: bookingOption._id, name: bookingOption.name, description: bookingOption.description, price: roundMoney(bookingOption.price) } : null,
    paymentType: type,
  };
}

export function legacyBookingAmounts(booking) {
  const totalAmount = roundMoney(booking.totalAmount ?? booking.price ?? 0);
  const status = String(booking.paymentStatus || '').toUpperCase();
  const paidAmount = booking.paidAmount != null
    ? roundMoney(booking.paidAmount)
    : (status === 'PAID' ? totalAmount : 0);
  const remainingAmount = booking.remainingAmount != null
    ? roundMoney(booking.remainingAmount)
    : Math.max(0, totalAmount - paidAmount);
  return { subtotal: roundMoney(booking.subtotal ?? booking.price ?? 0), discountAmount: roundMoney(booking.discountAmount ?? 0), discountPercentage: Number(booking.discountPercentage ?? 0), totalAmount, paidAmount, remainingAmount };
}
