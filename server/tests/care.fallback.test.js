import './support/fallbackEnv.js';
import './support/env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './support/harness.js';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });
beforeEach(() => h.reset());

const guest = (m) => h.call('POST', '/api/chat/guest', { body: { message: m } });
const modelOf = (call) => call.url.match(/models\/([^:]+):/)[1];

test('a retired/unknown GEMINI_MODEL no longer breaks chat: it falls back to the next model', async () => {
  h.gemini.script = ({ model }) => (model === 'retired-model-x'
    ? { status: 404, message: 'models/retired-model-x is not found for API version v1beta', apiStatus: 'NOT_FOUND' }
    : undefined);
  const r = await guest('hello');
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(h.gemini.calls.map(modelOf), ['retired-model-x', 'gemini-3.5-flash-lite']);
});

test('quota exhausted (no free tier / limit: 0) on one model moves on to the next', async () => {
  h.gemini.script = ({ model }) => (model !== 'gemini-flash-lite-latest'
    ? { status: 429, message: 'You exceeded your current quota, limit: 0', apiStatus: 'RESOURCE_EXHAUSTED' }
    : undefined);
  const r = await guest('hello');
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([...new Set(h.gemini.calls.map(modelOf))], ['retired-model-x', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest']);
});

test('if every model fails the customer gets an honest 503 and the dev diagnostic names the cause', async () => {
  h.gemini.script = () => ({ status: 404, message: 'model not found', apiStatus: 'NOT_FOUND' });
  const r = await guest('hello');
  assert.equal(r.status, 503);
  assert.equal(r.json.debug.kind, 'model_unavailable');
  assert.ok(!('reply' in r.json));
  assert.equal(h.gemini.calls.length, 3);
});

test('an invalid API key stops immediately instead of trying every model', async () => {
  h.gemini.script = () => ({ status: 400, message: 'API key not valid. Please pass a valid API key.', apiStatus: 'INVALID_ARGUMENT' });
  const r = await guest('hello');
  assert.equal(r.status, 503);
  assert.equal(r.json.debug.kind, 'auth');
  assert.equal(h.gemini.calls.length, 1);
});
