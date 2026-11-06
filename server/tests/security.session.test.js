import './support/env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { startSecurityHarness } from './support/secHarness.js';
import { PW, code, login, resetClock, seedUser, tick } from './support/helpers.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => { h.reset(); resetClock(); });
const secrets = () => ({ access: process.env.JWT_ACCESS_SECRET, refresh: process.env.JWT_REFRESH_SECRET, admin: process.env.ADMIN_JWT_SECRET });
const asCookie = (token) => { const c = h.jar(); c.cookies.aviana_access = token; return c; };

test('16. forged JWTs are rejected: alg=none, wrong secret, wrong audience, refresh/admin secret reuse, no session', async () => {
  const u = await seedUser(h); const s = secrets(); const sub = String(u._id);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub, sid: 'x', type: 'user', iss: 'aviana', aud: 'aviana:user', exp: 9999999999 })}.`;
  const claims = { sub, sid: 'abc', type: 'user' };
  const sign = (secret, extra = {}, opts = {}) => jwt.sign({ ...claims, ...extra }, secret, { algorithm: 'HS256', issuer: 'aviana', audience: 'aviana:user', expiresIn: '5m', ...opts });
  const forged = [none, sign('attacker-secret-attacker-secret-12345'), sign(s.refresh), sign(s.admin), sign(s.access, {}, { audience: 'aviana:admin' }), sign(s.access, {}, { issuer: 'evil' }), sign(s.access, {}, { algorithm: 'HS512' }), sign(s.access), sign(s.access, { type: 'admin' })];
  for (const t of forged) assert.equal((await h.call('GET', '/api/profile', { client: asCookie(t) })).status, 401);
  const expired = sign(s.access, {}, { expiresIn: '-10s' });
  assert.equal((await h.call('GET', '/api/profile', { client: asCookie(expired) })).status, 401);
});

test('a still-unexpired, correctly signed token is rejected the moment its session is revoked', async () => {
  await seedUser(h); const { c } = await login(h);
  const token = c.cookies.aviana_access; const copy = h.jar(); copy.cookies.aviana_access = token;
  assert.equal((await h.call('GET', '/api/profile', { client: copy })).status, 200);
  await h.call('POST', '/api/auth/logout', { client: c });
  assert.equal((await h.call('GET', '/api/profile', { client: copy })).status, 401, 'stolen copy of the token is dead after logout');
});

test('access tokens are short-lived (<=30m), pinned HS256, with sid/iss/aud; cookies are HttpOnly + scoped', async () => {
  await seedUser(h); const c = h.jar();
  const r = await h.call('POST', '/api/auth/login', { client: c, body: { email: 'asha@example.com', password: PW } });
  const tok = jwt.decode(c.cookies.aviana_access, { complete: true });
  assert.equal(tok.header.alg, 'HS256'); assert.ok(tok.payload.sid); assert.equal(tok.payload.aud, 'aviana:user'); assert.ok(tok.payload.exp - tok.payload.iat <= 1800);
  const cookies = r.headers.getSetCookie();
  assert.ok(cookies.every((x) => /HttpOnly/i.test(x) && /SameSite=Lax/i.test(x)));
  assert.ok(cookies.find((x) => x.startsWith('aviana_refresh=')).includes('Path=/api/auth'), 'refresh cookie only travels to auth endpoints');
  assert.ok(!r.text.includes(c.cookies.aviana_access), 'tokens never in the response body');
});

test('refresh rotation + reuse detection: replaying an old refresh token kills the whole session', async () => {
  await seedUser(h); const { c } = await login(h);
  const old = c.cookies.aviana_refresh;
  assert.equal((await h.call('POST', '/api/auth/refresh', { client: c })).status, 200);
  assert.notEqual(c.cookies.aviana_refresh, old, 'refresh token rotated');
  const thief = h.jar(); thief.cookies.aviana_refresh = old;
  assert.equal((await h.call('POST', '/api/auth/refresh', { client: thief })).status, 401);
  assert.equal((await h.call('POST', '/api/auth/refresh', { client: c })).status, 401, 'legitimate holder is also logged out');
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'refresh_reuse_detected' && e.severity === 'alert'));
});

test('sessions: list, revoke one, logout all; users can only revoke their OWN sessions', async () => {
  await seedUser(h); await seedUser(h, { email: 'ben@example.com', fullName: 'Ben Roy' });
  const a1 = (await login(h)).c; const a2 = (await login(h)).c; const b = (await login(h, 'ben@example.com')).c;
  const list = await h.call('GET', '/api/auth/sessions', { client: a1 });
  assert.equal(list.json.sessions.length, 2); assert.equal(list.json.sessions.filter((s) => s.current).length, 1);
  assert.ok(!JSON.stringify(list.json).includes('refreshHash'));
  const other = list.json.sessions.find((s) => !s.current);
  const bList = await h.call('GET', '/api/auth/sessions', { client: b });
  assert.equal((await h.call('DELETE', `/api/auth/sessions/${bList.json.sessions[0].id}`, { client: a1 })).status, 404, "cannot revoke another user's session");
  assert.equal((await h.call('DELETE', `/api/auth/sessions/${other.id}`, { client: a1 })).status, 200);
  assert.equal((await h.call('GET', '/api/profile', { client: a2 })).status, 401, 'revoked device is out immediately');
  assert.equal((await h.call('POST', '/api/auth/logout-all', { client: a1 })).status, 200);
  assert.equal((await h.call('GET', '/api/profile', { client: a1 })).status, 401);
  assert.equal((await h.call('GET', '/api/profile', { client: b })).status, 200);
});

test('blocking an account revokes its sessions and prevents sign-in', async () => {
  const u = await seedUser(h); const { c } = await login(h);
  const User = (await import('../models/User.js')).default;
  const { revokeAllSessions } = await import('../services/sessionService.js');
  await User.updateOne({ _id: u._id }, { $set: { isBlocked: true } }); await revokeAllSessions('user', u._id, 'account_blocked');
  assert.equal((await h.call('GET', '/api/profile', { client: c })).status, 401);
  assert.equal((await login(h)).r.status, 403);
});

test('15c. privilege escalation / mass assignment through the profile API is blocked', async () => {
  const u = await seedUser(h); const { c } = await login(h);
  for (const bad of [{ role: 'admin' }, { isBlocked: false }, { email: 'x@y.com' }, { passwordHash: 'abc' }, { mfa: { enabled: false } }, { _id: '64b000000000000000000001' }]) {
    assert.equal((await h.call('PATCH', '/api/profile', { client: c, body: bad })).status, 400, JSON.stringify(Object.keys(bad)));
  }
  assert.equal((await h.call('PATCH', '/api/profile', { client: c, body: { city: 'Jaipur', phone: '9876543210' } })).status, 200);
  const User = (await import('../models/User.js')).default; const row = await User.findOne({ _id: u._id });
  assert.equal(row.email, 'asha@example.com'); assert.equal(row.phone, '+919876543210');
  assert.equal((await h.call('GET', '/api/admin/dashboard', { client: c })).status, 401, 'user token is not an admin credential');
});

test('change password: policy enforced, current password required, other sessions revoked', async () => {
  await seedUser(h); const { c } = await login(h); const second = (await login(h)).c;
  assert.equal((await h.call('POST', '/api/profile/change-password', { client: c, body: { currentPassword: 'wrong', newPassword: 'Velvet-Harbour-92?' } })).status, 400);
  assert.equal((await h.call('POST', '/api/profile/change-password', { client: c, body: { currentPassword: PW, newPassword: 'short' } })).status, 400);
  assert.equal((await h.call('POST', '/api/profile/change-password', { client: c, body: { currentPassword: PW, newPassword: 'Velvet-Harbour-92?' } })).status, 200);
  assert.equal((await h.call('GET', '/api/profile', { client: second })).status, 401);
});

test('user TOTP MFA: optional enrolment, login needs the code, replay blocked, disable needs password+code', async () => {
  await seedUser(h); const { c } = await login(h);
  const setup = await h.call('POST', '/api/auth/mfa/setup', { client: c }); assert.equal(setup.status, 200);
  tick(); assert.equal((await h.call('POST', '/api/auth/mfa/enable', { client: c, body: { enrollToken: setup.json.enrollToken, code: '000000' } })).status, 400);
  const en = await h.call('POST', '/api/auth/mfa/enable', { client: c, body: { enrollToken: setup.json.enrollToken, code: code(setup.json.secret) } });
  assert.equal(en.status, 200); assert.equal(en.json.recoveryCodes.length, 10);
  const c2 = h.jar(); const l = await h.call('POST', '/api/auth/login', { client: c2, body: { email: 'asha@example.com', password: PW } });
  assert.equal(l.json.mfaRequired, true); assert.ok(!c2.cookies.aviana_access, 'no session before the second factor');
  assert.equal((await h.call('POST', '/api/auth/login/mfa', { client: c2, body: { mfaToken: l.json.mfaToken, code: '123456' } })).status, 401);
  tick(); const good = code(setup.json.secret);
  assert.equal((await h.call('POST', '/api/auth/login/mfa', { client: c2, body: { mfaToken: l.json.mfaToken, code: good } })).status, 200);
  const c3 = h.jar(); const l3 = await h.call('POST', '/api/auth/login', { client: c3, body: { email: 'asha@example.com', password: PW } });
  assert.equal((await h.call('POST', '/api/auth/login/mfa', { client: c3, body: { mfaToken: l3.json.mfaToken, code: good } })).status, 401, 'TOTP replay blocked');
  const dis = await h.call('POST', '/api/auth/mfa/disable', { client: c2, body: { password: 'wrong-wrong-wrong', code: good } });
  assert.equal(dis.status, 401);
  tick(); assert.equal((await h.call('POST', '/api/auth/mfa/disable', { client: c2, body: { password: PW, code: code(setup.json.secret) } })).status, 200);
});
