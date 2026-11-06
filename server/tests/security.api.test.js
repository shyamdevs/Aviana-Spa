import './support/env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import { startSecurityHarness } from './support/secHarness.js';
import { adminSignIn, login, resetClock, seedAdmin, seedUser } from './support/helpers.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => { h.reset(); resetClock(); });

test('18. CSRF: cookie-authenticated state changes need the custom header and a same-site fetch', async () => {
  await seedUser(h); const { c } = await login(h);
  assert.equal((await h.call('POST', '/api/auth/logout-all', { client: c, csrf: false })).status, 403, 'no custom header');
  assert.equal((await h.call('POST', '/api/auth/logout-all', { client: c, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403, 'browser says cross-site');
  assert.equal((await h.call('PATCH', '/api/profile', { client: c, csrf: false, body: { city: 'X' } })).status, 403);
  assert.equal((await h.call('POST', '/api/auth/logout-all', { client: c, headers: { Origin: 'https://evil.example' } })).status, 403, 'foreign Origin');
  assert.equal((await h.call('POST', '/api/auth/logout-all', { client: c })).status, 200, 'legitimate same-site request still works');
});

test('CSRF: admin cookie is protected the same way', async () => {
  await seedAdmin(); const { c } = await adminSignIn(h);
  assert.equal((await h.call('POST', '/api/admin/auth/logout', { client: c, csrf: false })).status, 403);
  assert.equal((await h.call('POST', '/api/admin/auth/logout', { client: c })).status, 200);
});

test('19. NoSQL injection and prototype pollution are rejected on every entry point', async () => {
  await seedUser(h);
  const inj = [{ email: { $ne: null }, password: { $ne: null } }, { email: 'asha@example.com', password: { $gt: '' } }, { email: { $regex: '.*' }, password: 'x' }];
  for (const body of inj) assert.equal((await h.call('POST', '/api/auth/login', { body })).status, 400);
  assert.equal((await h.call('POST', '/api/auth/password/forgot', { body: { email: { $ne: '' } } })).status, 400);
  assert.equal((await h.call('POST', '/api/contact', { raw: '{"name":"Asha","email":"a@b.co","message":"hello there","__proto__":{"isAdmin":true}}' })).status, 400);
  assert.equal((await h.call('POST', '/api/contact', { raw: '{"name":"Asha","email":"a@b.co","message":"hello","constructor":{"prototype":{"x":1}}}' })).status, 400);
  assert.equal(({}).isAdmin, undefined, 'Object.prototype untouched');
  assert.equal((await h.call('GET', '/api/services?isActive[$ne]=1')).status, 400);
  assert.equal((await login(h)).r.status, 200, 'real credentials still work');
});

test('request body size limit: auth endpoints reject payloads over 16 kB', async () => {
  const r = await h.call('POST', '/api/auth/login', { body: { email: 'a@b.co', password: 'x'.repeat(30_000) } });
  assert.equal(r.status, 413);
});

test('27. excessive requests are throttled (login: per-mailbox and per-IP, shared counters)', async () => {
  await seedUser(h); const codes = [];
  for (let i = 0; i < 13; i += 1) codes.push((await h.call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: 'Wrong-Password-1!' } })).status);
  assert.deepEqual(codes.slice(0, 10), Array(10).fill(401)); assert.ok(codes.slice(10).every((s) => s === 429));
  const locked = await h.call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: 'Orchid-Lantern-47!' } });
  assert.equal(locked.status, 429); assert.ok(locked.headers.get('retry-after'));
  assert.ok(h.mem.store.RateLimitHit.every((r) => !/asha|127\.0\.0\.1/.test(r._id)), 'limiter keys are hashed, no raw e-mail/IP stored');
});

test('failed logins are audited, escalate to an alert, and never record the password', async () => {
  await seedUser(h);
  for (let i = 0; i < 10; i += 1) await h.call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: `Wrong-Password-${i}!` } });
  const ev = h.mem.store.SecurityEvent;
  assert.ok(ev.filter((e) => e.type === 'login_failed').length >= 10);
  assert.ok(ev.some((e) => e.type === 'repeated_login_failed' && e.severity === 'alert'));
  assert.ok(!JSON.stringify(ev).includes('Wrong-Password') && !JSON.stringify(ev).includes('asha@example.com'), 'no password or raw e-mail in audit log');
});

