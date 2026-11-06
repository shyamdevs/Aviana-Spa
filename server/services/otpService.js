import OtpChallenge from '../models/OtpChallenge.js';
import { env } from '../config/env.js';
import { audit, escalateIfRepeated, hashIp } from '../utils/audit.js';
import { randomHex, safeEqualHex, sha256 } from '../utils/crypto.js';
import { MailUnavailableError, mailConfigured, sendEmail } from '../utils/email.js';
import { otpEmail } from '../utils/emailTemplates.js';
import { MAX_RESENDS_PER_HOUR, OTP_MAX_ATTEMPTS, OTP_TTL_MS, RESEND_COOLDOWN_MS, generateOtp, hashOtp, verifyOtpHash } from '../utils/otp.js';
import { challengeCookieName, clearChallengeCookie, setChallengeCookie } from '../utils/cookies.js';

const HOUR = 60 * 60 * 1000;
export const challengeView = (c) => ({ challengeId: c.cid, expiresInSeconds: Math.round(OTP_TTL_MS / 1000), resendAfterSeconds: Math.round(RESEND_COOLDOWN_MS / 1000) });

// OTP e-mails are never "pretend delivered": no SMTP means an honest 503, identical for every address.
export function assertMailReady() {
  if (!mailConfigured && env.nodeEnv !== 'test') throw new MailUnavailableError();
}

async function deliver(challenge, otp, name, req) {
  try {
    await sendEmail({ to: challenge.email, sensitive: true, ...otpEmail(challenge.purpose, otp), from: env.mailFrom });
    await audit({ type: 'otp_sent', actorType: 'anonymous', identifier: challenge.email, req, outcome: 'success', meta: { purpose: challenge.purpose } });
  } catch (error) {
    await audit({ type: 'otp_delivery_failed', severity: 'warn', identifier: challenge.email, req, outcome: 'failure', meta: { purpose: challenge.purpose, reason: error?.code || error?.name } });
    await escalateIfRepeated({ type: 'otp_delivery_failed', identifier: challenge.email, req, threshold: 5 });
  }
}

export async function startChallenge({ purpose, email, subject = null, decoy = false, pending, name, req, res }) {
  assertMailReady();
  const now = new Date();
  await OtpChallenge.updateMany({ purpose, email, consumedAt: null }, { $set: { consumedAt: now } }); // supersede older challenges
  const cid = randomHex(16); const secret = randomHex(24); const otp = generateOtp();
  const challenge = await OtpChallenge.create({
    cid, purpose, email, subjectType: subject ? 'user' : '', subject, decoy, pending,
    ownerHash: sha256(secret), otpHash: decoy ? '' : hashOtp({ challengeId: cid, purpose, email, otp }),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS), lastSentAt: now, resendWindowStart: now, resendCount: 0, ipHash: hashIp(req.ip),
  });
  setChallengeCookie(res, purpose, `${cid}.${secret}`);
  if (!decoy) await deliver(challenge, otp, name, req);
  return challenge;
}

// The browser must present the cookie secret AND the matching challengeId from the request body.
export function readOwner(req, purpose, challengeId) {
  const [cid, secret] = String(req.cookies?.[challengeCookieName(purpose)] || '').split('.');
  if (!cid || !secret || cid !== challengeId) return null;
  return { cid, secret };
}
const ownerOk = (doc, secret) => Boolean(doc) && safeEqualHex(sha256(secret), doc.ownerHash);

export async function verifyChallenge({ purpose, challengeId, otp, req }) {
  const owner = readOwner(req, purpose, challengeId);
  const probe = owner ? await OtpChallenge.findOne({ cid: owner.cid, purpose }) : null;
  if (!ownerOk(probe, owner?.secret)) return { ok: false, reason: 'invalid' };
  const now = new Date();
  // Atomic attempt counter: concurrent guesses cannot exceed the limit.
  const doc = await OtpChallenge.findOneAndUpdate(
    { cid: owner.cid, purpose, consumedAt: null, verifiedAt: null, expiresAt: { $gt: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } }, { new: true });
  if (!doc) return { ok: false, reason: 'expired' };
  const good = !doc.decoy && verifyOtpHash({ challengeId: doc.cid, purpose, email: doc.email, otp }, doc.otpHash);
  if (!good) {
    await audit({ type: 'otp_verify_failed', severity: 'warn', identifier: doc.email, req, outcome: 'failure', meta: { purpose, attempts: doc.attempts } });
    await escalateIfRepeated({ type: 'otp_verify_failed', identifier: doc.email, req });
    return { ok: false, reason: 'invalid', attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - doc.attempts) };
  }
  return { ok: true, doc };
}

export async function resendChallenge({ purpose, challengeId, req }) {
  const owner = readOwner(req, purpose, challengeId);
  const probe = owner ? await OtpChallenge.findOne({ cid: owner.cid, purpose }) : null;
  if (!ownerOk(probe, owner?.secret)) return { ok: false, reason: 'invalid' };
  assertMailReady();
  const now = new Date(); const otp = generateOtp();
  const base = { cid: owner.cid, purpose, consumedAt: null, verifiedAt: null, createdAt: { $gt: new Date(now - HOUR) }, lastSentAt: { $lte: new Date(now - RESEND_COOLDOWN_MS) } };
  const fresh = { otpHash: probe.decoy ? '' : hashOtp({ challengeId: probe.cid, purpose, email: probe.email, otp }), lastSentAt: now, attempts: 0, expiresAt: new Date(+now + OTP_TTL_MS) };
  let doc = await OtpChallenge.findOneAndUpdate({ ...base, resendWindowStart: { $gt: new Date(now - HOUR) }, resendCount: { $lt: MAX_RESENDS_PER_HOUR } }, { $set: fresh, $inc: { resendCount: 1 } }, { new: true });
  if (!doc) doc = await OtpChallenge.findOneAndUpdate({ ...base, resendWindowStart: { $lte: new Date(now - HOUR) } }, { $set: { ...fresh, resendWindowStart: now, resendCount: 1 } }, { new: true });
  if (!doc) {
    await audit({ type: 'otp_resend_blocked', severity: 'warn', identifier: probe.email, req, outcome: 'blocked', meta: { purpose } });
    const wait = Math.max(1, Math.ceil((new Date(probe.lastSentAt).getTime() + RESEND_COOLDOWN_MS - now.getTime()) / 1000));
    return { ok: false, reason: 'throttled', retryAfterSeconds: wait > 0 && wait <= 60 ? wait : 3600 };
  }
  if (!doc.decoy) await deliver(doc, otp, '', req);
  return { ok: true, doc };
}

export const dropChallengeCookie = clearChallengeCookie;
