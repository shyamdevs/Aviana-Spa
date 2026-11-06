import mongoose from 'mongoose';

// Append-only security audit trail. `meta` is passed through a redaction filter first
// (utils/audit.js) so passwords, OTPs, tokens and keys can never be stored.
const schema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  severity: { type: String, enum: ['info', 'warn', 'alert'], default: 'info' },
  actorType: { type: String, enum: ['user', 'admin', 'system', 'anonymous'], default: 'anonymous' },
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  subjectHash: { type: String, default: '' }, // HMAC of email/identifier, never the raw value
  ipHash: { type: String, default: '' },
  outcome: { type: String, enum: ['success', 'failure', 'blocked', ''], default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ createdAt: -1 });
schema.index({ type: 1, createdAt: -1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 }); // 12-month retention
export default mongoose.model('SecurityEvent', schema);
