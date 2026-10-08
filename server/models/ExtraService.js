import mongoose from 'mongoose';

const extraServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', trim: true, maxlength: 600 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

extraServiceSchema.index({ isActive: 1, name: 1 });

export default mongoose.model('ExtraService', extraServiceSchema);
