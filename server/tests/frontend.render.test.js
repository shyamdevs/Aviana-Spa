import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./support/jsxLoader.mjs', import.meta.url);

const root = '../../src/components/care/';
const { createElement: h } = await import('react');
const { renderToStaticMarkup: renderBare } = await import('react-dom/server');
const { StaticRouter } = await import('react-router-dom');
// Components now contain router <Link>s, so every render happens inside a router.
const renderToStaticMarkup = (element) => renderBare(h(StaticRouter, { location: '/' }, element));
const { default: ChatPanel } = await import(`${root}ChatPanel.jsx`);
const { default: MessageBubble, TypingIndicator } = await import(`${root}MessageBubble.jsx`);
const { default: SupportTicketForm } = await import(`${root}SupportTicketForm.jsx`);
const { createInitialState } = await import(`${root}chatState.js`);

const noop = () => {};
const makeChat = (patch = {}, signedIn = false) => ({
  state: { ...createInitialState(signedIn ? 'user:a' : 'guest'), ...patch },
  signedIn, send: noop, retry: noop, clear: noop, submitTicket: noop, openSupport: noop, closeSupport: noop, dismissError: noop, reloadHistory: noop,
});
const render = (chat, user = null) => renderToStaticMarkup(h(ChatPanel, { chat, user, onClose: noop, inputRef: { current: null }, bottomOffsetClass: 'bottom-2' }));

test('panel: accessible dialog, labelled controls, welcome message and suggested questions', () => {
  const html = render(makeChat());
  assert.match(html, /role="dialog"[^>]*aria-label="Aviana Care chat"/);
  assert.match(html, /aria-label="Close chat"/);
  assert.match(html, /<label[^>]*for="care-input"[^>]*>Message to Aviana Care<\/label>/);
  assert.match(html, /id="care-input"/);
  assert.match(html, /role="log"[^>]*aria-live="polite"/);
  assert.match(html, /aria-label="Send message"[^>]*disabled|disabled[^>]*aria-label="Send message"/, 'send is disabled for an empty draft');
  assert.match(html, /Welcome to Aviana Spa/);
  for (const q of ['What services do you offer?', 'How do I book a massage?', 'Do you offer home service?', 'Mujhe price list batao']) assert.ok(html.includes(q), q);
  assert.match(html, /Guest · this chat is not saved/);
  assert.match(html, /Talk to our team/);
  assert.doesNotMatch(html, /Clear conversation/, 'no clear button on an empty chat');
});

test('panel: signed-in header names the account and states that chat is saved', () => {
  const html = render(makeChat({}, true), { fullName: 'Asha' });
  assert.match(html, /Signed in as Asha · chat saved to your account/);
});

test('panel: model text is rendered as escaped plain text, never as HTML', () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const html = render(makeChat({ messages: [
    { id: '1', role: 'user', text: 'hi', status: 'sent' }, { id: '2', role: 'assistant', text: evil, status: 'sent' },
  ] }));
  assert.ok(!html.includes('<img src=x'), 'raw <img> must not appear');
  assert.ok(!html.includes('<script>alert'), 'raw <script> must not appear');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.match(html, /Clear conversation/);
});

test('panel: typing indicator while sending; failed message shows Retry; errors are announced', () => {
  const sending = render(makeChat({ sending: true, messages: [{ id: '1', role: 'user', text: 'hello', status: 'sending' }] }));
  assert.match(sending, /role="status" aria-label="Aviana Care is typing"/);

  const failed = render(makeChat({
    messages: [{ id: '1', role: 'user', text: 'price?', status: 'failed', requestId: 'r' }],
    error: { message: 'Aviana Care is temporarily unavailable.', retryable: true, handoffSuggested: true },
  }));
  assert.match(failed, /Not sent/);
  assert.match(failed, />\s*Retry\s*</);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Contact our team/);
  assert.doesNotMatch(failed, /Welcome to Aviana Spa/);
});

test('panel: loading and history-error states; support form replaces the composer when open', () => {
  assert.match(render(makeChat({ history: 'loading' }, true)), /Loading your conversation…/);
  assert.match(render(makeChat({ history: 'error' }, true)), /couldn&#x27;t load your earlier messages|couldn't load your earlier messages/);
  const support = render(makeChat({ supportOpen: true }));
  assert.match(support, /<form[^>]*aria-label="Contact customer care"/);
  assert.doesNotMatch(support, /id="care-input"/);
});

test('ticket form: labelled fields, 16px mobile inputs, optional message; success shows the reference', () => {
  const idle = renderToStaticMarkup(h(SupportTicketForm, { ticket: { status: 'idle' }, onSubmit: noop, onClose: noop, defaultName: 'Asha' }));
  assert.match(idle, /Your name/); assert.match(idle, /Email or phone number/); assert.match(idle, /\(optional\)/);
  assert.match(idle, /value="Asha"/);
  assert.match(idle, /text-\[16px\]/);

  const done = renderToStaticMarkup(h(SupportTicketForm, { ticket: { status: 'done', reference: 'AVC-1A2B3C4D', duplicate: false }, onSubmit: noop, onClose: noop }));
  assert.match(done, /Request received/);
  assert.match(done, /AVC-1A2B3C4D/);
  assert.match(done, /role="status"/);

  const failed = renderToStaticMarkup(h(SupportTicketForm, { ticket: { status: 'error', message: 'Could not reach us.' }, onSubmit: noop, onClose: noop }));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Nothing was submitted/);
  assert.doesNotMatch(failed, /AVC-/, 'a failed submission must never show a reference');
});

