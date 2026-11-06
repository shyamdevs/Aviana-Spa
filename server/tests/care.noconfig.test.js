import './support/noKey.js';
import './support/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });

test('missing GEMINI_API_KEY: honest 503 with retry/handoff hints, no crash, no secrets, human handoff still works', async () => {
  const r = await h.call('POST', '/api/chat/guest', { body: { message: 'price of Swedish massage?' } });
  assert.equal(r.status, 503);
  assert.equal(r.json.code, 'AI_UNAVAILABLE');
  assert.equal(r.json.handoffSuggested, true);
  assert.ok(!('reply' in r.json));
  assert.equal(h.gemini.calls.length, 0);
  const human = await h.call('POST', '/api/chat/guest', { body: { message: 'connect me to customer care' } });
  assert.equal(human.status, 200);
  assert.equal(human.json.handoff, true);
});
