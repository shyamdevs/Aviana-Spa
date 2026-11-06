import Admin from '../models/Admin.js';
import { env } from '../config/env.js';
import { audit, escalateIfRepeated, raiseAlert } from '../utils/audit.js';
import { clearAdminCookie, setAdminCookie } from '../utils/cookies.js';
import { sendEmail } from '../utils/email.js';
import { adminLoginEmail } from '../utils/emailTemplates.js';
import { verifyPassword } from '../utils/password.js';
import { signAdminToken } from '../utils/tokens.js';
import { field, parseBody } from '../utils/validate.js';
import { beginEnrollment, checkSecondFactor, confirmEnrollmentCode, consumePreSession, issuePreSessionToken, mfaRecord, newRecoveryCodes, takePreSessionAttempt } from '../services/mfaService.js';
import { createSession, listSessions, publicSession, revokeAllSessions, revokeSession } from '../services/sessionService.js';
import Session from '../models/Session.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
export const safeAdmin = (a) => ({ id: a._id, name: a.name, email: a.email, role: a.role });
const BAD = 'Invalid admin credentials.';

async function openSession(req, res, admin) {
  const { sid } = await createSession({ subjectType: 'admin', subject: admin, req, mfaVerified: true });
  setAdminCookie(res, signAdminToken(admin, sid));
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  await audit({ type: 'admin_login', actorType: 'admin', actorId: admin._id, identifier: admin.email, req, outcome: 'success' });
  // Login notification goes to the dedicated alert mailbox when set, otherwise to the admin.
  sendEmail({ to: env.adminNotifyEmail || admin.email, ...adminLoginEmail(admin.name, new Date().toISOString(), req.headers['user-agent'] || 'unknown') }).catch(() => {});
}

// Step 1 - password. Never yields a session: the caller must complete MFA (or first enrolment).
export async function adminLogin(req, res) {
  const b = parseBody(req.body, { email: field.email(), password: field.string({ min: 1, max: 1024, trim: false }) });
  const admin = await Admin.findOne({ email: b.email }).select('+passwordHash');
  const ok = await verifyPassword(b.password, admin?.passwordHash);
  if (!admin || !admin.isActive || !ok) {
    await audit({ type: 'admin_login_failed', severity: 'warn', identifier: b.email, req, outcome: 'failure' });
    await escalateIfRepeated({ type: 'admin_login_failed', identifier: b.email, req, threshold: 5 });
    throw fail(401, BAD);
  }
  if (admin.mfa?.enabled) {
    const mfaToken = await issuePreSessionToken({ purpose: 'mfa-login', subjectType: 'admin', subject: admin._id, email: admin.email, req });
    return res.json({ success: true, mfaRequired: true, mfaToken });
  }
  const e = beginEnrollment('admin', admin, admin.email);
  const enrollToken = await issuePreSessionToken({ purpose: 'mfa-enroll', subjectType: 'admin', subject: admin._id, totpSecretEnc: e.secretEnc, req });
  res.json({ success: true, mfaEnrollRequired: true, enrollToken, secret: e.secret, otpauthUri: e.uri });
}

// Step 2a - TOTP or recovery code for an enrolled admin.
export async function adminMfa(req, res) {
  const b = parseBody(req.body, { mfaToken: field.hex(64), code: field.string({ min: 6, max: 20 }) });
  const c = await takePreSessionAttempt('mfa-login', b.mfaToken);
  const admin = c && c.subjectType === 'admin' ? await Admin.findById(c.subject) : null;
  const r = admin?.isActive ? await checkSecondFactor(Admin, 'admin', admin, b.code) : { ok: false };
  if (!r.ok) {
    await audit({ type: 'admin_mfa_failed', severity: 'warn', actorType: 'admin', actorId: c?.subject, req, outcome: 'failure' });
    await escalateIfRepeated({ type: 'admin_mfa_failed', req, threshold: 5 });
    throw fail(401, BAD);
  }
  if (!(await consumePreSession(c.cid))) throw fail(401, BAD);
  if (r.method === 'recovery') await raiseAlert('admin_recovery_code_used', `Admin ${admin.email} signed in with a recovery code`, req);
  await openSession(req, res, admin);
  res.json({ success: true, admin: safeAdmin(admin) });
}

