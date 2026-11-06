/*
 * Pure state machine for the care chat. No React, no network: it can be unit tested.
 *
 * Account isolation lives here: every async result carries the `epoch` it was
 * started in, and RESET (account switch / logout) bumps the epoch, so a late reply
 * from a previous account is ignored instead of landing in the new account's chat.
 */
export const MAX_GUEST_CONTEXT = 8;

export function createInitialState(scope = 'guest', epoch = 0) {
  return {
    scope, epoch,
    messages: [],            // { id, role: 'user'|'assistant', text, status: 'sent'|'sending'|'failed', requestId? }
    history: 'idle',         // idle | loading | ready | error
    sending: false,
    error: null,             // { message, retryable, handoffSuggested, code }
    notice: null,
    supportOpen: false,
    ticket: { status: 'idle', reference: null, duplicate: false, message: null },
  };
}

const isCurrent = (state, action) => action.epoch === state.epoch;
const setMessage = (messages, id, patch) => messages.map((m) => (m.id === id ? { ...m, ...patch } : m));

export function chatReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return createInitialState(action.scope, state.epoch + 1);

    case 'HISTORY_LOADING':
      return isCurrent(state, action) ? { ...state, history: 'loading', error: null } : state;
    case 'HISTORY_LOADED':
      if (!isCurrent(state, action)) return state;
      return { ...state, history: 'ready', messages: [...action.messages, ...state.messages.filter((m) => m.status !== 'sent')] };
    case 'HISTORY_FAILED':
      return isCurrent(state, action) ? { ...state, history: 'error' } : state;

    case 'SEND_START':
      if (!isCurrent(state, action) || state.sending) return state; // duplicate-submit guard
      return {
        ...state, sending: true, error: null, notice: null,
        messages: [...state.messages, { id: action.id, role: 'user', text: action.text, status: 'sending', requestId: action.requestId }],
      };
    case 'SEND_RETRY':
      if (!isCurrent(state, action) || state.sending) return state;
      return { ...state, sending: true, error: null, notice: null, messages: setMessage(state.messages, action.id, { status: 'sending' }) };
    case 'SEND_SUCCEEDED':
      if (!isCurrent(state, action)) return state;
      return {
        ...state, sending: false, error: null,
        notice: action.saved === false ? 'This reply was not saved to your account history.' : null,
        supportOpen: state.supportOpen || action.handoff === true,
        messages: [...setMessage(state.messages, action.id, { status: 'sent' }), { id: `${action.id}-reply`, role: 'assistant', text: action.reply, status: 'sent' }],
      };
    case 'SEND_FAILED':
      if (!isCurrent(state, action)) return state;
      return { ...state, sending: false, error: action.error, messages: setMessage(state.messages, action.id, { status: 'failed' }) };
    case 'SET_ERROR':
      return isCurrent(state, action) ? { ...state, error: action.error } : state;
    case 'DISMISS_ERROR':
      return { ...state, error: null };

    case 'CLEARED':
      return isCurrent(state, action) ? { ...createInitialState(state.scope, state.epoch), history: 'ready' } : state;

    case 'SUPPORT_OPEN':
      return { ...state, supportOpen: true };
    case 'SUPPORT_CLOSE':
      return { ...state, supportOpen: false, ticket: state.ticket.status === 'submitting' ? state.ticket : createInitialState().ticket };
    case 'TICKET_SUBMITTING':
      return isCurrent(state, action) ? { ...state, ticket: { status: 'submitting', reference: null, duplicate: false, message: null } } : state;
    case 'TICKET_DONE':
      return isCurrent(state, action) ? { ...state, ticket: { status: 'done', reference: action.reference, duplicate: action.duplicate === true, message: null } } : state;
    case 'TICKET_FAILED':
      return isCurrent(state, action) ? { ...state, ticket: { status: 'error', reference: null, duplicate: false, message: action.message } } : state;

    default:
      return state;
  }
}

/** Recent, successfully exchanged turns for GUEST requests (kept only in memory). */
export function guestContext(state, limit = MAX_GUEST_CONTEXT) {
  return state.messages
    .filter((m) => m.status === 'sent')
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.text }));
}

export const canSend = (state, draft) => !state.sending && state.history !== 'loading' && draft.trim().length > 0;

export function scopeFor(user) {
  return user?._id || user?.id ? `user:${user._id || user.id}` : 'guest';
}
