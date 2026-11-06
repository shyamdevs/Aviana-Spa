import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX_BYTES = 72; // bcrypt only uses the first 72 bytes; longer input is rejected, not truncated

// Compact deny-list of passwords that dominate breach corpora, plus brand-specific guesses.
const COMMON = new Set(['password', 'password1', 'password123', 'passw0rd', 'qwerty', 'qwertyuiop', 'qwerty123', '123456', '1234567', '12345678', '123456789', '1234567890', '111111', '000000', 'abc123', 'letmein', 'welcome', 'welcome1', 'admin', 'administrator', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'trustno1', 'changeme', 'changeme123', 'aviana', 'avianaspa', 'spa', 'massage', 'jaipur', 'india', 'india123', 'whatever', 'master', 'shadow', 'superman', 'batman', 'asdfgh', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', '1qaz2wsx']);
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function passwordProblem(password, { email = '', name = '' } = {}) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) return `Password must be at most ${PASSWORD_MAX_BYTES} bytes.`;
  const flat = normalize(password);
  const stripped = flat.replace(/[0-9]+$/, '');
  if (COMMON.has(flat) || COMMON.has(stripped)) return 'That password is too common. Choose something less predictable.';
  if (new Set(password).size < 5) return 'Password is too repetitive.';
  if (/^(?:0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(password)) return 'Avoid keyboard or number sequences.';
  const local = normalize(String(email).split('@')[0] || '');
  if (local.length >= 4 && flat.includes(local)) return 'Password must not contain your email name.';
  const first = normalize(String(name).split(/\s+/)[0] || '');
  if (first.length >= 4 && flat.includes(first)) return 'Password must not contain your name.';
  return null;
}

export function assertPasswordPolicy(password, ctx) {
  const problem = passwordProblem(password, ctx);
  if (problem) { const e = new Error(problem); e.status = 400; throw e; }
}

export const hashPassword = (password) => bcrypt.hash(password, env.bcryptCost);
// Constant-ish time even when the account does not exist (compare against a dummy hash).
const DUMMY = bcrypt.hashSync('dummy-password-for-timing', 4);
export const verifyPassword = (password, hash) => bcrypt.compare(String(password || ''), hash || DUMMY).then((ok) => Boolean(hash) && ok);
