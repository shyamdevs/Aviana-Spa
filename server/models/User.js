import mongoose from 'mongoose';

// Password hashing is explicit (utils/password.js) - there is deliberately no pre-save hook,
// so a stored hash can never be hashed twice and plaintext never reaches this model.
const mfaSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  secretEnc: { type: String, default: '' }, // AES-256-GCM, bound to the user id
  recoveryHashes: { type: [String], default: [] },
  lastStep: { type: Number, default: 0 }, // blocks reuse of an accepted TOTP code
  enabledAt: { type: Date, default: null },
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  emailVerifiedAt: { type: Date, default: null },
  passwordHash: { type: String, select: false },
  passwordChangedAt: { type: Date, default: null },
  phone: { type: String, trim: true, maxlength: 20 },
  phoneVerifiedAt: { type: Date, default: null },
  profileImage: String,
  address: { type: String, trim: true, maxlength: 300 },
  city: { type: String, trim: true, maxlength: 80 },
  pincode: { type: String, trim: true, maxlength: 10 },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  dob: Date,
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, sparse: true, unique: true },
  isBlocked: { type: Boolean, default: false, index: true },
  blockedAt: { type: Date, default: null },
  blockedReason: { type: String, default: '', trim: true, maxlength: 300 },
  mfa: { type: mfaSchema, default: () => ({}), select: false },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.methods.comparePassword = async function comparePassword(password) {
  const { verifyPassword } = await import('../utils/password.js');
  return verifyPassword(password, this.passwordHash);
};

export default mongoose.model('User', userSchema);
