import mongoose from 'mongoose';
import { attachCatalogInvalidation } from '../utils/catalogEvents.js';

const therapistSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  gender: { type: String, enum: ['male', 'female'], required: true, index: true },
  profileImage: { type: String, default: '' },
  image: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 1200 },
  experience: { type: Number, default: 3, min: 0, max: 50 },
  specialization: { type: String, default: '', maxlength: 160 },
  rating: { type: Number, default: 4.8, min: 0, max: 5 },
  phone: { type: String, select: false },
  skills: { type: [String], default: [] },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  isActive: { type: Boolean, default: true, index: true },
  offersHomeService: { type: Boolean, default: true },
  workingDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  shiftStart: { type: String, default: '00:00' },
  shiftEnd: { type: String, default: '24:00' },
}, { timestamps: true });

therapistSchema.virtual('availability').get(function availability() {
  return {
    workingDays: this.workingDays,
    shiftStart: this.shiftStart,
    shiftEnd: this.shiftEnd,
  };
});

therapistSchema.set('toJSON', { virtuals: true });
therapistSchema.set('toObject', { virtuals: true });

// Keeps the Aviana Care catalogue cache fresh after any write to this collection.
attachCatalogInvalidation(therapistSchema);

export default mongoose.model('Therapist', therapistSchema);
