import User from '../models/User.js';
import { audit } from '../utils/audit.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { sendEmail } from '../utils/email.js';
import { passwordChangedEmail } from '../utils/emailTemplates.js';
import { assertPasswordPolicy, hashPassword, verifyPassword } from '../utils/password.js';
import { normalizePhone } from '../utils/phone.js';
import { field, parseBody } from '../utils/validate.js';
import { storeImage } from '../utils/storage.js';
import { revokeAllSessions } from '../services/sessionService.js';
import { safeUser } from './authController.js';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export async function getProfile(req, res) { res.json({ success: true, user: safeUser(req.user) }); }

// Only these keys can ever be changed here: e-mail, role, block state and password hash are not on the list.
export async function updateProfile(req, res) {
  const b = parseBody(req.body, {
    fullName: field.string({ min: 2, max: 100 }), phone: field.string({ min: 6, max: 20 }), address: field.string({ max: 300 }),
    city: field.string({ max: 80 }), pincode: field.string({ max: 10 }), gender: field.string({ max: 20 }), dob: field.string({ max: 30 }),
  }, { optional: ['fullName', 'phone', 'address', 'city', 'pincode', 'gender', 'dob'] });
  const $set = { ...b };
  if (b.phone) { $set.phone = normalizePhone(b.phone); if (!$set.phone) throw bad('Enter a valid mobile number.'); }
  if (b.gender && !GENDERS.includes(b.gender)) throw bad('Invalid gender.');
  if (b.dob) { const d = new Date(b.dob); if (Number.isNaN(d.getTime()) || d > new Date() || d.getFullYear() < 1900) throw bad('Invalid date of birth.'); $set.dob = d; }
  const user = await User.findByIdAndUpdate(req.user._id, { $set }, { new: true, runValidators: true });
  res.json({ success: true, user: safeUser(user) });
}

export async function changePassword(req, res) {
  const b = parseBody(req.body, { currentPassword: field.string({ min: 1, max: 1024, trim: false }), newPassword: field.password() });
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user.passwordHash || !(await verifyPassword(b.currentPassword, user.passwordHash))) {
    await audit({ type: 'password_change_failed', severity: 'warn', actorType: 'user', actorId: user._id, req, outcome: 'failure' });
    throw bad('Current password is incorrect.');
  }
  assertPasswordPolicy(b.newPassword, { email: user.email, name: user.fullName });
  await User.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(b.newPassword), passwordChangedAt: new Date() } });
  await revokeAllSessions('user', user._id, 'password_changed', { req });
  await audit({ type: 'password_changed', actorType: 'user', actorId: user._id, req, outcome: 'success', meta: { via: 'profile' } });
  sendEmail({ to: user.email, ...passwordChangedEmail(user.fullName) }).catch(() => {});
  clearAuthCookies(res);
  res.json({ success: true, message: 'Password changed. Please sign in again.' });
}

export async function uploadProfileImage(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, WEBP or AVIF image up to 5MB.' });
  const stored = await storeImage(req.file, 'aviana/profiles');
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { profileImage: stored.url } }, { new: true });
  res.json({ success: true, profileImage: user.profileImage, user: safeUser(user) });
}