// Step 2b - first-time enrolment (mandatory). Returns recovery codes once, then opens the session.
export async function adminEnroll(req, res) {
  const b = parseBody(req.body, { enrollToken: field.hex(64), code: field.otp() });
  const c = await takePreSessionAttempt('mfa-enroll', b.enrollToken);
  const admin = c && c.subjectType === 'admin' ? await Admin.findById(c.subject) : null;
  const step = admin && !admin.mfa?.enabled ? confirmEnrollmentCode('admin', admin, c.totpSecretEnc, b.code) : 0;
  if (!step) throw fail(400, 'That code is incorrect or has expired.');
  if (!(await consumePreSession(c.cid))) throw fail(400, 'That code is incorrect or has expired.');
  const { codes, hashes } = newRecoveryCodes();
  await Admin.updateOne({ _id: admin._id, 'mfa.enabled': false }, { $set: { mfa: mfaRecord({ secretEnc: c.totpSecretEnc, hashes, step }) } });
  await audit({ type: 'admin_mfa_enrolled', actorType: 'admin', actorId: admin._id, req, outcome: 'success' });
  await openSession(req, res, admin);
  res.json({ success: true, admin: safeAdmin(admin), recoveryCodes: codes });
}

// Fresh password + code within the current session, required before sensitive operations.
export async function adminReauth(req, res) {
  const b = parseBody(req.body, { password: field.string({ min: 1, max: 1024, trim: false }), code: field.string({ min: 6, max: 20 }) });
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  const pw = await verifyPassword(b.password, admin.passwordHash);
  const f = pw ? await checkSecondFactor(Admin, 'admin', admin, b.code) : { ok: false };
  if (!pw || !f.ok) { await audit({ type: 'admin_reauth_failed', severity: 'warn', actorType: 'admin', actorId: admin._id, req, outcome: 'failure' }); throw fail(401, 'Password or code is incorrect.'); }
  await Session.updateOne({ sid: req.adminSession.sid }, { $set: { recentAuthAt: new Date() } });
  await audit({ type: 'admin_reauth', actorType: 'admin', actorId: admin._id, req, outcome: 'success' });
  res.json({ success: true });
}

// "Disabling" admin MFA = reset: needs password + current code + a recent re-auth, ends every
// admin session, and forces re-enrolment at the next login (admin MFA can never stay off).
export async function adminMfaReset(req, res) {
  const b = parseBody(req.body, { password: field.string({ min: 1, max: 1024, trim: false }), code: field.string({ min: 6, max: 20 }) });
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  const pw = await verifyPassword(b.password, admin.passwordHash);
  const f = pw ? await checkSecondFactor(Admin, 'admin', admin, b.code) : { ok: false };
  if (!pw || !f.ok) throw fail(401, 'Password or code is incorrect.');
  await Admin.updateOne({ _id: admin._id }, { $set: { mfa: { enabled: false, secretEnc: '', recoveryHashes: [], lastStep: 0, enabledAt: null } } });
  await revokeAllSessions('admin', admin._id, 'mfa_reset', { req });
  await raiseAlert('admin_mfa_reset', `Admin ${admin.email} reset their MFA`, req);
  clearAdminCookie(res);
  res.json({ success: true });
}

export const adminMe = (req, res) => res.json({ success: true, admin: safeAdmin(req.admin) });

export async function adminLogout(req, res) {
  await revokeSession({ sid: req.adminSession.sid }, 'logout', req);
  clearAdminCookie(res);
  res.json({ success: true });
}

export async function adminSessions(req, res) {
  res.json({ success: true, sessions: (await listSessions('admin', req.admin._id)).map((s) => publicSession(s, req.adminSession.sid)) });
}

export async function adminRevokeSession(req, res) {
  const s = await revokeSession({ _id: req.params.id, subjectType: 'admin', subject: req.admin._id }, 'admin_revoked', req);
  if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true });
}

export async function adminLogoutAll(req, res) {
  await revokeAllSessions('admin', req.admin._id, 'logout_all', { req });
  clearAdminCookie(res);
  res.json({ success: true });
}
