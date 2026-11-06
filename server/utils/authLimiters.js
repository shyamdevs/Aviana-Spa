import { ipKeyGenerator } from 'express-rate-limit';
import { hashIdentifier } from './audit.js';
import { createLimiter } from './rateLimiters.js';

const MIN = 60 * 1000; const HOUR = 60 * MIN;
const ip = (req) => `ip:${hashIdentifier(ipKeyGenerator(req.ip || 'unknown'))}`;
// Keyed on the (hashed) e-mail from the body, so one mailbox cannot be bombed from many IPs.
const email = (req) => `em:${hashIdentifier(typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'none')}`;
const challenge = (req) => `ch:${hashIdentifier(typeof req.body?.challengeId === 'string' ? req.body.challengeId : ip(req))}`;
const msg = 'Too many attempts. Please wait a few minutes and try again.';
const mk = (name, windowMs, limit, keyGenerator) => createLimiter({ name, windowMs, limit, keyGenerator, shared: true, message: msg });

// Rate limits are SHARED across serverless instances (MongoDB-backed counters). Redis is a drop-in
// replacement via the store option in createLimiter if you later add it; none is configured here.
export const otpStartLimiters = [mk('otp-start-ip', HOUR, 15, ip), mk('otp-start-email', HOUR, 5, email)];
export const otpVerifyLimiters = [mk('otp-verify-ip', 15 * MIN, 40, ip), mk('otp-verify-ch', 15 * MIN, 12, challenge)];
export const otpResendLimiters = [mk('otp-resend-ip', HOUR, 20, ip), mk('otp-resend-ch', HOUR, 8, challenge)];
export const loginLimiters = [mk('login-ip', 15 * MIN, 40, ip), mk('login-email', 15 * MIN, 10, email)];
export const resetCompleteLimiter = mk('reset-complete-ip', 15 * MIN, 20, ip);
export const mfaLimiter = mk('mfa-ip', 15 * MIN, 30, ip);
export const adminLoginLimiters = [mk('admin-login-ip', 15 * MIN, 15, ip), mk('admin-login-email', 15 * MIN, 8, email)];
export const adminMfaLimiter = mk('admin-mfa-ip', 15 * MIN, 20, ip);
export const contactLimiters = [mk('contact-ip', HOUR, 5, ip), mk('contact-email', HOUR, 3, email)];
