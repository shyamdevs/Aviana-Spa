import mongoose from 'mongoose';

// Server-side record for every short-lived verification step: signup OTP, password-reset OTP,
// the password-reset authorization token, and MFA login / enrolment tokens.
// Only HASHES of codes and tokens are stored.
const schema = new mongoose.Schema({
  cid: { type: String, required: true, unique: true },
  purpose: { type: String, enum: ['register', 'reset', 'mfa-login', 'mfa-enroll'], required: true },
  email: { type: String, default: '' },
  subjectType: { type: String, enum: ['user', 'admin', ''], default: '' },
  subject: { type: mongoose.Schema.Types.ObjectId, default: null },
  decoy: { type: Boolean, default: false }, // same shape for unknown emails; can never succeed
  ownerHash: { type: String, default: '' }, // binds the challenge to the browser that started it
  otpHash: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: null },
  resendCount: { type: Number, default: 0 },
  resendWindowStart: { type: Date, default: null },
  requiredChannels: { type: [String], default: ['email'] },
  verifiedChannels: { type: [String], default: [] },
  verifiedAt: { type: Date, default: null },
  consumedAt: { type: Date, default: null },
  pending: { fullName: String, phone: String, passwordHash: String, gender: String },
  authHash: { type: String, default: '' }, // hash of the reset-authorization token
  authExpiresAt: { type: Date, default: null },
  authUsedAt: { type: Date, default: null },
  totpSecretEnc: { type: String, default: '' }, // admin/user enrolment in progress
  ipHash: { type: String, default: '' },
}, { timestamps: true });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
schema.index({ purpose: 1, email: 1, consumedAt: 1 });
export default mongoose.model('OtpChallenge', schema);
