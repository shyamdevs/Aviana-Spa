import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['razorpay', 'offline'], default: 'razorpay' },
  orderId: { type: String, required: true, unique: true, index: true },
  razorpayOrderId: { type: String, unique: true, sparse: true, index: true },
  paymentId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  paymentPurpose: { type: String, enum: ['INITIAL', 'REMAINING', 'MANUAL'], default: 'INITIAL', index: true },
  paymentType: { type: String, enum: ['FULL', 'BOOKING', 'HALF'], default: 'FULL' },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refunded', 'partially_refunded'], default: 'created', index: true },
  method: { type: String, default: '' },
  refundId: String,
  refundAmount: { type: Number, default: 0, min: 0 },
  refundInProgress: { type: Boolean, default: false },
  lastWebhookEvent: String,
  meta: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

PaymentSchemaIndex(paymentSchema);

function PaymentSchemaIndex(schema) {
  schema.index({ user: 1, createdAt: -1 });
  schema.index({ status: 1, createdAt: -1 });
  schema.index(
    { booking: 1, paymentPurpose: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'created' } },
  );
}

export default mongoose.model('Payment', paymentSchema);
