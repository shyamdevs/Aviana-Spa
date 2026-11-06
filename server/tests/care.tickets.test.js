import './support/env.js';
import './support/smtpDead.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';
import { notifyStaff, dedupeKeyFor } from '../utils/supportTickets.js';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });
beforeEach(() => h.reset());

const valid = { name: 'Asha Verma', contact: 'asha@example.com', message: 'Need help with my booking' };
const submit = (body, cookie) => h.call('POST', '/api/support-tickets', { body, cookie });
const waitFor = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 50)); } return null; };

test('guest ticket: saved with no owner, returns a reference; email failure does not fail the ticket', async () => {
  const r = await submit(valid);
  assert.equal(r.status, 201, r.text);
  assert.match(r.json.reference, /^AVC-[0-9A-F]{8}$/);
  assert.equal(r.json.duplicate, false);
  assert.equal(h.db.tickets.length, 1);
  assert.equal(h.db.tickets[0].userId, null);
  assert.equal(h.db.tickets[0].contactType, 'email');
  // The SMTP send fails in the background; the saved ticket stays successful and records the outcome.
  const failed = await waitFor(() => h.db.tickets[0].notificationStatus === 'failed');
  assert.ok(failed, `notificationStatus=${h.db.tickets[0].notificationStatus}`);
  assert.equal(h.db.tickets.length, 1);
});

test('signed-in ticket is owned by the VERIFIED user, never by an id in the body', async () => {
  const a = h.addUser(); const b = h.addUser();
  const r = await submit({ ...valid, userId: String(b.user._id), user: String(b.user._id) }, a.cookie);
  assert.equal(r.status, 201);
  assert.equal(String(h.db.tickets[0].userId), String(a.user._id));
});

test('a user can read their own ticket but not another user\'s or a guest\'s (indistinguishable from "not found")', async () => {
  const a = h.addUser(); const b = h.addUser();
  const mine = (await submit(valid, a.cookie)).json.reference;
  const guestRef = (await submit({ ...valid, name: 'Guest Person', message: 'guest' })).json.reference;

  const own = await h.call('GET', `/api/support-tickets/${mine}`, { cookie: a.cookie });
  assert.equal(own.status, 200);
  assert.equal(own.json.ticket.reference, mine);
  assert.ok(!('contact' in own.json.ticket) && !('userId' in own.json.ticket));

  const other = await h.call('GET', `/api/support-tickets/${mine}`, { cookie: b.cookie });
  assert.equal(other.status, 404);
  const asGuestTicket = await h.call('GET', `/api/support-tickets/${guestRef}`, { cookie: a.cookie });
  assert.equal(asGuestTicket.status, 404, 'guest tickets have no owner and cannot be read through the API');
  const missing = await h.call('GET', '/api/support-tickets/AVC-00000000', { cookie: a.cookie });
  assert.equal(missing.status, 404);
  assert.equal(other.text, missing.text, 'no existence oracle');

  assert.equal((await h.call('GET', `/api/support-tickets/${mine}`)).status, 401);
  assert.equal((await h.call('GET', '/api/support-tickets/not-a-ref', { cookie: a.cookie })).status, 400);
  assert.equal((await h.call('GET', '/api/support-tickets/AVC-0000000G', { cookie: a.cookie })).status, 400);
});

