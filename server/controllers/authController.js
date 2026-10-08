import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { assertEmail, assertPassword, cleanEmail } from '../validators/auth.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { hashToken, randomToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/tokens.js';
import { sendEmail, passwordResetHtml } from '../utils/email.js';
import { logActivity } from '../utils/activity.js';

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;
const safeUser = (user) => ({ id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, profileImage: user.profileImage, address: user.address, city: user.city, pincode: user.pincode, gender: user.gender, dob: user.dob });

export async function register(req, res) {
  const { fullName, password, phone, gender } = req.body;
  const email = assertEmail(req.body.email);
  assertPassword(password);
  if (!fullName || fullName.trim().length < 2) { const e = new Error('Full name is required.'); e.status = 400; throw e; }
  const existing = await User.findOne({ email });
  if (existing) { const e = new Error('An account already exists for this email.'); e.status = 409; throw e; }
  const user = await User.create({ fullName: fullName.trim(), email, passwordHash: password, phone, gender, authProvider: 'local' });
  const access = signAccessToken(user); const refresh = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refresh); user.lastLoginAt = new Date(); await user.save({ validateBeforeSave: false });
  setAuthCookies(res, access, refresh);
  await logActivity({ actorType: 'user', actorId: user._id, action: 'register', entityType: 'user', entityId: user._id, ip: req.ip });
  res.status(201).json({ success: true, user: safeUser(user) });
}

export async function login(req, res) {
  const email = assertEmail(req.body.email); const { password } = req.body;
  assertPassword(password);
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
  if (!user) { const e = new Error('Invalid email or password.'); e.status = 401; throw e; }
  if (user.isBlocked) { const e = new Error('Your account has been blocked. Please contact support.'); e.status = 403; throw e; }
  if (!(await user.comparePassword(password))) { const e = new Error('Invalid email or password.'); e.status = 401; throw e; }
  const access = signAccessToken(user); const refresh = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refresh); user.lastLoginAt = new Date(); await user.save({ validateBeforeSave: false });
  setAuthCookies(res, access, refresh);
  await logActivity({ actorType: 'user', actorId: user._id, action: 'login', entityType: 'user', entityId: user._id, ip: req.ip });
  res.json({ success: true, user: safeUser(user) });
}

export async function googleLogin(req, res) {
  if (!googleClient) { const e = new Error('Google sign-in is not configured.'); e.status = 503; throw e; }
  const ticket = await googleClient.verifyIdToken({ idToken: req.body.idToken, audience: env.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) { const e = new Error('Google email could not be verified.'); e.status = 400; throw e; }
  const email = cleanEmail(payload.email);
  let user = await User.findOne({ email }).select('+refreshTokenHash');
  if (!user) user = await User.create({ fullName: payload.name || email.split('@')[0], email, profileImage: payload.picture, authProvider: 'google', googleId: payload.sub });
  if (user.isBlocked) { const e = new Error('Your account has been blocked. Please contact support.'); e.status = 403; throw e; }
  const access = signAccessToken(user); const refresh = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refresh); user.lastLoginAt = new Date(); await user.save({ validateBeforeSave: false });
  setAuthCookies(res, access, refresh);
  res.json({ success: true, user: safeUser(user) });
}

// Validates the refresh cookie and rotates both tokens. Returns the user, or null when the
// refresh session is missing/invalid. Throws a 403 error for blocked accounts.
async function rotateSession(req, res) {
  const token = req.cookies.aviana_refresh;
  if (!token) return null;
  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash || hashToken(token) !== user.refreshTokenHash) throw new Error('Invalid refresh');
    if (user.isBlocked) { clearAuthCookies(res); const e = new Error('Your account has been blocked. Please contact support.'); e.status = 403; throw e; }
    const nextRefresh = signRefreshToken(user); const access = signAccessToken(user);
    user.refreshTokenHash = hashToken(nextRefresh); await user.save({ validateBeforeSave: false });
    setAuthCookies(res, access, nextRefresh);
    return user;
  } catch (error) {
    if (error.status === 403) throw error;
    clearAuthCookies(res);
    return null;
  }
}

export async function refresh(req, res) {
  if (!req.cookies.aviana_refresh) return res.status(401).json({ success: false, message: 'No refresh session.' });
  const user = await rotateSession(req, res);
  if (!user) return res.status(401).json({ success: false, message: 'Refresh session expired.' });
  res.json({ success: true, user: safeUser(user) });
}

// Used by the frontend on every page load. Always answers 200 so logged-out visitors do not
// produce 401 errors in the browser console. It also renews an expired access token using the
// refresh cookie, so users stay signed in for the full refresh period.
export async function session(req, res) {
  const access = req.cookies.aviana_access;
  if (access) {
    try {
      const payload = verifyAccessToken(access);
      if (payload.type === 'user') {
        const user = await User.findById(payload.sub);
        if (user && !user.isBlocked) return res.json({ success: true, user: safeUser(user) });
      }
    } catch (error) { void error; }
  }
  const user = await rotateSession(req, res);
  res.json({ success: true, user: user ? safeUser(user) : null });
}

export async function logout(req, res) {
  const token = req.cookies.aviana_refresh;
  if (token) { try { const payload = verifyRefreshToken(token); const user = await User.findById(payload.sub).select('+refreshTokenHash'); if (user) { user.refreshTokenHash = undefined; await user.save({ validateBeforeSave: false }); } } catch (error) { void error; } }
  clearAuthCookies(res); res.json({ success: true });
}

export async function me(req, res) { res.json({ success: true, user: safeUser(req.user) }); }

export async function forgotPassword(req, res) {
  const email = assertEmail(req.body.email);
  const user = await User.findOne({ email }).select('+resetTokenHash +resetTokenExpiresAt');
  if (user) {
    const token = randomToken(); user.resetTokenHash = hashToken(token); user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); await user.save({ validateBeforeSave: false });
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    await sendEmail({ to: user.email, subject: 'Reset your Aviana password', html: passwordResetHtml(user.fullName, resetUrl), text: `Reset your password: ${resetUrl}` });
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body; assertPassword(password);
  if (!token) { const e = new Error('Reset token is required.'); e.status = 400; throw e; }
  const user = await User.findOne({ resetTokenHash: hashToken(token), resetTokenExpiresAt: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpiresAt');
  if (!user) { const e = new Error('Reset link is invalid or expired.'); e.status = 400; throw e; }
  user.passwordHash = password; user.resetTokenHash = undefined; user.resetTokenExpiresAt = undefined; user.refreshTokenHash = undefined; await user.save();
  clearAuthCookies(res); res.json({ success: true, message: 'Password updated. Please log in.' });
}
