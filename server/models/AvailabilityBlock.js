import mongoose from 'mongoose';

const availabilityBlockSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null, index: true },
  startTime: { type: String, default: '00:00' },
  endTime: { type: String, default: '23:59' },
  reason: { type: String, trim: true, maxlength: 200, default: 'Unavailable' }
}, { timestamps: true });

availabilityBlockSchema.index({ date: 1, therapist: 1, startTime: 1, endTime: 1 });

export default mongoose.model('AvailabilityBlock', availabilityBlockSchema);
