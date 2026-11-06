import mongoose from 'mongoose';
import BookingOption from '../models/BookingOption.js';
import Booking from '../models/Booking.js';
import ActivityLog from '../models/ActivityLog.js';

const normalize = (body = {}, partial = false) => ({
  ...(body.name !== undefined || !partial ? { name: String(body.name || 'Booking Amount').trim() } : {}),
  ...(body.description !== undefined || !partial ? { description: String(body.description || '').trim() } : {}),
  ...(body.price !== undefined || !partial ? { price: Number(body.price) } : {}),
  ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
});

function validate(payload) {
  if (!payload.name || payload.name.length < 2) return 'Booking option name is required.';
  if (!Number.isFinite(payload.price) || payload.price < 1) return 'Booking amount must be at least ₹1.';
  return '';
}

export async function getPublicBookingOption(req, res) {
  const option = await BookingOption.findOne({ key: 'BOOKING', isActive: true });
  res.json({ success: true, bookingOption: option ? {
    _id: option._id,
    key: option.key,
    name: option.name,
    description: option.description,
    price: Number(option.price),
    isActive: true,
  } : null });
}

export async function getAdminBookingOption(req, res) {
  const option = await BookingOption.findOne({ key: 'BOOKING' });
  res.json({ success: true, bookingOption: option || null });
}

export async function createBookingOption(req, res) {
  const payload = normalize(req.body);
  const error = validate(payload);
  if (error) return res.status(400).json({ success: false, message: error });

  const existing = await BookingOption.findOne({ key: 'BOOKING' });
  if (existing) return res.status(409).json({ success: false, message: 'A Booking payment option already exists. Edit the existing option instead.' });

  const option = await BookingOption.create({ key: 'BOOKING', ...payload });
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'booking_option_created', entityType: 'booking_option', entityId: option._id, ip: req.ip });
  res.status(201).json({ success: true, bookingOption: option });
}

export async function updateBookingOption(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid booking option identifier.' });
  const payload = normalize(req.body, true);
  if (Object.keys(payload).length === 0) return res.status(400).json({ success: false, message: 'Provide at least one field to update.' });
  const error = validate({
    name: payload.name ?? 'Booking Amount',
    price: payload.price ?? 1,
  });
  if (error && (payload.name !== undefined || payload.price !== undefined)) return res.status(400).json({ success: false, message: error });

  const option = await BookingOption.findOneAndUpdate({ _id: req.params.id, key: 'BOOKING' }, payload, { new: true, runValidators: true });
  if (!option) return res.status(404).json({ success: false, message: 'Booking option not found.' });
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'booking_option_updated', entityType: 'booking_option', entityId: option._id, ip: req.ip });
  res.json({ success: true, bookingOption: option });
}

export async function setBookingOptionActive(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid booking option identifier.' });
  const option = await BookingOption.findOneAndUpdate({ _id: req.params.id, key: 'BOOKING' }, { isActive: Boolean(req.body.isActive) }, { new: true, runValidators: true });
  if (!option) return res.status(404).json({ success: false, message: 'Booking option not found.' });
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: option.isActive ? 'booking_option_activated' : 'booking_option_disabled', entityType: 'booking_option', entityId: option._id, ip: req.ip });
  res.json({ success: true, bookingOption: option });
}

export async function deleteBookingOption(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid booking option identifier.' });
  const option = await BookingOption.findOne({ _id: req.params.id, key: 'BOOKING' });
  if (!option) return res.status(404).json({ success: false, message: 'Booking option not found.' });

  const historicalBooking = await Booking.exists({ paymentType: 'BOOKING' });
  if (historicalBooking) {
    return res.status(409).json({ success: false, message: 'This booking amount is referenced by booking history. Disable it instead of deleting it.' });
  }

  await option.deleteOne();
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'booking_option_deleted', entityType: 'booking_option', entityId: option._id, ip: req.ip });
  res.json({ success: true });
}
