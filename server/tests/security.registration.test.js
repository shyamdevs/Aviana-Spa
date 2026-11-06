import './support/env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startSecurityHarness } from './support/secHarness.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => h.reset());

const GOOD = { fullName: 'Asha Verma', email: 'asha@example.com', phone: '9876543210', password: 'Orchid-Lantern-47!', confirmPassword: 'Orchid-Lantern-47!' };
async function start(client, over = {}) { return h.call('POST', '/api/auth/register', { client, body: { ...GOOD, ...over } }); }
const users = () => h.mem.store.User;

test('1. registration without OTP verification creates NO account and NO session', async () => {
  const c = h.jar(); const r = await start(c);
  assert.equal(r.status, 202);
  assert.equal(users().length, 0, 'no permanent user before OTP');
  assert.ok(!c.cookies.aviana_access && !c.cookies.aviana_refresh, 'no session cookies');
  assert.ok(!JSON.stringify(r.json).match(/\b\d{6}\b/), 'OTP never in API response');
  const pending = h.mem.store.OtpChallenge[0];
  assert.ok(pending.otpHash && pending.otpHash.length === 64 && !/^\d{6}$/.test(pending.otpHash), 'only a hash is stored');
  assert.ok(pending.pending.passwordHash.startsWith('$2'), 'password is bcrypt-hashed even while pending');
  assert.ok(!JSON.stringify(h.mem.store.OtpChallenge).includes(GOOD.password));
});

test('happy path: OTP verifies, account is created, user is NOT auto-logged-in, redirect to sign-in', async () => {
  const c = h.jar(); const s = await start(c);
  const otp = h.lastOtp(GOOD.email); assert.match(otp, /^\d{6}$/);
  const v = await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp } });
  assert.equal(v.status, 201); assert.equal(v.json.redirect, '/login');
  assert.equal(users().length, 1); assert.ok(users()[0].emailVerifiedAt);
  assert.ok(!c.cookies.aviana_access, 'no automatic login');
  const l = await h.call('POST', '/api/auth/login', { client: c, body: { email: GOOD.email, password: GOOD.password } });
  assert.equal(l.status, 200); assert.ok(c.cookies.aviana_access);
  assert.ok(!l.text.includes('passwordHash'));
});

test('2/3. wrong OTP is rejected with attempts counted; expired OTP is rejected', async () => {
  const c = h.jar(); const s = await start(c);
  const bad = await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp: '000000' } });
  assert.equal(bad.status, 400); assert.equal(bad.json.attemptsLeft, 4);
  h.mem.store.OtpChallenge[0].expiresAt = new Date(Date.now() - 1000);
  const otp = h.lastOtp(GOOD.email);
  const exp = await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp } });
  assert.equal(exp.status, 400); assert.equal(users().length, 0);
});

test('4. a used OTP cannot be replayed (and cannot create a second account)', async () => {
  const c = h.jar(); const s = await start(c); const otp = h.lastOtp(GOOD.email);
  const body = { challengeId: s.json.challengeId, otp };
  assert.equal((await h.call('POST', '/api/auth/register/verify', { client: c, body })).status, 201);
  c.cookies.aviana_reg = h.mem.store.OtpChallenge[0].cid + '.x';
  const again = await h.call('POST', '/api/auth/register/verify', { client: c, body });
  assert.equal(again.status, 400); assert.equal(users().length, 1);
});

test('4b. concurrent verification with the correct OTP creates exactly one account', async () => {
  const c = h.jar(); const s = await start(c); const otp = h.lastOtp(GOOD.email);
  const rs = await Promise.all(Array.from({ length: 6 }, () => h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp } })));
  assert.equal(rs.filter((r) => r.status === 201).length, 1); assert.equal(users().length, 1);
});

test('5. OTP brute force: locked after 5 attempts, even the right code then fails', async () => {
  const c = h.jar(); const s = await start(c); const right = h.lastOtp(GOOD.email);
  const wrong = right === '123456' ? '654321' : '123456';
  for (let i = 0; i < 5; i += 1) assert.equal((await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp: wrong } })).status, 400);
  const late = await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp: right } });
  assert.equal(late.status, 400); assert.equal(users().length, 0);
});

