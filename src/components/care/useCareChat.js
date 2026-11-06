import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { api } from '../../services/api';
import { createChatApi, newRequestId, normalizeError } from './chatApi';
import { chatReducer, createInitialState, guestContext, scopeFor } from './chatState';
import { runHistoryLoad } from './historyLoader';

/*
 * Connects the pure chat state machine to the network and to the signed-in user.
 *
 * Privacy model
 *  - Signed in: messages live on the server, scoped to the verified session. The
 *    browser keeps them in memory only (no localStorage / sessionStorage / cookies).
 *  - Guest: nothing is stored anywhere; recent turns are held in memory and sent
 *    with each request.
 *  - Account switch or logout: `scope` changes, the state is reset synchronously
 *    during render (before anything of the old account can be painted) and any
 *    in-flight request is aborted. Late replies are also ignored by epoch.
 */
export function useCareChat({ user, enabled, panelOpen }) {
  const chatApi = useMemo(() => createChatApi(api), []);
  const scope = scopeFor(user);
  const signedIn = scope !== 'guest';

  const [state, dispatch] = useReducer(chatReducer, scope, (initialScope) => createInitialState(initialScope));
  if (state.scope !== scope) dispatch({ type: 'RESET', scope }); // adjust-state-during-render pattern

  const stateRef = useRef(state);
  const abortRef = useRef(null);
  const historyAbortRef = useRef(null);
  const counterRef = useRef(0);
  useEffect(() => { stateRef.current = state; });
  useEffect(() => () => { abortRef.current?.abort(); historyAbortRef.current?.abort(); }, [scope]); // account switch / unmount

  // Load saved history lazily: only once the panel is opened, never on page load.
  // IMPORTANT: this effect has no cleanup. Its own HISTORY_LOADING dispatch changes the values it
  // depends on, and a cleanup would then abort the very request it just started (leaving the
  // panel stuck on "Loading…"). Cancellation on account switch/unmount is handled by the
  // [scope] effect above; stale results are ignored by the reducer's epoch check.
  const needsHistory = enabled && panelOpen && signedIn && state.history === 'idle';
  useEffect(() => {
    if (!needsHistory) return;
    const epoch = state.epoch;
    const controller = new AbortController();
    historyAbortRef.current = controller;
    dispatch({ type: 'HISTORY_LOADING', epoch });
    runHistoryLoad({ chatApi, dispatch, epoch, signal: controller.signal });
  }, [needsHistory, state.epoch, chatApi]);

  const deliver = useCallback(async ({ id, text, requestId }) => {
    const epoch = stateRef.current.epoch;
    const context = signedIn ? undefined : guestContext(stateRef.current);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await chatApi.send({ signedIn, text, requestId, context, signal: controller.signal });
      dispatch({ type: 'SEND_SUCCEEDED', epoch, id, ...result });
    } catch (error) {
      if (controller.signal.aborted && stateRef.current.epoch !== epoch) return; // belongs to a previous account
      const normalized = normalizeError(error);
      // Development only: the server explains the real cause (bad key, retired model, quota…).
      if (import.meta.env?.DEV && normalized.debug) console.warn('[Aviana Care] server diagnostic:', normalized.debug);
      dispatch({ type: 'SEND_FAILED', epoch, id, error: normalized });
    }
  }, [chatApi, signedIn]);

  const send = useCallback((text) => {
    const clean = String(text || '').trim();
    const current = stateRef.current;
    if (!clean || current.sending || current.history === 'loading' || current.scope !== scope) return false;
    counterRef.current += 1;
    const id = `m${Date.now()}-${counterRef.current}`;
    const requestId = newRequestId();
    dispatch({ type: 'SEND_START', epoch: current.epoch, id, requestId, text: clean });
    deliver({ id, text: clean, requestId });
    return true;
  }, [deliver, scope]);

  const retry = useCallback((id) => {
    const current = stateRef.current;
    const message = current.messages.find((m) => m.id === id && m.status === 'failed');
    if (!message || current.sending) return;
    dispatch({ type: 'SEND_RETRY', epoch: current.epoch, id });
    deliver({ id, text: message.text, requestId: message.requestId });
  }, [deliver]);

  const clear = useCallback(async () => {
    const epoch = stateRef.current.epoch;
    try {
      if (signedIn) await chatApi.clearHistory();
      dispatch({ type: 'CLEARED', epoch });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', epoch, error: { ...normalizeError(error), message: 'We could not clear your chat history. Please try again.' } });
    }
  }, [chatApi, signedIn]);

  const submitTicket = useCallback(async (form) => {
    const epoch = stateRef.current.epoch;
    dispatch({ type: 'TICKET_SUBMITTING', epoch });
    try {
      const result = await chatApi.createTicket(form);
      dispatch({ type: 'TICKET_DONE', epoch, ...result });
      return true;
    } catch (error) {
      dispatch({ type: 'TICKET_FAILED', epoch, message: normalizeError(error).message });
      return false;
    }
  }, [chatApi]);

  return {
    state, signedIn, send, retry, clear, submitTicket,
    openSupport: () => dispatch({ type: 'SUPPORT_OPEN' }),
    closeSupport: () => dispatch({ type: 'SUPPORT_CLOSE' }),
    dismissError: () => dispatch({ type: 'DISMISS_ERROR' }),
    reloadHistory: () => dispatch({ type: 'RESET', scope }),
  };
}
