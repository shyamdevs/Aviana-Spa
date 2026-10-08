import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  spaAddress: { type: String, default: 'Aviana Wellness, Jaipur' },
  openingTime: { type: String, default: '09:00' },
  closingTime: { type: String, default: '20:00' },
  slotIntervalMinutes: { type: Number, default: 15, min: 5, max: 60 },
  homeVisitFee: { type: Number, default: 500, min: 0 },
  cancellationWindowHours: { type: Number, default: 12, min: 0 },
  rescheduleWindowHours: { type: Number, default: 2, min: 0 },
  refundPercent: { type: Number, default: 100, min: 0, max: 100 },
  fullPaymentDiscountEnabled: { type: Boolean, default: false },
  fullPaymentDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
  fullPaymentDiscountMaxAmount: { type: Number, default: null, min: 0 },
  phone: String,
  contactEmail: String
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
