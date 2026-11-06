import crypto from 'node:crypto';
import OtpChallenge from '../models/OtpChallenge.js';
import { decryptField, encryptField, hmac, randomHex, sha256 } from '../utils/crypto.js';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../utils/totp.js';

const FIVE_MIN = 5 * 60 * 1000;
const aad = (type, id) => `${type}:${id}`;
const recoveryHash = (code) => hmac(`rc|${String(code).toLowerCase()}`);
export const MFA_MAX_ATTEMPTS = 5;

// Ten one-time recovery codes. Only keyed hashes are stored; the plaintext is shown once.
export function newRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(6).toString('hex').replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'));
  return { codes, hashes: codes.map((c) => recoveryHash(c.replace(/-/g, ''))) };
}

/** Verifies a TOTP (with replay protection) or a recovery code. Recovery codes are consumed atomically. */
export async function checkSecondFactor(Model, type, account, code) {
  const mfa = account?.mfa;
  if (!mfa?.enabled) return { ok: false };
  const clean = String(code || '').replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(clean)) {
    let secret;
    try { secret = decryptField(mfa.secretEnc, aad(type, account._id)); } catch { return { ok: false }; }
    const step = verifyTotp(secret, clean);
    if (!step || step <= (mfa.lastStep || 0)) return { ok: false };
    const r = await Model.updateOne({ _id: account._id, 'mfa.lastStep': { $lt: step } }, { $set: { 'mfa.lastStep': step } });
    return { ok: (r?.modifiedCount ?? 0) === 1, method: 'totp' };
  }
  if (/^[a-f0-9]{12}$/i.test(clean)) {
    const h = recoveryHash(clean);
    const r = await Model.updateOne({ _id: account._id, 'mfa.recoveryHashes': h }, { $pull: { 'mfa.recoveryHashes': h } });
    return { ok: (r?.modifiedCount ?? 0) === 1, method: 'recovery' };
  }
  return { ok: false };
}

// Short-lived pre-session tokens (random, stored hashed, five minutes, five attempts).
export async function issuePreSessionToken({ purpose, subjectType, subject, email = '', totpSecretEnc = '', req }) {
  const token = randomHex(32); const now = Date.now();
  await OtpChallenge.updateMany({ purpose, subject, consumedAt: null }, { $set: { consumedAt: new Date() } });
  await OtpChallenge.create({ cid: randomHex(16), purpose, subjectType, subject, email, authHash: sha256(token), authExpiresAt: new Date(now + FIVE_MIN), expiresAt: new Date(now + FIVE_MIN), totpSecretEnc, ipHash: req?.ip ? sha256(req.ip) : '' });
  return token;
}

// Atomically counts an attempt and returns the live challenge, or null (expired/used/locked).
export const takePreSessionAttempt = (purpose, token) => OtpChallenge.findOneAndUpdate(
  { purpose, authHash: sha256(String(token)), consumedAt: null, authExpiresAt: { $gt: new Date() }, attempts: { $lt: MFA_MAX_ATTEMPTS } },
  { $inc: { attempts: 1 } }, { new: true });

export const consumePreSession = (cid) => OtpChallenge.findOneAndUpdate({ cid, consumedAt: null }, { $set: { consumedAt: new Date() } });

export function beginEnrollment(type, account, label) {
  const secret = generateTotpSecret();
  return { secret, secretEnc: encryptField(secret, aad(type, account._id)), uri: otpauthUri(secret, label) };
}

// Enrollment completes only when the user proves their authenticator generates valid codes.
// Returns the accepted time step (so it can be recorded and never reused), or 0 on failure.
export function confirmEnrollmentCode(type, account, secretEnc, code) {
  try { return verifyTotp(decryptField(secretEnc, aad(type, account._id)), code) || 0; } catch { return 0; }
}
export const mfaRecord = ({ secretEnc, hashes, step = 0 }) => ({ enabled: true, secretEnc, recoveryHashes: hashes, lastStep: step, enabledAt: new Date() });
