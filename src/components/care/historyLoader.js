import { createTimeout, linkSignals } from './chatApi.js';

export const HISTORY_TIMEOUT_MS = 12000;

/*
 * Loads the signed-in user's saved conversation and ALWAYS finishes in exactly one of two
 * states: HISTORY_LOADED or HISTORY_FAILED - on success, on error, on timeout and on abort.
 * It can therefore never leave the panel stuck on "Loading your conversation…".
 *
 * Results from a previous account are discarded by the reducer (epoch check), so it is safe
 * to always dispatch, even when the request was aborted because the account changed.
 */
export async function runHistoryLoad({ chatApi, dispatch, epoch, signal, timeoutMs = HISTORY_TIMEOUT_MS }) {
  const timeout = createTimeout(timeoutMs);
  const link = linkSignals(signal, timeout.signal);
  try {
    const messages = await chatApi.loadHistory({ signal: link.signal });
    dispatch({ type: 'HISTORY_LOADED', epoch, messages });
  } catch {
    dispatch({ type: 'HISTORY_FAILED', epoch });
  } finally {
    timeout.clear();
    link.dispose();
  }
}
