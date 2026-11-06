import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  therapistGender: { type: String, enum: ['male', 'female'], required: true },
  bookingType: { type: String, enum: ['spa', 'home'], required: true },
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  slotKeys: { type: [String], default: [] },
  spaAddress: { type: String, default: '' },
  homeAddress: { type: String, default: '' },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true, lowercase: true },
  customerPhone: { type: String, required: true },
  notes: { type: String, maxlength: 1000, default: '' },
  extraServices: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtraService' },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  }],
  subtotal: { type: Number, required: true, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  totalAmount: { type: Number, required: true, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentType: { type: String, enum: ['FULL', 'BOOKING', 'HALF'], required: true, default: 'FULL' },
  initialPaymentAmount: { type: Number, default: 0, min: 0 },
  bookingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'], default: 'PENDING', index: true },
  bookingStatus: { type: String, enum: ['payment_pending', 'confirmed', 'completed', 'cancelled', 'no_show'], default: 'payment_pending', index: true },
  razorpayPaymentId: String,
  razorpayOrderId: String,
  cancellation: {
    cancelledAt: Date,
    reason: String,
    refundId: String,
    refundAmount: Number
  },
  rescheduleHistory: [{
    fromDate: Date,
    fromTime: String,
    toDate: Date,
    toTime: String,
    changedAt: Date
  }]
}, { timestamps: true });

bookingSchema.index(
  { therapist: 1, date: 1, slotKeys: 1 },
  { unique: true, partialFilterExpression: { bookingStatus: { $in: ['payment_pending', 'confirmed', 'completed', 'no_show'] } } }
);

bookingSchema.index({ user: 1, date: -1, createdAt: -1 });
bookingSchema.index({ therapist: 1, date: 1, time: 1, bookingStatus: 1 });
bookingSchema.index({ date: 1, bookingStatus: 1 });

export default mongoose.model('Booking', bookingSchema);
