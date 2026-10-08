import mongoose from 'mongoose';
import ExtraService from '../models/ExtraService.js';
import Booking from '../models/Booking.js';
import ActivityLog from '../models/ActivityLog.js';
import { publicExtraService } from '../utils/serializers.js';
import { storeImage } from '../utils/storage.js';

const normalize = (body, partial = false) => ({
  ...(body.name !== undefined || !partial ? { name: String(body.name || '').trim() } : {}),
  ...(body.description !== undefined || !partial ? { description: String(body.description || '').trim() } : {}),
  ...(body.price !== undefined || !partial ? { price: Number(body.price) } : {}),
  ...(body.image !== undefined ? { image: String(body.image || '') } : {}),
  ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
});

function validate(payload) {
  if (!payload.name || payload.name.length < 2) return 'Extra service name is required.';
  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Extra service price must be a valid non-negative amount.';
  return '';
}

export async function listPublicExtraServices(req, res) {
  const items = await ExtraService.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, extraServices: items.map(publicExtraService) });
}

export async function listAdminExtraServices(req, res) {
  const items = await ExtraService.find().sort({ isActive: -1, name: 1 });
  res.json({ success: true, extraServices: items.map(publicExtraService) });
}

export async function createExtraService(req, res) {
  const payload = normalize(req.body);
  const error = validate(payload);
  if (error) return res.status(400).json({ success: false, message: error });
  const item = await ExtraService.create(payload);
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'extra_service_created', entityType: 'extra_service', entityId: item._id, ip: req.ip });
  res.status(201).json({ success: true, extraService: publicExtraService(item) });
}

export async function updateExtraService(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid extra service identifier.' });
  const payload = normalize(req.body, true);
  if (Object.keys(payload).length === 0) return res.status(400).json({ success: false, message: 'Provide at least one field to update.' });
  if (payload.price !== undefined && (!Number.isFinite(payload.price) || payload.price < 0)) return res.status(400).json({ success: false, message: 'Extra service price must be a valid non-negative amount.' });
  if (payload.name !== undefined && (payload.name.length < 2 || payload.name.length > 100)) return res.status(400).json({ success: false, message: 'Extra service name must be between 2 and 100 characters.' });
  if (payload.description !== undefined && payload.description.length > 600) return res.status(400).json({ success: false, message: 'Extra service description is too long.' });
  const item = await ExtraService.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, message: 'Extra service not found.' });
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'extra_service_updated', entityType: 'extra_service', entityId: item._id, ip: req.ip });
  res.json({ success: true, extraService: publicExtraService(item) });
}

export async function setExtraServiceActive(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid extra service identifier.' });
  const item = await ExtraService.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Extra service not found.' });
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: item.isActive ? 'extra_service_activated' : 'extra_service_disabled', entityType: 'extra_service', entityId: item._id, ip: req.ip });
  res.json({ success: true, extraService: publicExtraService(item) });
}

export async function deleteExtraService(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid extra service identifier.' });
  const item = await ExtraService.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Extra service not found.' });
  const hasBookings = await Booking.exists({ 'extraServices.serviceId': item._id });
  if (hasBookings) return res.status(409).json({ success: false, message: 'This extra service is part of booking history. Deactivate it instead of deleting it.' });
  await item.deleteOne();
  await ActivityLog.create({ actorType: 'admin', actorId: req.admin._id, action: 'extra_service_deleted', entityType: 'extra_service', entityId: item._id, ip: req.ip });
  res.json({ success: true });
}

export async function uploadExtraServiceImage(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, WEBP or AVIF image up to 5MB.' });
  const stored = await storeImage(req.file, 'aviana/extra-services');
  const item = await ExtraService.findByIdAndUpdate(req.params.id, { image: stored.url }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Extra service not found.' });
  res.json({ success: true, extraService: publicExtraService(item) });
}
