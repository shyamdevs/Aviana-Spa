/*
 * Network layer for the care chat. Takes the app's `api` client as a parameter so it
 * can be tested without a browser.
 *
 *   signed in -> POST /chat (server-side saved history, scoped to the session)
 *   guest     -> POST /chat/guest (nothing stored; recent turns are sent from memory)
 */
export const REQUEST_TIMEOUT_MS = 25000;

/** A cancellable timeout: `signal` aborts after `ms`; call `clear()` when the request has finished. */
export function createTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function newRequestId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Cancels on either signal, without relying on AbortSignal.any (older browsers). */
export function linkSignals(...signals) {
  const controller = new AbortController();
  const cleanups = [];
  for (const signal of signals.filter(Boolean)) {
    if (signal.aborted) { controller.abort(); break; }
    const onAbort = () => controller.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    cleanups.push(() => signal.removeEventListener('abort', onAbort));
  }
  return { signal: controller.signal, dispose: () => cleanups.forEach((fn) => fn()) };
}

/** Converts any thrown value into a safe, user-presentable error. Never shows raw server text for 5xx. */
export function normalizeError(error) {
  const status = Number(error?.status) || 0;
  const data = error?.data || {};
  const code = data.code || (status === 0 ? 'NETWORK' : 'ERROR');
  const base = { code, status, retryable: true, handoffSuggested: data.handoffSuggested === true, unauthorized: status === 401, debug: data.debug };

  if (status === 0) return { ...base, message: 'We could not reach Aviana Care. Please check your connection and try again.' };
  if (status === 401) return { ...base, retryable: false, message: 'Your session has ended. Please sign in again to continue your saved chat.' };
  if (status === 429) return { ...base, message: data.message || 'You are sending messages too quickly. Please wait a moment and try again.' };
  if (status === 409) return { ...base, message: 'Please wait for the previous reply before sending another message.' };
  if (status === 400 || status === 413 || status === 415) {
    return { ...base, retryable: false, message: data.message || 'That message could not be sent. Please shorten or rephrase it.' };
  }
  if (status === 503) return { ...base, message: data.message || 'Aviana Care is temporarily unavailable. Please try again, or contact our team.' };
  return { ...base, message: 'Something went wrong on our side. Please try again, or contact our team.' };
}

export function createChatApi(api) {
  return {
    async send({ signedIn, text, requestId, context, signal }) {
      const timeout = createTimeout(REQUEST_TIMEOUT_MS);
      const link = linkSignals(signal, timeout.signal);
      try {
        const data = signedIn
          ? await api.post('/chat', { message: text, requestId }, { signal: link.signal })
          : await api.post('/chat/guest', { message: text, history: context }, { signal: link.signal });
        const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
        if (!data?.success || !reply) {
          const error = new Error('Empty reply');
          error.status = 503;
          throw error;
        }
        return { reply, handoff: data.handoff === true, saved: data.saved !== false };
      } finally {
        timeout.clear();
        link.dispose();
      }
    },

    async loadHistory({ signal } = {}) {
      const data = await api.get('/chat/history', { signal });
      return (Array.isArray(data?.messages) ? data.messages : [])
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m, i) => ({ id: m.id || `h${i}`, role: m.role, text: m.content, status: 'sent' }));
    },

    clearHistory: () => api.delete('/chat/history'),

    async createTicket({ name, contact, message }) {
      const data = await api.post('/support-tickets', { name, contact, message });
      if (!data?.success || !data.reference) throw Object.assign(new Error('No reference returned'), { status: 500 });
      return { reference: data.reference, duplicate: data.duplicate === true };
    },
  };
}

// ---------------------------------------------------------------- client-side ticket validation (mirrors the server)
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export function validateTicketForm({ name, contact, message }) {
  const errors = {};
  const n = String(name || '').trim();
  const c = String(contact || '').trim();
  if (n.length < 2) errors.name = 'Please enter your name.';
  else if (/[<>]/.test(n)) errors.name = 'Please use letters only in your name.';
  const digits = c.replace(/[\s().-]/g, '');
  if (!c) errors.contact = 'Please enter an email address or phone number.';
  else if (!(c.includes('@') ? EMAIL.test(c) : /^(\+|00)?\d{10,15}$/.test(digits))) errors.contact = 'Enter a valid email address or phone number.';
  if (String(message || '').length > 1000) errors.message = 'Please keep your message under 1000 characters.';
  return errors;
}
