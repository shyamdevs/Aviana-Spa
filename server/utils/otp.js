import crypto from 'node:crypto';
import { hmac, safeEqualHex } from './crypto.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_RESENDS_PER_HOUR = 3;

// Uniform six-digit code from the CSPRNG (crypto.randomInt avoids modulo bias).
export const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

// The hash is bound to challenge, purpose and email, so a code can never be replayed
// against another challenge, purpose or account.
export const hashOtp = ({ challengeId, purpose, email, otp }) => hmac(`otp|${challengeId}|${purpose}|${email}|${otp}`);
export const verifyOtpHash = (ctx, expectedHash) => safeEqualHex(hashOtp(ctx), expectedHash || '');
