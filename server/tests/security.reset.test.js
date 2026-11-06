import './support/env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startSecurityHarness } from './support/secHarness.js';
import { PW, login, seedUser } from './support/helpers.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => h.reset());

const NEW = 'Velvet-Harbour-92?';
async function begin(email = 'asha@example.com') {
  const c = h.jar(); const r = await h.call('POST', '/api/auth/password/forgot', { client: c, body: { email } });
  return { c, r };
}
async function verified(email = 'asha@example.com') {
  const { c, r } = await begin(email);
  const v = await h.call('POST', '/api/auth/password/verify-otp', { client: c, body: { challengeId: r.json.challengeId, otp: h.lastOtp(email) } });
  return { c, r, v, token: v.json?.resetToken };
}
const complete = (c, body) => h.call('POST', '/api/auth/password/reset', { client: c, body });

test('full flow: forgot -> OTP -> reset token -> change password -> old sessions dead -> sign in with new password', async () => {
  await seedUser(h);
  const old = await login(h); assert.equal(old.r.status, 200);
  assert.equal((await h.call('GET', '/api/auth/me', { client: old.c })).status, 200);
  const { c, v, token } = await verified();
  assert.equal(v.status, 200); assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(v.json.verified, undefined, 'no bare verified:true flag');
  const done = await complete(c, { resetToken: token, newPassword: NEW, confirmPassword: NEW });
  assert.equal(done.status, 200); assert.equal(done.json.redirect, '/login');
  assert.ok(!c.cookies.aviana_access, 'no session issued after reset');
  assert.equal((await h.call('GET', '/api/auth/me', { client: old.c })).status, 401, '11. old session reuse after password change');
  assert.equal((await login(h, 'asha@example.com', PW)).r.status, 401, 'old password dead');
  assert.equal((await login(h, 'asha@example.com', NEW)).r.status, 200);
  assert.ok(h.outbox.some((m) => /password was changed/i.test(m.subject)), 'change notification sent');
});

test('generic responses: unknown and known e-mails look identical and unknown gets no mail', async () => {
  await seedUser(h);
  const known = await begin('asha@example.com'); const sent = h.outbox.length;
  const unknown = await begin('nobody@example.com');
  assert.equal(known.r.status, 202); assert.equal(unknown.r.status, 202);
  assert.equal(known.r.json.message, unknown.r.json.message);
  assert.deepEqual(Object.keys(known.r.json).sort(), Object.keys(unknown.r.json).sort());
  assert.equal(h.outbox.length, sent, 'nothing sent to unregistered address');
  const v = await h.call('POST', '/api/auth/password/verify-otp', { client: unknown.c, body: { challengeId: unknown.r.json.challengeId, otp: '123456' } });
  assert.equal(v.status, 400);
});

test('OTP brute force on reset is locked after 5 attempts', async () => {
  await seedUser(h); const { c, r } = await begin(); const right = h.lastOtp('asha@example.com');
  const wrong = right === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i += 1) await h.call('POST', '/api/auth/password/verify-otp', { client: c, body: { challengeId: r.json.challengeId, otp: wrong } });
  const late = await h.call('POST', '/api/auth/password/verify-otp', { client: c, body: { challengeId: r.json.challengeId, otp: right } });
  assert.equal(late.status, 400);
});

test('a new request invalidates the previous reset challenge', async () => {
  await seedUser(h); const first = await begin(); const otp1 = h.lastOtp('asha@example.com');
  await begin();
  const v = await h.call('POST', '/api/auth/password/verify-otp', { client: first.c, body: { challengeId: first.r.json.challengeId, otp: otp1 } });
  assert.equal(v.status, 400);
});

test('OTP cannot be reused across accounts', async () => {
  await seedUser(h); await seedUser(h, { email: 'ben@example.com', fullName: 'Ben Roy' });
  const a = await begin('asha@example.com'); const b = await begin('ben@example.com');
  const otpB = h.lastOtp('ben@example.com');
  const v = await h.call('POST', '/api/auth/password/verify-otp', { client: a.c, body: { challengeId: a.r.json.challengeId, otp: otpB } });
  assert.equal(v.status, 400, "Ben's code does not work on Asha's challenge");
  assert.equal((await h.call('POST', '/api/auth/password/verify-otp', { client: a.c, body: { challengeId: b.r.json.challengeId, otp: otpB } })).status, 400, 'nor with Asha browser on Ben challenge');
});

test('8. reset token misuse: cannot be used as a login, API credential, or for other fields', async () => {
  await seedUser(h); const { c, token } = await verified();
  const asBearer = await h.call('GET', '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(asBearer.status, 401);
  const asCookie = h.jar(); asCookie.cookies.aviana_access = token;
  assert.equal((await h.call('GET', '/api/profile', { client: asCookie })).status, 401);
  for (const extra of [{ email: 'evil@x.com' }, { role: 'admin' }, { phone: '+911111111111' }, { fullName: 'x' }]) {
    const r = await complete(c, { resetToken: token, newPassword: NEW, confirmPassword: NEW, ...extra });
    assert.equal(r.status, 400, `unexpected field ${Object.keys(extra)[0]} rejected`);
  }
  const User = (await import('../models/User.js')).default;
  assert.equal((await User.findOne({ email: 'asha@example.com' })).email, 'asha@example.com');
  assert.equal((await complete(c, { resetToken: token, newPassword: NEW, confirmPassword: 'Mismatch-Pass-12!' })).status, 400);
  assert.equal((await complete(c, { resetToken: token, newPassword: 'password1234', confirmPassword: 'password1234' })).status, 400, 'weak password rejected');
  assert.equal((await complete(c, { resetToken: token, newPassword: NEW, confirmPassword: NEW })).status, 200, 'a rejected attempt did not burn the token');
});

test('9. expired reset token is rejected', async () => {
  await seedUser(h); const { c, token } = await verified();
  h.mem.store.OtpChallenge[0].authExpiresAt = new Date(Date.now() - 1000);
  assert.equal((await complete(c, { resetToken: token, newPassword: NEW, confirmPassword: NEW })).status, 400);
});

test('10. reset token is single use, even under concurrency', async () => {
  await seedUser(h); const { c, token } = await verified();
  const rs = await Promise.all([1, 2, 3, 4].map(() => complete(c, { resetToken: token, newPassword: NEW, confirmPassword: NEW })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  assert.equal((await complete(c, { resetToken: token, newPassword: 'Another-Fresh-77!', confirmPassword: 'Another-Fresh-77!' })).status, 400);
});

test('reset OTP cannot be replayed after verification; token is only stored as a hash', async () => {
  await seedUser(h); const { c, r, token } = await verified(); const otp = h.lastOtp('asha@example.com');
  const again = await h.call('POST', '/api/auth/password/verify-otp', { client: c, body: { challengeId: r.json.challengeId, otp } });
  assert.equal(again.status, 400);
  assert.ok(!JSON.stringify(h.mem.store.OtpChallenge).includes(token), 'plain token never stored');
});

test('reset resend rules: 60s cooldown and 3 per hour', async () => {
  await seedUser(h); const { c, r } = await begin();
  assert.equal((await h.call('POST', '/api/auth/password/resend', { client: c, body: { challengeId: r.json.challengeId } })).status, 429);
  let ok = 0;
  for (let i = 0; i < 4; i += 1) { h.mem.store.OtpChallenge[0].lastSentAt = new Date(Date.now() - 61_000); if ((await h.call('POST', '/api/auth/password/resend', { client: c, body: { challengeId: r.json.challengeId } })).status === 200) ok += 1; }
  assert.equal(ok, 3);
});