test('server-side validation rejects bad names, contacts, messages, wrong types and operator payloads', async () => {
  const cases = [
    [{ ...valid, name: 'A' }, 'short name'],
    [{ ...valid, name: '<script>alert(1)</script>' }, 'markup in name'],
    [{ ...valid, contact: 'not-a-contact' }, 'bad contact'],
    [{ ...valid, contact: '12345' }, 'short phone'],
    [{ ...valid, contact: 'x@y.com\r\nBcc: evil@example.com' }, 'header injection'],
    [{ ...valid, message: 'x'.repeat(1001) }, 'long message'],
    [{ ...valid, name: { $ne: '' } }, 'operator name'],
    [{ ...valid, contact: ['a@b.com'] }, 'array contact'],
    [{ ...valid, message: 42 }, 'numeric message'],
    [{ contact: valid.contact }, 'missing name'],
    [{ name: valid.name }, 'missing contact'],
  ];
  for (const [body, label] of cases) {
    const r = await submit(body);
    assert.equal(r.status, 400, label);
    assert.ok(!('reference' in (r.json || {})), `${label}: error responses must not report a created ticket`);
  }
  assert.equal(h.db.tickets.length, 0);
  const bad = await h.call('POST', '/api/support-tickets', { raw: 'name=a', contentType: 'application/x-www-form-urlencoded' });
  assert.equal(bad.status, 415);
  assert.equal((await h.call('POST', '/api/support-tickets', { raw: JSON.stringify({ ...valid, message: 'x'.repeat(30_000) }) })).status, 413);
});

test('optional message is allowed; phone numbers are normalised', async () => {
  const r = await submit({ name: 'Ravi Kumar', contact: '+91 98765 43210' });
  assert.equal(r.status, 201);
  assert.equal(h.db.tickets[0].contact, '+919876543210');
  assert.equal(h.db.tickets[0].contactType, 'phone');
  assert.equal(h.db.tickets[0].message, '');
});

test('double-submit is idempotent: same reference, one ticket, 200 duplicate=true', async () => {
  const [r1, r2] = await Promise.all([submit(valid), submit(valid)]);
  assert.equal(h.db.tickets.length, 1);
  assert.equal(r1.json.reference, r2.json.reference);
  assert.deepEqual([r1.status, r2.status].sort(), [200, 201]);
  // a *different* message is a different ticket
  assert.equal((await submit({ ...valid, message: 'another issue' })).status, 201);
  assert.equal(h.db.tickets.length, 2);
  // same content from a different owner is a different ticket
  const a = h.addUser();
  assert.equal((await submit(valid, a.cookie)).status, 201);
  assert.equal(h.db.tickets.length, 3);
});

test('database failure returns an error and never a reference', async () => {
  h.db.failures.ticketCreate = true;
  const r = await submit(valid);
  assert.equal(r.status, 500);
  assert.ok(!('reference' in r.json));
  assert.equal(r.json.code, 'SERVER_ERROR');
  assert.ok(!r.text.includes('simulated'));
});

test('staff e-mail is plain text only and carries the content as data; success is recorded', async () => {
  const sent = [];
  const ticket = { _id: h.db.users.size, reference: 'AVC-1A2B3C4D', name: 'Eve <b>Bold</b>', contact: 'eve@example.com', contactType: 'email', message: '<img src=x onerror=alert(1)>' };
  await notifyStaff(ticket, null, { send: async (mail) => { sent.push(mail); } });
  await waitFor(() => sent.length === 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].html, undefined, 'never send untrusted content as HTML');
  assert.match(sent[0].text, /<img src=x onerror=alert\(1\)>/); // inert in a text/plain body
  assert.equal(sent[0].to, 'care@example.test');
  assert.equal(sent[0].subject, 'New Aviana Care ticket: AVC-1A2B3C4D'); // no user content in headers
  assert.match(sent[0].text, /Signed-in customer: no \(guest\)/);
});

test('dedupe key depends on owner, content and time bucket only', () => {
  const base = { ownerId: null, name: 'A B', contact: 'a@b.co', message: 'm' };
  const t = 1_000_000_000_000;
  assert.equal(dedupeKeyFor(base, t), dedupeKeyFor({ ...base, name: 'a b' }, t + 1000));
  assert.notEqual(dedupeKeyFor(base, t), dedupeKeyFor({ ...base, ownerId: 'u1' }, t));
  assert.notEqual(dedupeKeyFor(base, t), dedupeKeyFor(base, t + 16 * 60 * 1000));
});
