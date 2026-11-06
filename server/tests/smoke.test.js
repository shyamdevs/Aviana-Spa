import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';

test('smoke: guest chat works end to end against the real app and real SDK', async () => {
  const h = await startHarness();
  try {
    const r = await h.call('POST', '/api/chat/guest', { body: { message: 'How much is Swedish Massage?' } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.reply, 'Test reply from Aviana Care.');
    assert.equal(h.gemini.calls.length, 1);
  } finally { await h.close(); }
});
