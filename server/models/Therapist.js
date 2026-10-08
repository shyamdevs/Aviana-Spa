import mongoose from 'mongoose';

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
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
  shiftStart: { type: String, default: '09:00' },
  shiftEnd: { type: String, default: '20:00' },
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

export default mongoose.model('Therapist', therapistSchema);
