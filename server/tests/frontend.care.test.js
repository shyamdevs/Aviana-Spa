import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMobileBottomBar, isChatHiddenPath, normalizePath } from '../../src/components/care/visibility.js';
import { canSend, chatReducer, createInitialState, guestContext, scopeFor } from '../../src/components/care/chatState.js';
import { createChatApi, linkSignals, normalizeError, validateTicketForm } from '../../src/components/care/chatApi.js';

// ------------------------------------------------------------------ scenario 11: where the widget is hidden
test('11. widget is hidden on every auth screen and the entire admin area (case/slash variants too)', () => {
  const hidden = ['/login', '/register', '/forgot-password', '/reset-password', '/admin', '/admin/', '/admin/login', '/admin/users/123',
    '/admin/bookings/abc', '/Login', '/LOGIN/', '//login', '/reset-password?token=abc', '/forgot-password#x', '/signup', '/sign-in'];
  for (const path of hidden) assert.equal(isChatHiddenPath(path), true, path);
  const shown = ['/', '/services', '/services/swedish', '/booking', '/dashboard', '/dashboard/bookings', '/contact', '/therapists', '/administrator', '/loginhelp'];
  for (const path of shown) assert.equal(isChatHiddenPath(path), false, path);
  assert.equal(normalizePath('/A//B/'), '/a/b');
  assert.equal(hasMobileBottomBar('/booking'), true);
  assert.equal(hasMobileBottomBar('/services'), false);
});

// ------------------------------------------------------------------ scenario 4 (client side)
test('4. logout / account switch clears every message and ticket state', () => {
  let s = createInitialState('user:A');
  s = chatReducer(s, { type: 'HISTORY_LOADED', epoch: s.epoch, messages: [{ id: 'h1', role: 'user', text: 'A private message', status: 'sent' }] });
  s = chatReducer(s, { type: 'TICKET_DONE', epoch: s.epoch, reference: 'AVC-AAAAAAAA' });
  s = chatReducer(s, { type: 'SUPPORT_OPEN' });
  assert.equal(s.messages.length, 1);

  const loggedOut = chatReducer(s, { type: 'RESET', scope: 'guest' });
  assert.deepEqual(loggedOut.messages, []);
  assert.equal(loggedOut.ticket.status, 'idle');
  assert.equal(loggedOut.ticket.reference, null);
  assert.equal(loggedOut.supportOpen, false);
  assert.equal(loggedOut.scope, 'guest');
  assert.equal(JSON.stringify(loggedOut).includes('A private message'), false);

  const userB = chatReducer(loggedOut, { type: 'RESET', scope: 'user:B' });
  assert.deepEqual(userB.messages, []);
  assert.equal(userB.history, 'idle'); // B's history is fetched fresh from the server
});

test('4b. a late reply or history response from the previous account is ignored (epoch check)', () => {
  let s = createInitialState('user:A');
  const epochA = s.epoch;
  s = chatReducer(s, { type: 'SEND_START', epoch: epochA, id: 'm1', requestId: 'r1', text: 'question from A' });
  s = chatReducer(s, { type: 'RESET', scope: 'user:B' }); // account switched while A's request is in flight

  const afterReply = chatReducer(s, { type: 'SEND_SUCCEEDED', epoch: epochA, id: 'm1', reply: 'Answer meant for A', handoff: true, saved: true });
  assert.deepEqual(afterReply.messages, []);
  assert.equal(afterReply.supportOpen, false);
  assert.equal(chatReducer(s, { type: 'HISTORY_LOADED', epoch: epochA, messages: [{ id: 'x', role: 'user', text: 'A history', status: 'sent' }] }).messages.length, 0);
  assert.equal(chatReducer(s, { type: 'SEND_FAILED', epoch: epochA, id: 'm1', error: { message: 'x' } }).error, null);
  assert.equal(chatReducer(s, { type: 'TICKET_DONE', epoch: epochA, reference: 'AVC-AAAAAAAA' }).ticket.status, 'idle');
});

test('guest -> sign in: guest messages are not carried into the account (and vice versa)', () => {
  let s = createInitialState('guest');
  s = chatReducer(s, { type: 'SEND_START', epoch: s.epoch, id: 'g1', requestId: 'r', text: 'guest question' });
  s = chatReducer(s, { type: 'SEND_SUCCEEDED', epoch: s.epoch, id: 'g1', reply: 'guest answer', saved: false });
  assert.equal(guestContext(s).length, 2);
  s = chatReducer(s, { type: 'RESET', scope: 'user:A' });
  assert.equal(s.messages.length, 0);
  assert.deepEqual(guestContext(s), []);
});