test('bubble + typing indicator render without errors', () => {
  assert.match(renderToStaticMarkup(h(MessageBubble, { message: { id: '1', role: 'assistant', text: 'Hello', status: 'sent' }, onRetry: noop })), /Aviana Care/);
  assert.match(renderToStaticMarkup(h(TypingIndicator)), /care-dot/);
});

// ------------------------------------------------------------------ the real CustomerCare component, per route
const { default: CustomerCare } = await import('../../src/components/CustomerCare.jsx');

const at = (location, auth = { user: null, loading: false }) => {
  globalThis.__fakeAuth = auth;
  return renderBare(h(StaticRouter, { location }, h(CustomerCare)));
};

test('11. CustomerCare renders NOTHING on auth screens and admin pages, and a launcher elsewhere', () => {
  for (const path of ['/login', '/register', '/forgot-password', '/reset-password', '/reset-password?token=abc', '/admin', '/admin/', '/admin/login', '/admin/users', '/admin/bookings/123', '/LOGIN/']) {
    assert.equal(at(path), '', `must be hidden at ${path}`);
  }
  for (const path of ['/', '/services', '/services/swedish-massage', '/dashboard', '/dashboard/bookings', '/contact', '/booking']) {
    const html = at(path);
    assert.match(html, /aria-label="Open Aviana Care chat"/, `launcher at ${path}`);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.doesNotMatch(html, /role="dialog"/, 'panel is closed until the visitor opens it (no intrusive popup)');
  }
});

test('CustomerCare waits for the auth check to finish before showing, and works signed in', () => {
  assert.equal(at('/', { user: null, loading: true }), '');
  assert.match(at('/', { user: { _id: 'u1', fullName: 'Asha' }, loading: false }), /Open Aviana Care chat/);
});

test('launcher clears the mobile booking action bar on /booking but sits normally elsewhere', () => {
  assert.match(at('/booking'), /bottom-\[calc\(7\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(at('/services'), /7\.5rem/);
  assert.match(at('/services'), /z-\[45\]/, 'below navbar, dialogs and Razorpay; above page content');
});

// ------------------------------------------------------------------ professional touches
const { parseRichText, parseInline } = await import(`${root}richText.js`);

test('rich text: only whitelisted internal routes become links; everything else stays plain text', () => {
  const links = (t) => parseInline(t).filter((p) => p.type === 'link').map((p) => p.to);
  assert.deepEqual(links('Please visit /booking to reserve, or see /services/swedish-massage.'), ['/booking', '/services/swedish-massage']);
  assert.deepEqual(links('Check My bookings at /dashboard/bookings now'), ['/dashboard/bookings']);
  assert.deepEqual(links('open https://evil.example/services now'), [], 'a path inside a URL is not a link');
  assert.deepEqual(links('use and/or booking'), []);
  assert.deepEqual(links('go to /admin/users or /unknown'), [], 'admin and unknown paths are never linked');
  assert.deepEqual(links('javascript:alert(1) /login!'), ['/login']);
});

test('rich text: bullet lists and paragraphs are parsed; blank lines dropped', () => {
  const blocks = parseRichText('We offer:\n- Swedish (60 min)\n- Deep Tissue (90 min)\n\nBook at /booking');
  assert.deepEqual(blocks.map((b) => b.type), ['p', 'ul', 'p']);
  assert.equal(blocks[1].items.length, 2);
});

test('assistant replies render links, lists and quick actions - and hostile text stays inert', () => {
  const reply = 'Here are our options:\n- Swedish Massage (60 min)\n- Hot Stone Therapy\nYou can book at /booking.\n<script>alert(1)</script> [click](javascript:alert(2))';
  const html = render(makeChat({ messages: [{ id: '1', role: 'user', text: 'services?', status: 'sent' }, { id: '2', role: 'assistant', text: reply, status: 'sent' }] }));
  assert.match(html, /<ul[^>]*>.*<li>.*Swedish Massage \(60 min\).*<\/li>/s);
  assert.match(html, /<a [^>]*href="\/booking"[^>]*>booking page<\/a>/);
  assert.ok(!html.includes('<script>alert'), 'no raw script tag');
  assert.ok(!/<a [^>]*href="javascript:/.test(html), 'no javascript: links');
  assert.match(html, /aria-label="Quick actions"/);
  assert.match(html, /Book now/); assert.match(html, /View services/);
});

test('quick actions are hidden while sending, when the support form is open, and on the empty welcome screen', () => {
  const msgs = [{ id: '1', role: 'user', text: 'hi', status: 'sent' }, { id: '2', role: 'assistant', text: 'Hello!', status: 'sent' }];
  assert.match(render(makeChat({ messages: msgs })), /Quick actions/);
  assert.doesNotMatch(render(makeChat({ messages: msgs, sending: true })), /Quick actions/);
  assert.doesNotMatch(render(makeChat({ messages: msgs, supportOpen: true })), /Quick actions/);
  assert.doesNotMatch(render(makeChat()), /Quick actions/);
});

test('panel shows a personal greeting, the AI-assistant label and a confirm-with-the-team disclaimer', () => {
  const html = render(makeChat({}, true), { fullName: 'Asha Verma' });
  assert.match(html, /Hi Asha, welcome to Aviana Spa/);
  assert.match(html, /AI assistant · Aviana Spa/);
  assert.match(html, /please confirm bookings, payments and important details with our team/);
  assert.match(render(makeChat()), /Welcome to Aviana Spa/);
});
