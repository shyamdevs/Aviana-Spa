import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordHash: { type: String, select: false },
  phone: { type: String, trim: true, maxlength: 20 },
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
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false },
  refreshTokenHash: { type: String, select: false },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.pre('save', async function save() {
  if (!this.isModified('passwordHash') || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return this.passwordHash ? bcrypt.compare(password, this.passwordHash) : false;
};

export default mongoose.model('User', userSchema);
