import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { checkSecret, evaluateSecrets, parseEncryptionKeys } from '../config/secrets.js';
import { decryptField, encryptField, needsRotation } from '../utils/crypto.js';
import { passwordProblem } from '../utils/password.js';
import { redact } from '../utils/audit.js';
import { normalizePhone } from '../utils/phone.js';
import { inspectImage } from '../utils/imageCheck.js';
import { base32Decode, totpAt, verifyTotp, generateTotpSecret } from '../utils/totp.js';
import { generateOtp, hashOtp, verifyOtpHash } from '../utils/otp.js';

const hex = () => crypto.randomBytes(32).toString('hex');

test('17. weak/default/example/duplicate production secrets are rejected (names only, never values)', () => {
  const keys = parseEncryptionKeys(`1:${crypto.randomBytes(32).toString('base64')}`);
  const good = { jwtAccessSecret: hex(), jwtRefreshSecret: hex(), adminJwtSecret: hex(), otpHmacSecret: hex(), encryptionKeys: keys, activeEncryptionKey: 1, bcryptCost: 12 };
  assert.deepEqual(evaluateSecrets(good), []);
  for (const bad of ['replace_with_a_long_random_access_secret', 'ChangeMe123!', 'secret', 'a'.repeat(64), 'short', '', 'your_jwt_secret_goes_here_please_change']) {
    const problems = evaluateSecrets({ ...good, jwtAccessSecret: bad });
    assert.ok(problems.length, `rejects ${JSON.stringify(bad)}`);
    assert.ok(problems.every((p) => !p.includes(bad) || bad === ''), 'problem text never echoes the secret');
  }
  assert.ok(evaluateSecrets({ ...good, jwtRefreshSecret: good.jwtAccessSecret }).some((p) => /different/.test(p)), 'secrets must be independent');
  assert.ok(evaluateSecrets({ ...good, encryptionKeys: new Map() }).length);
  assert.ok(evaluateSecrets({ ...good, bcryptCost: 8 }).length);
  assert.equal(checkSecret('X', crypto.randomBytes(16).toString('hex')) !== null, true, '128-bit secrets are not enough');
  assert.equal(checkSecret('X', crypto.randomBytes(48).toString('base64url')), null);
});

const childEnv = (extra) => ({ PATH: process.env.PATH, NODE_ENV: 'production', MONGO_URI: 'mongodb://127.0.0.1:1/x', ...extra });
const weak = { JWT_ACCESS_SECRET: 'replace_with_a_long_random_access_secret', JWT_REFRESH_SECRET: 'replace_with_a_long_random_refresh_secret', ADMIN_JWT_SECRET: 'replace_with_a_long_random_admin_secret', OTP_HMAC_SECRET: 'x' };

test('17b. production start-up with weak secrets refuses to listen; HTTP responses never name config variables', () => {
  const start = spawnSync(process.execPath, ['start.js'], { cwd: new URL('..', import.meta.url).pathname, env: childEnv(weak), encoding: 'utf8', timeout: 20000 });
  assert.equal(start.status, 1, 'server process exits');
  assert.match(start.stderr, /Refusing to start/);
  assert.ok(!start.stderr.includes('replace_with_a_long'), 'secret values never logged');
  const probe = `import app from './app.js'; const s=app.listen(0,async()=>{const b='http://127.0.0.1:'+s.address().port;const out={};for(const p of ['/api/health','/api/services','/api/auth/session']){const r=await fetch(b+p);out[p]=[r.status,await r.text()]}console.log(JSON.stringify(out));s.close();process.exit(0)})`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: new URL('..', import.meta.url).pathname, env: childEnv(weak), encoding: 'utf8', timeout: 20000 });
  const out = JSON.parse(run.stdout.trim().split('\n').pop());
  for (const [p, [status, body]] of Object.entries(out)) { assert.equal(status, 503, p); assert.ok(!/JWT|SECRET|OTP_HMAC|MONGO_URI|missing/i.test(body), `${p}: ${body}`); }
});

test('AES-256-GCM: round-trips, binds to owner (AAD), detects tampering, supports key rotation', () => {
  const keys = parseEncryptionKeys(`1:${Buffer.alloc(32, 1).toString('base64')},2:${Buffer.alloc(32, 2).toString('base64')}`);
  const c1 = encryptField('JBSWY3DPEHPK3PXP', 'user:42', keys, 1);
  assert.match(c1, /^v1\./); assert.ok(!c1.includes('JBSWY3DP'));
  assert.equal(decryptField(c1, 'user:42', keys), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => decryptField(c1, 'user:43', keys), 'ciphertext cannot be moved to another record');
  const parts = c1.split('.'); parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decryptField(parts.join('.'), 'user:42', keys));
  assert.notEqual(encryptField('x', 'a', keys, 1), encryptField('x', 'a', keys, 1), 'fresh IV every time');
  const c2 = encryptField(decryptField(c1, 'user:42', keys), 'user:42', keys, 2);
  assert.match(c2, /^v2\./); assert.equal(decryptField(c2, 'user:42', keys), 'JBSWY3DPEHPK3PXP');
  assert.equal(decryptField(c1, 'user:42', keys), 'JBSWY3DPEHPK3PXP', 'old key still decrypts during rotation');
  assert.equal(needsRotation(c1, 2), true); assert.equal(needsRotation(c2, 2), false);
});

