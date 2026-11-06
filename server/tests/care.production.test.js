import './support/prodEnv.js';
import './support/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });

test('PRODUCTION: failures expose no diagnostic fields, upstream text or key material', async () => {
  h.gemini.script = () => ({ status: 400, message: 'API key not valid AIzaSyA1234567890abcdefghijklmnopqrstuvwx internal-detail', apiStatus: 'INVALID_ARGUMENT' });
  const r = await h.call('POST', '/api/chat/guest', { body: { message: 'hello' } });
  assert.equal(r.status, 503);
  assert.equal(r.json.code, 'AI_UNAVAILABLE');
  assert.ok(!('debug' in r.json));
  for (const secret of ['internal-detail', 'AIza', 'API key not valid', process.env.GEMINI_API_KEY]) assert.ok(!r.text.includes(secret), secret);
});
