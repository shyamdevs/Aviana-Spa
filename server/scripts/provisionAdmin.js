// Explicit administrator provisioning. There is no default account and no default password.
//   ADMIN_PROVISION_EMAIL=... ADMIN_PROVISION_NAME=... ADMIN_PROVISION_PASSWORD=... \
//     node scripts/provisionAdmin.js [--rotate] [--confirm-production]
// Creates an OWNER who must enrol TOTP MFA on first sign-in. Never overwrites an existing admin
// unless --rotate is passed (which replaces the password and ends every session).
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import { hashPassword, passwordProblem } from '../utils/password.js';

const email = String(process.env.ADMIN_PROVISION_EMAIL || '').trim().toLowerCase();
const name = String(process.env.ADMIN_PROVISION_NAME || 'Aviana Owner').trim();
const password = process.env.ADMIN_PROVISION_PASSWORD || '';
const rotate = process.argv.includes('--rotate');
const die = (m) => { console.error(m); process.exit(1); };

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) die('ADMIN_PROVISION_EMAIL is required.');
const problem = passwordProblem(password, { email, name });
if (problem) die(`ADMIN_PROVISION_PASSWORD rejected: ${problem}`);
if (env.isProduction && !process.argv.includes('--confirm-production')) die('Production detected. Re-run with --confirm-production to proceed.');

await connectDB();
const existing = await Admin.findOne({ email });
if (existing && !rotate) die('An admin with this email already exists. Use --rotate to replace its password.');
const passwordHash = await hashPassword(password);
if (existing) {
  await Admin.updateOne({ _id: existing._id }, { $set: { passwordHash, passwordChangedAt: new Date() } });
  await Session.updateMany({ subjectType: 'admin', subject: existing._id, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'password_rotated' } });
  console.log('Admin password rotated; all admin sessions revoked.');
} else {
  await Admin.create({ name, email, passwordHash, passwordChangedAt: new Date(), role: 'owner', isActive: true });
  console.log('Admin created. MFA enrolment is required at first sign-in.');
}
await mongoose.disconnect();
