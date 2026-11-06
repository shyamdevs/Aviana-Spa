import mongoose from 'mongoose';

export const ADMIN_ROLES = ['owner', 'manager', 'staff'];

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  passwordChangedAt: { type: Date, default: null },
  role: { type: String, enum: ADMIN_ROLES, default: 'staff' }, // never settable from a request body
  isActive: { type: Boolean, default: true },
  mfa: {
    enabled: { type: Boolean, default: false },
    secretEnc: { type: String, default: '' },
    recoveryHashes: { type: [String], default: [] },
    lastStep: { type: Number, default: 0 },
    enabledAt: { type: Date, default: null },
  },
  lastLoginAt: Date,
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