test('password policy: >=12 chars, <=72 bytes, rejects common/derived/repetitive passwords', () => {
  const ok = ['Orchid-Lantern-47!', 'correct horse battery staple', 'Tr0ub4dor&3-Cinder'];
  for (const p of ok) assert.equal(passwordProblem(p), null, p);
  const bad = ['short', 'password1234', 'Password123456', 'qwertyuiop12', 'aaaaaaaaaaaa', '123456789012', 'aviana123456', 'x'.repeat(80)];
  for (const p of bad) assert.ok(passwordProblem(p), p);
  assert.ok(passwordProblem('asha.verma-2024!', { email: 'asha.verma@example.com' }), 'contains e-mail name');
  assert.ok(passwordProblem('Shyam-is-great-1', { name: 'Shyam Sharma' }), 'contains first name');
});

test('audit redaction removes passwords, OTPs, tokens, keys, signatures from metadata', () => {
  const r = redact({ password: 'p', otp: '123456', resetToken: 't', jwt: 'j', nested: { apiKey: 'k', razorpay_signature: 's', ok: 'fine' }, authorization: 'Bearer x', totp: '1' });
  assert.deepEqual(r, { password: '[redacted]', otp: '[redacted]', resetToken: '[redacted]', jwt: '[redacted]', nested: { apiKey: '[redacted]', razorpay_signature: '[redacted]', ok: 'fine' }, authorization: '[redacted]', totp: '[redacted]' });
});

test('OTP: six digits from the CSPRNG, hash bound to challenge/purpose/email, constant-time verify', () => {
  const seen = new Set(); for (let i = 0; i < 200; i += 1) { const o = generateOtp(); assert.match(o, /^\d{6}$/); seen.add(o); }
  assert.ok(seen.size > 150, 'not a constant/low-entropy generator');
  const ctx = { challengeId: 'c1', purpose: 'reset', email: 'a@x.co', otp: '123456' }; const h = hashOtp(ctx);
  assert.match(h, /^[0-9a-f]{64}$/); assert.ok(!h.includes('123456'));
  assert.ok(verifyOtpHash(ctx, h));
  for (const o of [{ challengeId: 'c2' }, { purpose: 'register' }, { email: 'b@x.co' }, { otp: '123457' }]) assert.equal(verifyOtpHash({ ...ctx, ...o }, h), false);
});

test('TOTP matches RFC 6238 vector, honours ±1 step only, rejects malformed codes', () => {
  const rfc = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; assert.equal(base32Decode(rfc).toString(), '12345678901234567890');
  assert.equal(totpAt(rfc, 59_000), '287082'); assert.equal(totpAt(rfc, 1_111_111_109_000), '081804');
  const s = generateTotpSecret(); const now = 1_700_000_000_000;
  assert.ok(verifyTotp(s, totpAt(s, now), now)); assert.ok(verifyTotp(s, totpAt(s, now - 30_000), now));
  assert.equal(verifyTotp(s, totpAt(s, now - 120_000), now), null);
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined]) assert.equal(verifyTotp(s, bad, now), null);
});

test('phone validation: E.164 normalisation, Indian mobile plan, garbage rejected', () => {
  assert.equal(normalizePhone('98765 43210'), '+919876543210'); assert.equal(normalizePhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhone('+14155552671'), '+14155552671');
  for (const bad of ['', '12345', '5876543210', '+9112345', 'abc', '98765432101234567890', '<script>', '+0123456789']) assert.equal(normalizePhone(bad), null, bad);
});

test('image inspection reads real signatures/dimensions and rejects everything else', () => {
  const png = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png); png.writeUInt32BE(13, 8); png.write('IHDR', 12); png.writeUInt32BE(800, 16); png.writeUInt32BE(600, 20);
  assert.deepEqual({ ok: true, type: 'image/png', w: 800, h: 600 }, (({ ok, type, w, h }) => ({ ok, type, w, h }))(inspectImage(png)));
  const gif = Buffer.from('GIF89a' + 'x'.repeat(40)); assert.equal(inspectImage(gif).ok, false);
  assert.equal(inspectImage(Buffer.from('<svg></svg>')).ok, false); assert.equal(inspectImage(Buffer.alloc(0)).ok, false);
});
