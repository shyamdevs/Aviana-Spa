import User from '../models/User.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { assertPassword } from '../validators/auth.js';
import { storeImage } from '../utils/storage.js';

export async function getProfile(req, res) { res.json({ success: true, user: req.user }); }
export async function updateProfile(req, res) {
  const allowed = ['fullName', 'phone', 'address', 'city', 'pincode', 'gender', 'dob'];
  for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  await req.user.save();
  res.json({ success: true, user: req.user });
}
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body; assertPassword(newPassword);
  const user = await User.findById(req.user._id).select('+passwordHash +refreshTokenHash');
  if (!user.passwordHash || !(await user.comparePassword(currentPassword))) { const e = new Error('Current password is incorrect.'); e.status = 400; throw e; }
  user.passwordHash = newPassword; user.refreshTokenHash = undefined; await user.save(); clearAuthCookies(res); res.json({ success: true, message: 'Password changed. Please sign in again.' });
}

export async function uploadProfileImage(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG or WEBP image up to 5MB.' });
  const stored = await storeImage(req.file, 'aviana/profiles');
  req.user.profileImage = stored.url;
  await req.user.save();
  res.json({ success: true, profileImage: req.user.profileImage, user: req.user });
}
