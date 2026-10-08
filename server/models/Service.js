import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, maxlength: 1200 },
  durationMinutes: { type: Number, required: true, min: 15, max: 360 },
  spaPrice: { type: Number, required: true, min: 0 },
  homePrice: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  homeServiceAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);
