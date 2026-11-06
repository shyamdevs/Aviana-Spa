import mongoose from 'mongoose';

// Unique key per delivered Razorpay event: a duplicate insert (E11000) means replay or
// concurrent redelivery, so exactly one worker ever processes an event.
const schema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true },
  event: { type: String, default: '' },
  orderId: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export default mongoose.model('WebhookEvent', schema);
