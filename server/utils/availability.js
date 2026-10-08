import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

export const toMinutes = (time) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
};

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
