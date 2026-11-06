import mongoose from 'mongoose';
import { attachCatalogInvalidation } from '../utils/catalogEvents.js';

const extraServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', trim: true, maxlength: 600 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

extraServiceSchema.index({ isActive: 1, name: 1 });

// Keeps the Aviana Care catalogue cache fresh after any write to this collection.
attachCatalogInvalidation(extraServiceSchema);

export default mongoose.model('ExtraService', extraServiceSchema);
