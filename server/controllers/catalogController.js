import mongoose from 'mongoose';
import Service from '../models/Service.js';
import Therapist from '../models/Therapist.js';
import { publicService, publicTherapist } from '../utils/serializers.js';

export async function listServices(req, res) {
  const query = { isActive: true };
  if (req.query.therapistId) {
    if (!mongoose.isValidObjectId(req.query.therapistId)) {
      return res.status(400).json({ success: false, message: 'Invalid therapist identifier.' });
    }
    const therapist = await Therapist.findOne({ _id: req.query.therapistId, isActive: true }).select('services');
    if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
    query._id = { $in: therapist.services || [] };
  }
  const services = await Service.find(query).sort({ category: 1, title: 1 });
  res.json({ success: true, services: services.map(publicService) });
}

export async function getService(req, res) {
  const selector = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { slug: String(req.params.id).toLowerCase() };
  const service = await Service.findOne({ ...selector, isActive: true });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  const therapists = await Therapist.find({ isActive: true, services: service._id }).sort({ name: 1 });
  res.json({ success: true, service: publicService(service), therapists: therapists.map(publicTherapist) });
}

export async function listTherapists(req, res) {
  const query = { isActive: true };
  if (req.query.gender && req.query.gender !== 'any') query.gender = req.query.gender;
  if (req.query.bookingType === 'home') query.offersHomeService = true;
  if (req.query.serviceId && mongoose.isValidObjectId(req.query.serviceId)) query.services = req.query.serviceId;
  const therapists = await Therapist.find(query).populate('services', 'title slug image durationMinutes').sort({ name: 1 });
  res.json({ success: true, therapists: therapists.map(publicTherapist) });
}

export async function getTherapist(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid therapist identifier.' });
  const therapist = await Therapist.findOne({ _id: req.params.id, isActive: true }).populate('services', 'title slug description durationMinutes image spaPrice homePrice');
  if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });
  res.json({ success: true, therapist: publicTherapist(therapist) });
}