// ------------------------------------------------------------------ duplicate prevention / failure handling
test('duplicate submissions are ignored while a request is in flight', () => {
  let s = createInitialState('guest');
  s = chatReducer(s, { type: 'SEND_START', epoch: 0, id: 'm1', requestId: 'r1', text: 'hello' });
  const again = chatReducer(s, { type: 'SEND_START', epoch: 0, id: 'm2', requestId: 'r2', text: 'hello again' });
  assert.equal(again.messages.length, 1);
  assert.equal(canSend(s, 'more text'), false);
  assert.equal(canSend(createInitialState('guest'), '   '), false);
  assert.equal(canSend(createInitialState('guest'), 'hi'), true);
});

test('failed send keeps the conversation, marks the message failed, and retry reuses the same requestId', () => {
  let s = createInitialState('user:A');
  s = chatReducer(s, { type: 'SEND_START', epoch: 0, id: 'm1', requestId: 'req-1', text: 'what is the price?' });
  s = chatReducer(s, { type: 'SEND_FAILED', epoch: 0, id: 'm1', error: { message: 'Aviana Care is temporarily unavailable.', retryable: true } });
  assert.equal(s.sending, false);
  assert.equal(s.messages[0].status, 'failed');
  assert.equal(s.messages[0].requestId, 'req-1');
  assert.equal(s.messages.some((m) => m.role === 'assistant'), false, 'an error must never be shown as an assistant reply');
  assert.deepEqual(guestContext(s), [], 'failed turns are not sent as context');

  s = chatReducer(s, { type: 'SEND_RETRY', epoch: 0, id: 'm1' });
  assert.equal(s.messages[0].status, 'sending');
  s = chatReducer(s, { type: 'SEND_SUCCEEDED', epoch: 0, id: 'm1', reply: 'It costs ₹2,000.', handoff: false, saved: true });
  assert.deepEqual(s.messages.map((m) => [m.role, m.status]), [['user', 'sent'], ['assistant', 'sent']]);
});

test('handoff opens the support form; unsaved replies show an honest notice', () => {
  let s = createInitialState('user:A');
  s = chatReducer(s, { type: 'SEND_START', epoch: 0, id: 'm1', requestId: 'r', text: 'complaint' });
  s = chatReducer(s, { type: 'SEND_SUCCEEDED', epoch: 0, id: 'm1', reply: 'Sorry about that.', handoff: true, saved: false });
  assert.equal(s.supportOpen, true);
  assert.match(s.notice, /not saved/);
});

test('history load keeps only server messages first and never duplicates in-flight ones', () => {
  let s = createInitialState('user:A');
  s = chatReducer(s, { type: 'HISTORY_LOADING', epoch: 0 });
  assert.equal(canSend(s, 'hi'), false, 'cannot send while history is loading');
  s = chatReducer(s, { type: 'HISTORY_LOADED', epoch: 0, messages: [{ id: 'a', role: 'user', text: 'old', status: 'sent' }] });
  assert.equal(s.history, 'ready');
  assert.equal(canSend(s, 'hi'), true);
});

test('ticket lifecycle: submitting -> done shows the reference; failure never shows one', () => {
  let s = createInitialState('guest');
  s = chatReducer(s, { type: 'TICKET_SUBMITTING', epoch: 0 });
  s = chatReducer(s, { type: 'TICKET_FAILED', epoch: 0, message: 'Network down' });
  assert.equal(s.ticket.status, 'error');
  assert.equal(s.ticket.reference, null);
  s = chatReducer(s, { type: 'TICKET_DONE', epoch: 0, reference: 'AVC-1A2B3C4D', duplicate: false });
  assert.equal(s.ticket.reference, 'AVC-1A2B3C4D');
  s = chatReducer(s, { type: 'SUPPORT_CLOSE' });
  assert.equal(s.ticket.status, 'idle');
});

test('scopeFor distinguishes accounts and guests', () => {
  assert.equal(scopeFor(null), 'guest');
  assert.equal(scopeFor({ _id: 'a1' }), 'user:a1');
  assert.equal(scopeFor({ id: 'b2' }), 'user:b2');
  assert.notEqual(scopeFor({ _id: 'a1' }), scopeFor({ _id: 'b2' }));
});

