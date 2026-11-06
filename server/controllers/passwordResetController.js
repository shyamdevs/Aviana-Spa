import OtpChallenge from '../models/OtpChallenge.js';
import User from '../models/User.js';
import { audit } from '../utils/audit.js';
import { sha256, randomHex } from '../utils/crypto.js';
import { sendEmail } from '../utils/email.js';
import { passwordChangedEmail } from '../utils/emailTemplates.js';
import { assertPasswordPolicy, hashPassword } from '../utils/password.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { field, parseBody } from '../utils/validate.js';
import { challengeView, dropChallengeCookie, resendChallenge, startChallenge, verifyChallenge } from '../services/otpService.js';
import { revokeAllSessions } from '../services/sessionService.js';

const GENERIC = 'If an account exists for that email, we have sent a 6-digit code to it.';
const BAD_CODE = 'That code is incorrect or has expired.';
const FIVE_MIN = 5 * 60 * 1000;

export async function forgotPassword(req, res) {
  const { email } = parseBody(req.body, { email: field.email() });
  const user = await User.findOne({ email });
  const real = Boolean(user) && !user.isBlocked;
  const challenge = await startChallenge({ purpose: 'reset', email, subject: real ? user._id : null, decoy: !real, name: user?.fullName, req, res });
  await audit({ type: 'password_reset_requested', identifier: email, req, outcome: 'success' });
  res.status(202).json({ success: true, message: GENERIC, ...challengeView(challenge) });
}

export async function resendReset(req, res) {
  const b = parseBody(req.body, { challengeId: field.hex(32) });
  const r = await resendChallenge({ purpose: 'reset', challengeId: b.challengeId, req });
  if (r.ok) return res.json({ success: true, message: GENERIC, ...challengeView(r.doc) });
  if (r.reason === 'throttled') { res.set('Retry-After', String(r.retryAfterSeconds)); return res.status(429).json({ success: false, message: 'Please wait before requesting another code.', retryAfterSeconds: r.retryAfterSeconds }); }
  return res.status(400).json({ success: false, message: 'This reset session has expired. Please start again.' });
}

// Step 2: a correct OTP is exchanged for a separate, single-use, five-minute authorization token.
export async function verifyResetOtp(req, res) {
  const b = parseBody(req.body, { challengeId: field.hex(32), otp: field.otp() });
  const r = await verifyChallenge({ purpose: 'reset', challengeId: b.challengeId, otp: b.otp, req });
  if (!r.ok) return res.status(400).json({ success: false, message: BAD_CODE, ...(r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : {}), ...(r.reason === 'expired' ? { expired: true } : {}) });
  const resetToken = randomHex(32);
  const now = new Date();
  const updated = await OtpChallenge.findOneAndUpdate(
    { cid: r.doc.cid, consumedAt: null, verifiedAt: null },
    { $set: { verifiedAt: now, otpHash: '', authHash: sha256(resetToken), authExpiresAt: new Date(now.getTime() + FIVE_MIN) } });
  if (!updated) return res.status(400).json({ success: false, message: BAD_CODE });
  await audit({ type: 'password_reset_otp_verified', actorType: 'user', actorId: r.doc.subject, identifier: r.doc.email, req, outcome: 'success' });
  res.json({ success: true, resetToken, expiresInSeconds: FIVE_MIN / 1000 });
}

// Step 3: ONLY { resetToken, newPassword, confirmPassword } are accepted; any other field is rejected.
export async function completeReset(req, res) {
  const b = parseBody(req.body, { resetToken: field.hex(64), newPassword: field.password(), confirmPassword: field.password() });
  if (b.newPassword !== b.confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  const live = { authHash: sha256(b.resetToken), purpose: 'reset', authUsedAt: null, consumedAt: null, authExpiresAt: { $gt: new Date() } };
  const c = await OtpChallenge.findOne(live);
  const user = c?.subject ? await User.findById(c.subject) : null;
  if (!c || !user) return res.status(400).json({ success: false, message: 'This reset session is invalid or has expired. Please start again.' });
  assertPasswordPolicy(b.newPassword, { email: user.email, name: user.fullName }); // before consuming, so a weak password does not burn the token
  const now = new Date();
  const claimed = await OtpChallenge.findOneAndUpdate({ ...live, cid: c.cid }, { $set: { authUsedAt: now, consumedAt: now } });
  if (!claimed) return res.status(400).json({ success: false, message: 'This reset session is invalid or has expired. Please start again.' });
  await User.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(b.newPassword), passwordChangedAt: now } });
  await revokeAllSessions('user', user._id, 'password_reset', { req });
  await OtpChallenge.updateMany({ purpose: 'reset', email: user.email, consumedAt: null }, { $set: { consumedAt: now } });
  await audit({ type: 'password_changed', actorType: 'user', actorId: user._id, identifier: user.email, req, outcome: 'success', meta: { via: 'otp_reset' } });
  try { await sendEmail({ to: user.email, ...passwordChangedEmail(user.fullName) }); } catch { /* notification is best effort */ }
  clearAuthCookies(res); dropChallengeCookie(res, 'reset');
  // No session is issued: the user signs in again with the new password.
  res.json({ success: true, message: 'Password updated. Please sign in with your new password.', redirect: '/login' });
}
