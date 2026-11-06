import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

// Aviana is open 24 hours, every day, unless an admin narrows the hours in Settings.
export const DEFAULT_OPENING = '00:00';
export const DEFAULT_CLOSING = '24:00';
export const DEFAULT_SHIFT_START = '00:00';
export const DEFAULT_SHIFT_END = '24:00';
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * "HH:MM" -> minutes since midnight. "24:00" (end of day) is accepted so a window can run
 * until midnight; it is only meaningful as a closing time / shift end, never as a start time.
 */
export const toMinutes = (time) => {
  const value = String(time || '');
  if (value === '24:00') return 24 * 60;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** Throws a 400 error unless start < end and both are valid times ("24:00" allowed only as the end). */
export function assertValidWindow(start, end, label = 'Hours') {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (Number.isNaN(from) || Number.isNaN(to) || start === '24:00' || from >= to) {
    const error = new Error(`${label} must use HH:MM times, and the end must be after the start (use 24:00 for midnight).`);
    error.status = 400;
    throw error;
  }
}

export const fromMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export async function releaseExpiredBookings() {
  const expired = await Booking.find({ bookingStatus: 'payment_pending', createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } }).select('_id paidAmount');
  if (!expired.length) return;
  const bookingIds = expired.map((booking) => booking._id);
  await Booking.updateMany(
    { _id: { $in: bookingIds }, bookingStatus: 'payment_pending' },
    { $set: { bookingStatus: 'cancelled', cancellation: { cancelledAt: new Date(), reason: 'Payment session expired' }, paymentStatus: 'CANCELLED' } }
  );
  await Payment.updateMany({ booking: { $in: bookingIds }, status: 'created' }, { $set: { status: 'failed', 'meta.failureReason': 'Payment session expired' } });
}
