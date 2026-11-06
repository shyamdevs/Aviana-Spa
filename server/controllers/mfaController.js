import User from '../models/User.js';
import { audit } from '../utils/audit.js';
import { sendEmail } from '../utils/email.js';
import { verifyPassword } from '../utils/password.js';
import { field, parseBody } from '../utils/validate.js';
import { beginEnrollment, checkSecondFactor, confirmEnrollmentCode, issuePreSessionToken, mfaRecord, newRecoveryCodes, takePreSessionAttempt, consumePreSession } from '../services/mfaService.js';
import { revokeAllSessions } from '../services/sessionService.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const notify = (user, subject) => sendEmail({ to: user.email, subject, text: `${subject}. If this was not you, change your password and contact us immediately.`, html: `<p>${subject}. If this was not you, change your password and contact us immediately.</p>` }).catch(() => {});

export async function mfaSetup(req, res) {
  const user = await User.findById(req.user._id).select('+mfa');
  if (user.mfa?.enabled) throw fail(409, 'Two-factor authentication is already enabled.');
  const e = beginEnrollment('user', user, user.email);
  const enrollToken = await issuePreSessionToken({ purpose: 'mfa-enroll', subjectType: 'user', subject: user._id, totpSecretEnc: e.secretEnc, req });
  res.json({ success: true, enrollToken, secret: e.secret, otpauthUri: e.uri });
}

export async function mfaEnable(req, res) {
  const b = parseBody(req.body, { enrollToken: field.hex(64), code: field.otp() });
  const c = await takePreSessionAttempt('mfa-enroll', b.enrollToken);
  if (!c || String(c.subject) !== String(req.user._id)) throw fail(400, 'That code is incorrect or has expired.');
  const user = await User.findById(req.user._id).select('+mfa');
  const step = confirmEnrollmentCode('user', user, c.totpSecretEnc, b.code);
  if (!step) throw fail(400, 'That code is incorrect or has expired.');
  if (!(await consumePreSession(c.cid))) throw fail(400, 'That code is incorrect or has expired.');
  const { codes, hashes } = newRecoveryCodes();
  await User.updateOne({ _id: user._id }, { $set: { mfa: mfaRecord({ secretEnc: c.totpSecretEnc, hashes, step }) } });
  await revokeAllSessions('user', user._id, 'mfa_enabled', { exceptSid: req.session.sid, req });
  await audit({ type: 'mfa_enabled', actorType: 'user', actorId: user._id, req, outcome: 'success' });
  await notify(user, 'Two-factor authentication was turned on for your Aviana account');
  res.json({ success: true, recoveryCodes: codes });
}

export async function mfaDisable(req, res) {
  const b = parseBody(req.body, { password: field.password(), code: field.string({ min: 6, max: 20 }) });
  const user = await User.findById(req.user._id).select('+passwordHash +mfa');
  const pw = await verifyPassword(b.password, user.passwordHash);
  const f = pw ? await checkSecondFactor(User, 'user', user, b.code) : { ok: false };
  if (!pw || !f.ok) { await audit({ type: 'mfa_disable_failed', severity: 'warn', actorType: 'user', actorId: user._id, req, outcome: 'failure' }); throw fail(401, 'Password or code is incorrect.'); }
  await User.updateOne({ _id: user._id }, { $set: { mfa: { enabled: false, secretEnc: '', recoveryHashes: [], lastStep: 0, enabledAt: null } } });
  await revokeAllSessions('user', user._id, 'mfa_disabled', { exceptSid: req.session.sid, req });
  await audit({ type: 'mfa_disabled', actorType: 'user', actorId: user._id, req, outcome: 'success' });
  await notify(user, 'Two-factor authentication was turned off for your Aviana account');
  res.json({ success: true });
}

// Rotating recovery codes invalidates every previous code.
export async function rotateRecoveryCodes(req, res) {
  const b = parseBody(req.body, { code: field.otp() });
  const user = await User.findById(req.user._id).select('+mfa');
  const f = await checkSecondFactor(User, 'user', user, b.code);
  if (!f.ok || f.method !== 'totp') throw fail(401, 'That code is incorrect or has expired.');
  const { codes, hashes } = newRecoveryCodes();
  await User.updateOne({ _id: user._id }, { $set: { 'mfa.recoveryHashes': hashes } });
  await audit({ type: 'mfa_recovery_rotated', actorType: 'user', actorId: user._id, req, outcome: 'success' });
  res.json({ success: true, recoveryCodes: codes });
}
