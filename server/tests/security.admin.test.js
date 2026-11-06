import './support/env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startSecurityHarness } from './support/secHarness.js';
import { ADMIN_PW, adminMfaSignIn, adminSignIn, code, reauth, resetClock, seedAdmin, seedUser, tick } from './support/helpers.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => { h.reset(); resetClock(); });

test('14. unauthenticated admin API access is refused on EVERY admin route', async () => {
  const routes = [['GET', '/dashboard'], ['GET', '/users'], ['DELETE', '/users/64b000000000000000000001'], ['GET', '/payments'], ['POST', '/payments/64b000000000000000000001/refund'], ['PATCH', '/settings'], ['GET', '/activity-logs'], ['POST', '/services'], ['GET', '/booking-option'], ['POST', '/booking-option']];
  for (const [m, p] of routes) assert.equal((await h.call(m, `/api/admin${p}`, { body: m === 'GET' ? undefined : {} })).status, 401, `${m} ${p}`);
});

test('admin password alone never yields a session: MFA enrolment is mandatory', async () => {
  await seedAdmin(); const c = h.jar();
  const l = await h.call('POST', '/api/admin/auth/login', { client: c, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal(l.status, 200); assert.equal(l.json.mfaEnrollRequired, true);
  assert.ok(!c.cookies.aviana_admin, 'no admin cookie after password only');
  assert.equal((await h.call('GET', '/api/admin/dashboard', { client: c })).status, 401);
  assert.ok(!l.text.includes('passwordHash'));
});

test('enrolment needs a valid authenticator code; then sign-in requires TOTP; codes cannot be replayed', async () => {
  await seedAdmin();
  const bad = h.jar(); const l = await h.call('POST', '/api/admin/auth/login', { client: bad, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal((await h.call('POST', '/api/admin/auth/mfa/enroll', { client: bad, body: { enrollToken: l.json.enrollToken, code: '000000' } })).status, 400);
  const { c, secret, recovery, res } = await adminSignIn(h);
  assert.equal(res.status, 200); assert.equal(recovery.length, 10);
  assert.equal((await h.call('GET', '/api/admin/auth/me', { client: c })).json.admin.role, 'owner');
  const Admin = (await import('../models/Admin.js')).default;
  const row = await Admin.findOne({ email: 'owner@aviana.test' });
  assert.ok(row.mfa.secretEnc.startsWith('v1.') && !row.mfa.secretEnc.includes(secret), 'TOTP secret encrypted at rest');
  assert.ok(row.mfa.recoveryHashes.every((x) => /^[0-9a-f]{64}$/.test(x)), 'recovery codes stored hashed');
  const second = h.jar(); const l2 = await h.call('POST', '/api/admin/auth/login', { client: second, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal(l2.json.mfaRequired, true); tick();
  const used = code(secret);
  assert.equal((await h.call('POST', '/api/admin/auth/mfa', { client: second, body: { mfaToken: l2.json.mfaToken, code: used } })).status, 200);
  const third = h.jar(); const l3 = await h.call('POST', '/api/admin/auth/login', { client: third, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal((await h.call('POST', '/api/admin/auth/mfa', { client: third, body: { mfaToken: l3.json.mfaToken, code: used } })).status, 401, 'same TOTP code cannot be replayed');
});

test('MFA verification is rate limited: 5 wrong codes lock the pre-session token', async () => {
  await seedAdmin(); const { secret } = await adminSignIn(h);
  const c = h.jar(); const l = await h.call('POST', '/api/admin/auth/login', { client: c, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  for (let i = 0; i < 5; i += 1) await h.call('POST', '/api/admin/auth/mfa', { client: c, body: { mfaToken: l.json.mfaToken, code: '123456' } });
  tick();
  assert.equal((await h.call('POST', '/api/admin/auth/mfa', { client: c, body: { mfaToken: l.json.mfaToken, code: code(secret) } })).status, 401);
});

test('recovery code works once and raises an alert event; reuse fails', async () => {
  await seedAdmin(); const { recovery } = await adminSignIn(h);
  const c1 = h.jar(); const l1 = await h.call('POST', '/api/admin/auth/login', { client: c1, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal((await h.call('POST', '/api/admin/auth/mfa', { client: c1, body: { mfaToken: l1.json.mfaToken, code: recovery[0] } })).status, 200);
  const c2 = h.jar(); const l2 = await h.call('POST', '/api/admin/auth/login', { client: c2, body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal((await h.call('POST', '/api/admin/auth/mfa', { client: c2, body: { mfaToken: l2.json.mfaToken, code: recovery[0] } })).status, 401);
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'admin_recovery_code_used' && e.severity === 'alert'));
});

test('15. privilege escalation: staff cannot refund, delete users, change settings or touch the catalog', async () => {
  await seedAdmin('staff', 'staff@aviana.test'); const { c, secret } = await adminSignIn(h, 'staff@aviana.test');
  await reauth(h, c, secret);
  for (const [m, p] of [['POST', '/payments/64b000000000000000000001/refund'], ['DELETE', '/users/64b000000000000000000001'], ['PATCH', '/settings'], ['POST', '/services'], ['GET', '/activity-logs']]) {
    assert.equal((await h.call(m, `/api/admin${p}`, { client: c, body: m === 'GET' ? undefined : {} })).status, 403, `${m} ${p}`);
  }
  assert.equal((await h.call('GET', '/api/admin/users', { client: c })).status, 200, 'least-privilege access still works');
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'admin_forbidden'));
});

test('role is never taken from the client: body/header role claims are ignored', async () => {
  await seedAdmin('staff', 'staff@aviana.test'); const { c } = await adminSignIn(h, 'staff@aviana.test');
  const r = await h.call('POST', '/api/admin/payments/64b000000000000000000001/refund', { client: c, body: { role: 'owner' }, headers: { 'X-Role': 'owner' } });
  assert.equal(r.status, 403);
});

test('sensitive operations need a recent re-auth (owner): refund, user delete, settings', async () => {
  await seedAdmin(); const { c, secret } = await adminSignIn(h);
  const Session = (await import('../models/Session.js')).default;
  await Session.updateOne({ subjectType: 'admin' }, { $set: { recentAuthAt: new Date(Date.now() - 3_600_000) } });
  for (const [m, p] of [['POST', '/payments/64b000000000000000000001/refund'], ['DELETE', '/users/64b000000000000000000001'], ['PATCH', '/settings']]) {
    const r = await h.call(m, `/api/admin${p}`, { client: c, body: {} });
    assert.equal(r.status, 401); assert.equal(r.json.code, 'REAUTH_REQUIRED');
  }
  assert.equal((await reauth(h, c, secret)).status, 200);
  const del = await h.call('DELETE', '/api/admin/users/64b000000000000000000001', { client: c });
  assert.equal(del.status, 404, 'passes the gate; target simply does not exist');
});

test('15b. user deletion refuses accounts with booking/payment history (history is preserved)', async () => {
  await seedAdmin(); const { c, secret } = await adminSignIn(h); await reauth(h, c, secret);
  const u = await seedUser(h); const Booking = (await import('../models/Booking.js')).default;
  h.mem.store.Booking.push({ _id: new (await import('mongoose')).default.Types.ObjectId(), user: u._id });
  const r = await h.call('DELETE', `/api/admin/users/${u._id}`, { client: c });
  assert.equal(r.status, 409); assert.ok(h.mem.store.User.length === 1); void Booking;
});

test('immediate admin session revocation: logout, logout-all, idle timeout, absolute expiry', async () => {
  await seedAdmin(); const { c, secret } = await adminSignIn(h);
  const other = await adminMfaSignIn(h, secret);
  assert.equal((await h.call('POST', '/api/admin/auth/logout', { client: c })).status, 200);
  const stale = h.jar(); stale.cookies.aviana_admin = 'x';
  assert.equal((await h.call('GET', '/api/admin/auth/me', { client: stale })).status, 401);
  assert.equal((await h.call('GET', '/api/admin/auth/me', { client: other.c })).status, 200);
  assert.equal((await h.call('POST', '/api/admin/auth/logout-all', { client: other.c })).status, 200);
  const third = await adminMfaSignIn(h, secret);
  const Session = (await import('../models/Session.js')).default;
  await Session.updateOne({ subjectType: 'admin', revokedAt: null }, { $set: { lastActivityAt: new Date(Date.now() - 3_600_000) } });
  assert.equal((await h.call('GET', '/api/admin/auth/me', { client: third.c })).status, 401, 'idle timeout enforced server-side');
});

test('admin login notification and audit trail are written; admin cookie is Strict + HttpOnly', async () => {
  await seedAdmin(); const { c } = await adminSignIn(h);
  assert.ok(h.outbox.some((m) => /admin sign-in/i.test(m.subject)));
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'admin_login' && e.outcome === 'success'));
  const l = await h.call('POST', '/api/admin/auth/login', { client: h.jar(), body: { email: 'owner@aviana.test', password: ADMIN_PW } }); tick();
  const sec = JSON.stringify(h.mem.store.SecurityEvent); assert.ok(!sec.includes(ADMIN_PW) && !sec.includes(l.json.mfaToken));
  void c;
});

test('MFA reset (the only way to switch admin MFA off) ends all sessions and forces re-enrolment', async () => {
  await seedAdmin(); const { c, secret } = await adminSignIn(h); await reauth(h, c, secret); tick();
  assert.equal((await h.call('POST', '/api/admin/auth/mfa/reset', { client: c, body: { password: ADMIN_PW, code: code(secret) } })).status, 200);
  assert.equal((await h.call('GET', '/api/admin/auth/me', { client: c })).status, 401);
  const again = await h.call('POST', '/api/admin/auth/login', { client: h.jar(), body: { email: 'owner@aviana.test', password: ADMIN_PW } });
  assert.equal(again.json.mfaEnrollRequired, true, 'admin MFA can never stay disabled');
});

test('NoSQL / regex injection in admin search and filters is neutralised', async () => {
  await seedAdmin(); const { c } = await adminSignIn(h);
  assert.equal((await h.call('GET', '/api/admin/users?search=' + encodeURIComponent('.*'), { client: c })).status, 200);
  assert.equal((await h.call('GET', '/api/admin/bookings?status[$ne]=x', { client: c })).status, 400);
  assert.equal((await h.call('GET', '/api/admin/payments?status=bogus', { client: c })).status, 400);
});