// ------------------------------------------------------------------ API layer
function fakeApi(handlers = {}) {
  const calls = [];
  const rec = (method) => async (path, a, b) => { calls.push({ method, path, a, b }); const key = `${method} ${path}`; return key in handlers ? handlers[key](a, b) : { success: true, reply: 'ok', saved: true }; };
  return { calls, api: { get: rec('GET'), post: rec('POST'), delete: rec('DELETE') } };
}

test('signed-in chat uses the private endpoint with requestId; guests use the stateless one with context only', async () => {
  const { api, calls } = fakeApi();
  const chat = createChatApi(api);
  await chat.send({ signedIn: true, text: 'hi', requestId: 'req-1', context: undefined });
  await chat.send({ signedIn: false, text: 'hi', requestId: 'req-2', context: [{ role: 'user', content: 'earlier' }] });
  assert.equal(calls[0].path, '/chat');
  assert.deepEqual(calls[0].a, { message: 'hi', requestId: 'req-1' });
  assert.equal(calls[1].path, '/chat/guest');
  assert.deepEqual(calls[1].a, { message: 'hi', history: [{ role: 'user', content: 'earlier' }] });
  assert.ok(calls[0].b.signal instanceof AbortSignal);
});

test('an empty or unsuccessful response is an error, never a fabricated reply', async () => {
  for (const payload of [{ success: true, reply: '' }, { success: true }, { success: false, reply: 'x' }, null]) {
    const chat = createChatApi(fakeApi({ 'POST /chat/guest': () => payload }).api);
    await assert.rejects(() => chat.send({ signedIn: false, text: 'x', requestId: 'r', context: [] }));
  }
});

test('ticket creation requires a reference in the response', async () => {
  const chat = createChatApi(fakeApi({ 'POST /support-tickets': () => ({ success: true }) }).api);
  await assert.rejects(() => chat.createTicket({ name: 'A B', contact: 'a@b.co', message: '' }));
  const ok = createChatApi(fakeApi({ 'POST /support-tickets': () => ({ success: true, reference: 'AVC-1A2B3C4D', duplicate: true }) }).api);
  assert.deepEqual(await ok.createTicket({ name: 'A B', contact: 'a@b.co', message: '' }), { reference: 'AVC-1A2B3C4D', duplicate: true });
});

test('history is mapped defensively (unknown roles and non-strings dropped)', async () => {
  const chat = createChatApi(fakeApi({ 'GET /chat/history': () => ({ messages: [
    { id: '1', role: 'user', content: 'hi' }, { id: '2', role: 'system', content: 'evil' }, { id: '3', role: 'assistant', content: { $ne: 1 } }, { id: '4', role: 'assistant', content: '<img src=x onerror=alert(1)>' },
  ] }) }).api);
  const out = await chat.loadHistory();
  assert.deepEqual(out.map((m) => m.id), ['1', '4']);
  assert.equal(out[1].text, '<img src=x onerror=alert(1)>'); // kept verbatim as TEXT; React escapes it on render
});

test('normalizeError: friendly, safe messages; 5xx server text is never shown; 401 is flagged', () => {
  assert.match(normalizeError(Object.assign(new Error('x'), { status: 0 })).message, /could not reach/i);
  assert.equal(normalizeError(Object.assign(new Error('boom: stack at db.js:1'), { status: 500, data: {} })).message.includes('boom'), false);
  const unauth = normalizeError(Object.assign(new Error('x'), { status: 401 }));
  assert.equal(unauth.unauthorized, true);
  assert.equal(unauth.retryable, false);
  const limited = normalizeError(Object.assign(new Error('x'), { status: 429, data: { message: 'Slow down' } }));
  assert.equal(limited.retryable, true);
  assert.equal(normalizeError(Object.assign(new Error('x'), { status: 503, data: { handoffSuggested: true } })).handoffSuggested, true);
  assert.equal(normalizeError(Object.assign(new Error('x'), { status: 400, data: { message: 'Too long' } })).retryable, false);
});

