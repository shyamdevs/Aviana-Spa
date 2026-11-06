import './support/lowLimits.js';
import './support/env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';
import RateLimitHit from '../models/RateLimitHit.js';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });
beforeEach(() => h.reset());

const guest = (m) => h.call('POST', '/api/chat/guest', { body: { message: m } });
const chat = (who, m) => h.call('POST', '/api/chat', { cookie: who.cookie, body: { message: m } });

test('7. spam: guest chat is limited per IP, answers 429 with Retry-After, and stops spending Gemini calls', async () => {
  for (let i = 0; i < 3; i += 1) assert.equal((await guest(`q${i}`)).status, 200);
  const blocked = await guest('q4');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.code, 'RATE_LIMITED');
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
  assert.ok(blocked.json.retryAfterSeconds >= 1);
  assert.equal(h.gemini.calls.length, 3);
  // Counters are in the shared store, keyed by an HMAC - no raw IP anywhere.
  const keys = [...h.db.rateHits.keys()].join(' ');
  assert.ok(!keys.includes('127.0.0.1'), keys);
});

test('per-user limits are independent: one user hitting the cap does not block another', async () => {
  const a = h.addUser(); const b = h.addUser();
  for (let i = 0; i < 3; i += 1) assert.equal((await chat(a, `a${i}`)).status, 200);
  assert.equal((await chat(a, 'a-over')).status, 429);
  assert.equal((await chat(b, 'b1')).status, 200);
});

test('unauthenticated requests are rejected before the per-user limiter or Gemini is touched', async () => {
  for (let i = 0; i < 6; i += 1) assert.equal((await h.call('POST', '/api/chat', { body: { message: 'x' } })).status, 401);
  assert.equal(h.gemini.calls.length, 0);
});

test('support tickets are rate limited per IP and per user', async () => {
  const mk = (n) => ({ name: 'Asha Verma', contact: 'asha@example.com', message: `issue ${n}` });
  assert.equal((await h.call('POST', '/api/support-tickets', { body: mk(1) })).status, 201);
  assert.equal((await h.call('POST', '/api/support-tickets', { body: mk(2) })).status, 201);
  const third = await h.call('POST', '/api/support-tickets', { body: mk(3) });
  assert.equal(third.status, 429);
  assert.ok(!('reference' in third.json));
  assert.equal(h.db.tickets.length, 2);
});

test('shared daily Gemini budget: once exhausted, chat degrades honestly (503) and handoff still works', async () => {
  const users = [h.addUser(), h.addUser()];
  for (let i = 0; i < 3; i += 1) assert.equal((await chat(users[0], `u0-${i}`)).status, 200);
  assert.equal((await chat(users[1], 'u1-1')).status, 200); // 4th call = budget
  const over = await chat(users[1], 'u1-2');
  assert.equal(over.status, 503);
  assert.equal(over.json.code, 'AI_BUSY');
  assert.ok(!('reply' in over.json));
  assert.equal(h.gemini.calls.length, 4);
  // Local shortcuts don't consume budget, so customers can still reach a human.
  const human = await chat(users[1], 'I want to talk to customer care');
  assert.equal(human.status, 200);
  assert.equal(human.json.handoff, true);
});

test('if the rate-limit store fails, requests are served (fail-open) rather than locking customers out', async () => {
  const original = RateLimitHit.findOneAndUpdate;
  RateLimitHit.findOneAndUpdate = () => Promise.reject(new Error('store down'));
  try {
    const r = await guest('hello');
    assert.equal(r.status, 200);
  } finally {
    RateLimitHit.findOneAndUpdate = original;
  }
});