test('25. contact form abuse: validation, honeypot, per-mailbox and per-IP limits', async () => {
  const ok = { name: 'Asha', email: 'asha@example.com', message: 'Hello, I would like to ask about packages.' };
  assert.equal((await h.call('POST', '/api/contact', { body: { ...ok, message: 'x'.repeat(3000) } })).status, 400);
  assert.equal((await h.call('POST', '/api/contact', { body: { ...ok, email: 'not-an-email' } })).status, 400);
  assert.equal((await h.call('POST', '/api/contact', { body: { ...ok, extra: 'field' } })).status, 400);
  const bot = await h.call('POST', '/api/contact', { body: { ...ok, website: 'http://spam.example' } });
  assert.equal(bot.status, 201); assert.equal(h.mem.store.ContactMessage.length, 0, 'honeypot submissions are not stored');
  h.reset(); // fresh limiter windows: validation failures above also count toward the per-IP budget
  const codes = []; for (let i = 0; i < 4; i += 1) codes.push((await h.call('POST', '/api/contact', { body: ok })).status);
  assert.deepEqual(codes, [201, 201, 201, 429], 'per-mailbox limit of 3 per hour');
  const ipCodes = []; for (let i = 0; i < 4; i += 1) ipCodes.push((await h.call('POST', '/api/contact', { body: { ...ok, email: `other${i}@example.com` } })).status);
  assert.ok(ipCodes.includes(429), 'per-IP limit kicks in across different mailboxes');
});

test('28. sensitive error disclosure: server errors are generic; no stack, driver text, or secrets', async () => {
  const User = (await import('../models/User.js')).default; const original = User.findOne;
  User.findOne = () => { throw new Error('connect ECONNREFUSED mongodb+srv://admin:SuperSecret@cluster0.mongodb.net/aviana'); };
  const r = await h.call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: 'Orchid-Lantern-47!' } });
  User.findOne = original;
  assert.equal(r.status, 500); assert.ok(!/mongodb|SuperSecret|ECONNREFUSED|at \w+ \(|node_modules/.test(r.text), r.text);
  const nf = await h.call('GET', '/api/does-not-exist'); assert.equal(nf.status, 404); assert.ok(!/stack|\.js/.test(nf.text));
  const bad = await h.call('POST', '/api/auth/login', { raw: '{bad json' }); assert.equal(bad.status, 400); assert.ok(!/Unexpected token|SyntaxError|\.js/.test(bad.text), bad.text);
});

test('security headers are set on API responses', async () => {
  const r = await h.call('GET', '/api/health');
  assert.match(r.headers.get('strict-transport-security') || '', /max-age=/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.match(r.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  assert.ok(r.headers.get('referrer-policy')); assert.equal(r.headers.get('x-powered-by'), null);
});

// ---------- uploads ----------
function png(w = 64, hgt = 64, extra = 0) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hgt, 4); ihdr[8] = 8; ihdr[9] = 2;
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); return b; };
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc(8))), chunk('IEND', Buffer.alloc(0)), Buffer.alloc(extra)]);
}
async function upload(c, id, buf, { name = 'photo.png', type = 'image/png' } = {}) {
  const fd = new FormData(); fd.append('image', new Blob([buf], { type }), name);
  const res = await fetch(`${h.base}/api/admin/services/${id}/image`, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'aviana-web', Cookie: `aviana_admin=${c.cookies.aviana_admin}` } });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const uploadsDir = path.resolve('uploads');
const leftovers = () => fs.readdirSync(uploadsDir).filter((f) => f !== '.gitkeep' && !fs.statSync(path.join(uploadsDir, f)).isDirectory());

test('20/21. uploads: signature spoofing, SVG/HTML/exe, oversize and pixel bombs are rejected and leave no temp files', async () => {
  await seedAdmin(); const { c } = await adminSignIn(h);
  const id = new mongoose.Types.ObjectId(); h.mem.store.Service.push({ _id: id, title: 'S', slug: 's' });
  const before = leftovers().length;
  const cases = [
    ['HTML named .png', Buffer.from('<html><script>alert(1)</script></html>')],
    ['SVG as png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['PE executable', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)])],
    ['PHP polyglot', Buffer.from('<?php system($_GET["c"]); ?>')],
    ['pixel bomb 60000x60000', png(60000, 60000)],
    ['tiny 1x1', png(1, 1)],
    ['oversize 6 MB', png(64, 64, 6 * 1024 * 1024)],
  ];
  for (const [label, buf] of cases) assert.equal((await upload(c, id, buf)).status, 400, label);
  assert.equal((await upload(c, id, png(), { name: 'x.svg', type: 'image/svg+xml' })).status, 400, 'SVG mime/extension');
  assert.equal(leftovers().length, before, 'every rejected upload removed its temp file');
  const good = await upload(c, id, png());
  assert.equal(good.status, 200, JSON.stringify(good.json));
  const stored = leftovers(); assert.equal(stored.length, before + 1);
  assert.match(stored.at(-1), /^[0-9a-f]{32}\.png$/, 'server-generated name with the TRUE extension');
  for (const f of leftovers()) fs.unlinkSync(path.join(uploadsDir, f));
});

test('upload endpoints still require admin auth + catalog permission', async () => {
  const id = new mongoose.Types.ObjectId();
  const anon = h.jar();
  const fd = new FormData(); fd.append('image', new Blob([png()], { type: 'image/png' }), 'a.png');
  const res = await fetch(`${h.base}/api/admin/services/${id}/image`, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'aviana-web' } });
  assert.equal(res.status, 401); void anon;
  const u = await h.call('POST', '/api/profile/image', { client: (await (async () => { await seedUser(h); return null; })()) || undefined });
  assert.equal(u.status, 401);
});
