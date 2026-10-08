import mongoose from 'mongoose';
import Therapist from '../models/Therapist.js';
import Booking from '../models/Booking.js';
import Setting from '../models/Setting.js';
import Service from '../models/Service.js';
import AvailabilityBlock from '../models/AvailabilityBlock.js';
import { fromMinutes, releaseExpiredBookings, toMinutes } from '../utils/availability.js';
import { getIndiaNow } from '../utils/indiaTime.js';
import { publicService, publicTherapist } from '../utils/serializers.js';

const activeBookingStatuses = ['payment_pending', 'confirmed', 'completed', 'no_show'];
const overlaps = (start, end, blockStart, blockEnd) => start < blockEnd && end > blockStart;

export async function getAvailability(req, res) {
  await releaseExpiredBookings();
  const { serviceId, date, therapistGender = 'any', bookingType = 'spa', therapistId } = req.query;
  if (!mongoose.isValidObjectId(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ success: false, message: 'serviceId and a valid date are required.' });
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  if (bookingType === 'home' && service.homeServiceAvailable === false) return res.status(400).json({ success: false, message: 'Home service is not available for this treatment.' });

  const settings = await Setting.findOne({ key: 'global' }) || {};
  const query = { isActive: true };
  if (therapistId) {
    if (!mongoose.isValidObjectId(therapistId)) return res.status(400).json({ success: false, message: 'Invalid therapist.' });
    query._id = therapistId;
    query.services = service._id;
  } else {
    query.$or = [{ services: service._id }, { services: { $size: 0 } }];
  }
  if (therapistGender !== 'any') query.gender = therapistGender;
  if (bookingType === 'home') query.offersHomeService = true;
  const therapists = await Therapist.find(query).sort({ rating: -1, name: 1 });
  const day = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = day.getUTCDay();
  const eligible = therapists.filter((t) => t.workingDays.includes(dayOfWeek));
  const eligibleIds = eligible.map((t) => t._id);
  if (!eligible.length) return res.json({ success: true, service: publicService(service), therapists: [], slots: [], homeVisitFee: settings.homeVisitFee || 500, spaAddress: settings.spaAddress || '' });

  const [bookings, blocks] = await Promise.all([
    Booking.find({ date: day, bookingStatus: { $in: activeBookingStatuses }, therapist: { $in: eligibleIds } }).select('therapist time durationMinutes'),
    AvailabilityBlock.find({ date: day, $or: [{ therapist: null }, { therapist: { $in: eligibleIds } }] }).select('therapist startTime endTime'),
  ]);
  const globalStart = toMinutes(settings.openingTime || '09:00');
  const globalEnd = toMinutes(settings.closingTime || '20:00');
  const interval = Number(settings.slotIntervalMinutes || 15);
  const now = getIndiaNow();
  const slots = [];
  for (let minute = globalStart; minute + service.durationMinutes <= globalEnd; minute += interval) {
    const endMinute = minute + service.durationMinutes;
    if (date === now.date && minute <= now.minutes) continue;
    const available = eligible.filter((therapist) => {
      if (minute < toMinutes(therapist.shiftStart) || endMinute > toMinutes(therapist.shiftEnd)) return false;
      if (blocks.some((block) => (!block.therapist || String(block.therapist) === String(therapist._id)) && overlaps(minute, endMinute, toMinutes(block.startTime), toMinutes(block.endTime)))) return false;
      return !bookings.some((booking) => String(booking.therapist) === String(therapist._id) && overlaps(minute, endMinute, toMinutes(booking.time), toMinutes(booking.time) + booking.durationMinutes));
    });
    if (available.length) slots.push({ time: fromMinutes(minute), therapistIds: available.map((t) => t._id) });
  }
  res.json({ success: true, service: publicService(service), therapists: eligible.map(publicTherapist), slots, homeVisitFee: settings.homeVisitFee || 500, spaAddress: settings.spaAddress || '' });
}
