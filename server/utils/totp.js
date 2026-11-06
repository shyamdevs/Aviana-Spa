import crypto from 'node:crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) using node:crypto only. Compatible with Google
// Authenticator, Authy, 1Password, Microsoft Authenticator.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = ''; let out = '';
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
export function base32Decode(str) {
  let bits = '';
  for (const ch of String(str).toUpperCase().replace(/=+$/, '')) { const i = ALPHABET.indexOf(ch); if (i < 0) throw new Error('bad base32'); bits += i.toString(2).padStart(5, '0'); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

export function totpAt(secret, timeMs = Date.now()) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 30000)));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0x0f;
  const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000;
  return String(code).padStart(6, '0');
}

// Returns the matched time-step counter (for replay protection) or null. Window = ±1 step.
export function verifyTotp(secret, code, timeMs = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return null;
  for (const drift of [0, -1, 1]) {
    const t = timeMs + drift * 30000;
    const expected = totpAt(secret, t);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(code)))) return Math.floor(t / 30000);
  }
  return null;
}

export const otpauthUri = (secret, account, issuer = 'Aviana Spa') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
