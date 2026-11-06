import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { audit, escalateIfRepeated } from '../utils/audit.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken, verifyAccessToken, verifyRefreshToken } from '../utils/tokens.js';
import { field, parseBody } from '../utils/validate.js';
import { createSession, revokeSession, rotateRefresh } from '../services/sessionService.js';
import { checkSecondFactor, consumePreSession, issuePreSessionToken, takePreSessionAttempt } from '../services/mfaService.js';

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;
export const safeUser = (u) => ({ id: u._id, fullName: u.fullName, email: u.email, phone: u.phone, profileImage: u.profileImage, address: u.address, city: u.city, pincode: u.pincode, gender: u.gender, dob: u.dob, mfaEnabled: Boolean(u.mfa?.enabled) });
const fail = (status, message) => Object.assign(new Error(message), { status });

async function startSession(req, res, user, { mfaVerified = false } = {}) {
  const { sid, refreshToken } = await createSession({ subjectType: 'user', subject: user, req, mfaVerified });
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  setAuthCookies(res, signAccessToken(user, sid), refreshToken);
  await audit({ type: 'login_success', actorType: 'user', actorId: user._id, identifier: user.email, req, outcome: 'success', meta: { mfa: mfaVerified } });
}

export async function login(req, res) {
  // No password-policy check here: existing accounts with older, shorter passwords must still sign in.
  const b = parseBody(req.body, { email: field.email(), password: field.string({ min: 1, max: 1024, trim: false }) });
  const user = await User.findOne({ email: b.email }).select('+passwordHash +mfa');
  const ok = await verifyPassword(b.password, user?.passwordHash); // always runs a hash compare
  if (!user || !ok) {
    await audit({ type: 'login_failed', severity: 'warn', identifier: b.email, req, outcome: 'failure' });
    await escalateIfRepeated({ type: 'login_failed', identifier: b.email, req });
    throw fail(401, 'Invalid email or password.');
  }
  if (user.isBlocked) throw fail(403, 'Your account has been blocked. Please contact support.');
  if (user.mfa?.enabled) {
    const mfaToken = await issuePreSessionToken({ purpose: 'mfa-login', subjectType: 'user', subject: user._id, email: user.email, req });
    return res.json({ success: true, mfaRequired: true, mfaToken });
  }
  await startSession(req, res, user);
  res.json({ success: true, user: safeUser(user) });
}

export async function loginMfa(req, res) {
  const b = parseBody(req.body, { mfaToken: field.hex(64), code: field.string({ min: 6, max: 20 }) });
  const challenge = await takePreSessionAttempt('mfa-login', b.mfaToken);
  const user = challenge ? await User.findById(challenge.subject).select('+mfa') : null;
  const r = user && !user.isBlocked ? await checkSecondFactor(User, 'user', user, b.code) : { ok: false };
  if (!r.ok) {
    await audit({ type: 'mfa_failed', severity: 'warn', actorType: 'user', actorId: challenge?.subject, req, outcome: 'failure' });
    await escalateIfRepeated({ type: 'mfa_failed', req });
    throw fail(401, 'That code is incorrect or has expired.');
  }
  if (!(await consumePreSession(challenge.cid))) throw fail(401, 'That code is incorrect or has expired.');
  await startSession(req, res, user, { mfaVerified: true });
  res.json({ success: true, user: safeUser(user) });
}

export async function googleLogin(req, res) {
  if (!googleClient) throw fail(503, 'Google sign-in is not configured.');
  const b = parseBody(req.body, { idToken: field.string({ min: 20, max: 4096 }) });
  const ticket = await googleClient.verifyIdToken({ idToken: b.idToken, audience: env.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) throw fail(400, 'Google email could not be verified.');
  const email = payload.email.trim().toLowerCase();
  let user = await User.findOne({ email }).select('+mfa');
  if (!user) user = await User.create({ fullName: String(payload.name || email.split('@')[0]).slice(0, 100), email, profileImage: payload.picture, authProvider: 'google', googleId: payload.sub, emailVerifiedAt: new Date() });
  if (user.isBlocked) throw fail(403, 'Your account has been blocked. Please contact support.');
  if (user.mfa?.enabled) { // Google sign-in must not bypass an enrolled second factor
    const mfaToken = await issuePreSessionToken({ purpose: 'mfa-login', subjectType: 'user', subject: user._id, email: user.email, req });
    return res.json({ success: true, mfaRequired: true, mfaToken });
  }
  await startSession(req, res, user);
  res.json({ success: true, user: safeUser(user) });
}

// Rotates the refresh token. A replayed (already rotated) token revokes the whole session.
async function rotateSession(req, res) {
  const token = req.cookies?.aviana_refresh;
  if (!token) return null;
  let payload;
  try { payload = verifyRefreshToken(token); } catch { clearAuthCookies(res); return null; }
  const user = await User.findById(payload.sub).select('+mfa');
  if (user?.isBlocked) { clearAuthCookies(res); throw fail(403, 'Your account has been blocked. Please contact support.'); }
  const r = await rotateRefresh(token, user, req);
  if (r.error) { clearAuthCookies(res); return null; }
  setAuthCookies(res, signAccessToken(user, r.session.sid), r.refreshToken);
  return user;
}

export async function refresh(req, res) {
  if (!req.cookies?.aviana_refresh) return res.status(401).json({ success: false, message: 'No refresh session.' });
  const user = await rotateSession(req, res);
  if (!user) return res.status(401).json({ success: false, message: 'Refresh session expired.' });
  res.json({ success: true, user: safeUser(user) });
}

// Called on every page load; always answers 200 so logged-out visitors cause no console errors.
export async function session(req, res) {
  const access = req.cookies?.aviana_access;
  if (access) {
    try {
      const p = verifyAccessToken(access);
      const { authenticateSession } = await import('../services/sessionService.js');
      if (p.type === 'user' && (await authenticateSession(p.sid, 'user', p.sub))) {
        const user = await User.findById(p.sub).select('+mfa');
        if (user && !user.isBlocked) return res.json({ success: true, user: safeUser(user) });
      }
    } catch { /* fall through to the refresh cookie */ }
  }
  const user = await rotateSession(req, res);
  res.json({ success: true, user: user ? safeUser(user) : null });
}

export async function logout(req, res) {
  try { await revokeSession({ sid: verifyAccessToken(req.cookies?.aviana_access).sid }, 'logout', req); } catch { /* not signed in */ }
  try { await revokeSession({ sid: verifyRefreshToken(req.cookies?.aviana_refresh).sid }, 'logout', req); } catch { /* no refresh cookie */ }
  clearAuthCookies(res);
  res.json({ success: true });
}

export async function me(req, res) { res.json({ success: true, user: safeUser(req.user) }); }
