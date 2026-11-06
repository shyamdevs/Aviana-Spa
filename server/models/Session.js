import mongoose from 'mongoose';

// One row per login. Access/refresh tokens are only valid while their session is live here,
// so revocation is immediate. Refresh tokens are stored as hashes; the last few superseded
// hashes are kept to detect a stolen-and-replayed refresh token.
const sessionSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  subjectType: { type: String, enum: ['user', 'admin'], required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  refreshHash: { type: String, default: null },
  prevRefreshHashes: { type: [String], default: [] },
  userAgent: { type: String, default: '', maxlength: 200 },
  ipHash: { type: String, default: '' },
  lastActivityAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  idleTimeoutMs: { type: Number, default: 0 },
  mfaVerifiedAt: { type: Date, default: null },
  recentAuthAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: '' },
}, { timestamps: true });

// Keep revoked/expired rows 30 days for audit, then let MongoDB remove them.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export default mongoose.model('Session', sessionSchema);
