import User from '../models/User.js';
import { env } from '../config/env.js';
import { audit } from '../utils/audit.js';
import { assertPasswordPolicy, hashPassword } from '../utils/password.js';
import { normalizePhone } from '../utils/phone.js';
import { field, parseBody } from '../utils/validate.js';
import { challengeView, dropChallengeCookie, resendChallenge, startChallenge, verifyChallenge } from '../services/otpService.js';
import { smsConfigured } from '../services/smsService.js';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const GENERIC = 'If this email can be registered, we have sent a 6-digit verification code to it.';
const BAD_CODE = 'That code is incorrect or has expired.';

export async function startRegistration(req, res) {
  const b = parseBody(req.body, { fullName: field.string({ min: 2, max: 100 }), email: field.email(), phone: field.string({ min: 6, max: 20 }), password: field.password(), confirmPassword: field.password() });
  if (b.password !== b.confirmPassword) throw bad('Passwords do not match.');
  assertPasswordPolicy(b.password, { email: b.email, name: b.fullName });
  const phone = normalizePhone(b.phone);
  if (!phone) throw bad('Enter a valid mobile number.');
  if (env.requirePhoneVerification && !smsConfigured()) throw bad('Mobile verification is not available right now. Please try again later.', 503);
  const existing = await User.findOne({ email: b.email });
  const passwordHash = await hashPassword(b.password); // hashed for every request so timing does not reveal existing accounts
  // Known e-mails get a decoy challenge: identical response, but no mail is sent and it can never verify.
  const challenge = await startChallenge({ purpose: 'register', email: b.email, decoy: Boolean(existing), pending: existing ? undefined : { fullName: b.fullName, phone, passwordHash }, name: b.fullName, req, res });
  await audit({ type: 'register_started', identifier: b.email, req, outcome: 'success' });
  res.status(202).json({ success: true, message: GENERIC, ...challengeView(challenge) });
}

export async function verifyRegistration(req, res) {
  const b = parseBody(req.body, { challengeId: field.hex(32), otp: field.otp() });
  const r = await verifyChallenge({ purpose: 'register', challengeId: b.challengeId, otp: b.otp, req });
  if (!r.ok) return res.status(400).json({ success: false, message: BAD_CODE, ...(r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : {}), ...(r.reason === 'expired' ? { expired: true } : {}) });
  // Exactly one request wins the atomic consume, so concurrent verifies cannot create two accounts.
  const { default: OtpChallenge } = await import('../models/OtpChallenge.js');
  const claimed = await OtpChallenge.findOneAndUpdate({ cid: r.doc.cid, consumedAt: null, verifiedAt: null }, { $set: { consumedAt: new Date(), verifiedAt: new Date(), verifiedChannels: ['email'] } });
  if (!claimed) return res.status(400).json({ success: false, message: BAD_CODE });
  const p = r.doc.pending || {};
  try {
    await User.create({ fullName: p.fullName, email: r.doc.email, phone: p.phone, passwordHash: p.passwordHash, passwordChangedAt: new Date(), emailVerifiedAt: new Date(), authProvider: 'local' });
  } catch (error) {
    if (error?.code === 11000) return res.status(400).json({ success: false, message: BAD_CODE });
    throw error;
  }
  dropChallengeCookie(res, 'register');
  await audit({ type: 'register_completed', identifier: r.doc.email, req, outcome: 'success' });
  // Deliberately NOT signed in: the user returns to the sign-in page.
  res.status(201).json({ success: true, message: 'Your email is verified and your account is ready. Please sign in.', redirect: '/login' });
}

export async function resendRegistration(req, res) {
  const b = parseBody(req.body, { challengeId: field.hex(32) });
  const r = await resendChallenge({ purpose: 'register', challengeId: b.challengeId, req });
  if (r.ok) return res.json({ success: true, message: GENERIC, ...challengeView(r.doc) });
  if (r.reason === 'throttled') { res.set('Retry-After', String(r.retryAfterSeconds)); return res.status(429).json({ success: false, message: 'Please wait before requesting another code.', retryAfterSeconds: r.retryAfterSeconds }); }
  return res.status(400).json({ success: false, message: 'This verification session has expired. Please start again.' });
}
