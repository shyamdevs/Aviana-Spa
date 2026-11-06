import mongoose from "mongoose";

/*
 * Shared, cross-instance counters for rate limiting (see utils/mongoRateLimitStore.js).
 * _id is "<bucket-key>:<window-index>", so one document holds one fixed window.
 * Keys are HMAC-hashed upstream: no raw IP addresses or user ids are stored here.
 * The TTL index removes expired windows automatically.
 */
const rateLimitHitSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    hits: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

rateLimitHitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitHit =
  mongoose.models.RateLimitHit ||
  mongoose.model("RateLimitHit", rateLimitHitSchema);

export default RateLimitHit;