test('linkSignals aborts when either source aborts and cleans up listeners', () => {
  const a = new AbortController(); const b = new AbortController();
  const linked = linkSignals(a.signal, b.signal);
  assert.equal(linked.signal.aborted, false);
  b.abort();
  assert.equal(linked.signal.aborted, true);
  linked.dispose();
  assert.equal(linkSignals(a.signal, AbortSignal.abort()).signal.aborted, true);
});

test('client ticket validation mirrors the server rules', () => {
  assert.deepEqual(validateTicketForm({ name: 'Asha Verma', contact: 'asha@example.com', message: '' }), {});
  assert.deepEqual(validateTicketForm({ name: 'Asha', contact: '+91 98765 43210', message: '' }), {});
  const errs = validateTicketForm({ name: 'A', contact: 'nope', message: 'x'.repeat(1001) });
  assert.deepEqual(Object.keys(errs).sort(), ['contact', 'message', 'name']);
});

// ------------------------------------------------------------------ "Loading your conversation…" must never get stuck
import { runHistoryLoad } from '../../src/components/care/historyLoader.js';

const collect = () => { const actions = []; return { actions, dispatch: (a) => actions.push(a) }; };

test('history load: success dispatches HISTORY_LOADED with the messages', async () => {
  const { actions, dispatch } = collect();
  const msgs = [{ id: '1', role: 'user', text: 'hi', status: 'sent' }];
  await runHistoryLoad({ chatApi: { loadHistory: async () => msgs }, dispatch, epoch: 3 });
  assert.deepEqual(actions, [{ type: 'HISTORY_LOADED', epoch: 3, messages: msgs }]);
});

test('history load: server error ends as HISTORY_FAILED (not stuck)', async () => {
  const { actions, dispatch } = collect();
  await runHistoryLoad({ chatApi: { loadHistory: async () => { throw Object.assign(new Error('x'), { status: 500 }); } }, dispatch, epoch: 1 });
  assert.deepEqual(actions, [{ type: 'HISTORY_FAILED', epoch: 1 }]);
});

test('history load: a request that never answers is cut off by the timeout and ends as HISTORY_FAILED', async () => {
  const { actions, dispatch } = collect();
  const hang = ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const started = Date.now();
  await runHistoryLoad({ chatApi: { loadHistory: hang }, dispatch, epoch: 1, timeoutMs: 60 });
  assert.deepEqual(actions, [{ type: 'HISTORY_FAILED', epoch: 1 }]);
  assert.ok(Date.now() - started < 1000);
});

test('history load: REGRESSION - an aborted request still terminates (the old code swallowed aborts and stayed "loading" forever)', async () => {
  const { actions, dispatch } = collect();
  const controller = new AbortController();
  const hang = ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const pending = runHistoryLoad({ chatApi: { loadHistory: hang }, dispatch, epoch: 7, signal: controller.signal, timeoutMs: 5000 });
  controller.abort();
  await pending;
  assert.deepEqual(actions, [{ type: 'HISTORY_FAILED', epoch: 7 }]);
});

test('history state machine: loading -> loaded unblocks the composer; loading -> failed also unblocks it and offers retry', () => {
  let s = createInitialState('user:A');
  s = chatReducer(s, { type: 'HISTORY_LOADING', epoch: 0 });
  assert.equal(canSend(s, 'hi'), false);
  const failed = chatReducer(s, { type: 'HISTORY_FAILED', epoch: 0 });
  assert.equal(failed.history, 'error');
  assert.equal(canSend(failed, 'hi'), true, 'a failed history load must not block chatting');
  const loaded = chatReducer(s, { type: 'HISTORY_LOADED', epoch: 0, messages: [] });
  assert.equal(loaded.history, 'ready');
  // A late result from a previous account is ignored, and cannot un-stick or corrupt the new account either.
  const other = chatReducer(s, { type: 'RESET', scope: 'user:B' });
  assert.equal(chatReducer(other, { type: 'HISTORY_LOADED', epoch: 0, messages: [{ id: 'x', role: 'user', text: 'A', status: 'sent' }] }).messages.length, 0);
  // Loading the same history twice (e.g. React StrictMode double effects) does not duplicate messages.
  const m = [{ id: 'h', role: 'user', text: 'old', status: 'sent' }];
  let twice = chatReducer(s, { type: 'HISTORY_LOADED', epoch: 0, messages: m });
  twice = chatReducer(twice, { type: 'HISTORY_LOADED', epoch: 0, messages: m });
  assert.equal(twice.messages.length, 1);
});
