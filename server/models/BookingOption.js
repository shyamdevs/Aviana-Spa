import mongoose from 'mongoose';

const bookingOptionSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'BOOKING', immutable: true },
  name: { type: String, required: true, trim: true, maxlength: 80, default: 'Booking Amount' },
  description: { type: String, default: 'Pay the fixed booking amount to reserve your appointment.', trim: true, maxlength: 300 },
  price: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export default mongoose.model('BookingOption', bookingOptionSchema);
