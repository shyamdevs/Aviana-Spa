import crypto from 'node:crypto';
import { env } from '../config/env.js';

// AES-256-GCM with versioned keys. Stored form: "v<keyId>.<iv>.<tag>.<ciphertext>" (base64url).
// `aad` binds a ciphertext to its owner so it cannot be moved to another record.
const b64 = (buf) => buf.toString('base64url');

export function encryptField(plain, aad = '', keys = env.encryptionKeys, activeId = env.activeEncryptionKey) {
  const key = keys.get(activeId);
  if (!key) throw new Error('No active data-encryption key configured.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(aad)));
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v${activeId}.${b64(iv)}.${b64(cipher.getAuthTag())}.${b64(ct)}`;
}

export function decryptField(stored, aad = '', keys = env.encryptionKeys) {
  const [ver, iv, tag, ct] = String(stored || '').split('.');
  const key = keys.get(Number(String(ver).replace(/^v/, '')));
  if (!key || !iv || !tag || !ct) throw new Error('Cannot decrypt value.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(String(aad)));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}

// True when a value was written with an older key and should be re-encrypted (key rotation).
export const needsRotation = (stored, activeId = env.activeEncryptionKey) => !String(stored).startsWith(`v${activeId}.`);

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const randomHex = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'utf8'); const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export const hmac = (value, secret = env.otpHmacSecret) => crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