test('5b. OTP from another browser (no ownership cookie) is useless', async () => {
  const c = h.jar(); const s = await start(c); const otp = h.lastOtp(GOOD.email);
  const attacker = h.jar();
  const r = await h.call('POST', '/api/auth/register/verify', { client: attacker, body: { challengeId: s.json.challengeId, otp } });
  assert.equal(r.status, 400); assert.equal(users().length, 0);
});

test('6. resend abuse: 60s cooldown, then max 3 per hour; old code invalidated', async () => {
  const c = h.jar(); const s = await start(c); const first = h.lastOtp(GOOD.email);
  const body = { challengeId: s.json.challengeId };
  const tooSoon = await h.call('POST', '/api/auth/register/resend', { client: c, body });
  assert.equal(tooSoon.status, 429); assert.ok(tooSoon.json.retryAfterSeconds > 0);
  const row = () => h.mem.store.OtpChallenge[0];
  let sent = 0;
  for (let i = 0; i < 4; i += 1) {
    row().lastSentAt = new Date(Date.now() - 61_000);
    const r = await h.call('POST', '/api/auth/register/resend', { client: c, body });
    if (r.status === 200) sent += 1;
  }
  assert.equal(sent, 3, 'only three resends per hour');
  const v = await h.call('POST', '/api/auth/register/verify', { client: c, body: { challengeId: s.json.challengeId, otp: first } });
  assert.equal(v.status, 400, 'previous OTP no longer valid');
});

test('7. duplicate registration is indistinguishable and sends no OTP to the existing owner', async () => {
  const a = h.jar(); const s = await start(a); await h.call('POST', '/api/auth/register/verify', { client: a, body: { challengeId: s.json.challengeId, otp: h.lastOtp(GOOD.email) } });
  const before = h.outbox.length;
  const b = h.jar(); const dup = await start(b);
  assert.equal(dup.status, 202); assert.equal(dup.json.message, s.json.message);
  assert.equal(h.outbox.length, before, 'no mail for already-registered address');
  const v = await h.call('POST', '/api/auth/register/verify', { client: b, body: { challengeId: dup.json.challengeId, otp: '123456' } });
  assert.equal(v.status, 400); assert.equal(users().length, 1);
});

test('input validation: weak/common passwords, mismatch, bad phone, extra fields, operator injection', async () => {
  const c = h.jar(); let n = 0;
  const go = (over) => start(c, { email: `v${n++}@example.com`, ...over }); // distinct mailbox per call: the per-mailbox limiter is not under test here
  assert.equal((await go({ password: 'short1', confirmPassword: 'short1' })).status, 400);
  assert.equal((await go({ password: 'password1234', confirmPassword: 'password1234' })).status, 400);
  assert.equal((await go({ confirmPassword: 'Different-Pass-99!' })).status, 400);
  assert.equal((await go({ phone: '12345' })).status, 400);
  assert.equal((await go({ role: 'admin' })).status, 400, 'unexpected fields rejected');
  assert.equal((await start(c, { email: { $ne: null } })).status, 400, 'operator injection rejected');
  assert.equal((await go({ password: 'Orchid-Lantern-47!'.repeat(6), confirmPassword: 'Orchid-Lantern-47!'.repeat(6) })).status, 400, 'over bcrypt limit');
  assert.equal(h.mem.store.OtpChallenge.length, 0, 'nothing stored for rejected requests');
});

test('e-mail bombing: a single mailbox can request at most 5 codes per hour', async () => {
  const c = h.jar(); const codes = [];
  for (let i = 0; i < 7; i += 1) codes.push((await start(c)).status);
  assert.deepEqual(codes, [202, 202, 202, 202, 202, 429, 429]);
});

test('OTP e-mail contains the code, the expiry and a do-not-share warning; is sent once per request', async () => {
  const c = h.jar(); await start(c);
  const mail = h.outbox.at(-1);
  assert.match(mail.text, /Code: \d{6}/); assert.match(mail.text, /5 minutes/); assert.match(mail.text, /Do not share/i);
  assert.equal(mail.sensitive, true);
});
