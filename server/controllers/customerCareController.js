import SupportTicket from '../models/SupportTicket.js';
import { aiConfig } from '../config/ai.js';
import { buildSystemInstruction, buildContents, cannedReply, finalizeReply, looksLikeInjection, wantsHumanSupport } from '../utils/aiPrompt.js';
import { getCatalogSnapshot, renderCatalog } from '../utils/chatCatalog.js';
import { ADVICE, AiError, generateReply, redact } from '../utils/gemini.js';
import { recordChat } from '../utils/aiMetrics.js';
import { consumeAiBudget } from '../utils/rateLimiters.js';
import { appendTurn, deleteConversation, findCompletedReply, loadRecentMessages } from '../utils/chatStore.js';
import { createTicket, notifyStaff } from '../utils/supportTickets.js';
import {
  assertBodyObject, validateGuestHistory, validateMessage, validateRequestId,
  validateTicketContact, validateTicketMessage, validateTicketName, validateTicketReference,
} from '../validators/chat.js';

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra });
}

/** Maps validation errors to 4xx JSON; anything unexpected becomes a generic 500. */
const handler = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error?.status >= 400 && error.status < 500 && error.code !== 11000) {
      return fail(res, error.status, error.code || 'INVALID_REQUEST', error.message);
    }
    console.error('[care] unexpected error:', error?.name || 'error', error?.code || '');
    return fail(res, 500, 'SERVER_ERROR', 'Something went wrong. Please try again.');
  }
};

const AI_DOWN = 'Aviana Care is taking longer than usual to respond. Please try again, or contact our team.';

/** Wraps anything thrown while producing a reply as an AiError, logging the real cause server-side. */
function asAiError(error) {
  if (error instanceof AiError) return error;
  const detail = `${error?.name || 'Error'}: ${redact(error?.message, 200)}`;
  console.error(`[care] unexpected failure while producing a reply: ${detail}`);
  return new AiError('unknown', { detail });
}

// Customers only ever see a generic message. In development (NODE_ENV !== 'production') the
// response also carries the real reason, so a misconfiguration is visible in the browser console.
function aiFailure(res, error) {
  const debug = process.env.NODE_ENV === 'production' ? {} : {
    debug: { kind: error.kind, status: error.upstreamStatus ?? null, model: error.model ?? null, detail: error.detail ?? null, advice: ADVICE[error.kind] ?? null },
  };
  if (error.kind === 'busy') {
    return fail(res, 503, 'AI_BUSY', 'Aviana Care is very busy right now. Please try again in a moment.', { retryable: true, ...debug });
  }
  return fail(res, 503, 'AI_UNAVAILABLE', AI_DOWN, { retryable: true, handoffSuggested: true, ...debug });
}

/**
 * Produces one assistant reply. Never touches persistence and never sees anything
 * except the (untrusted) message/history and the public catalogue.
 */
async function produceReply({ message, history }) {
  if (looksLikeInjection(message)) {
    return { reply: cannedReply('refuse', message), handoff: false, outcome: 'refused_injection' };
  }
  if (wantsHumanSupport(message)) {
    return { reply: cannedReply('handoff', message), handoff: true, outcome: 'handoff' };
  }
  if (!aiConfig.apiKey) throw new AiError('not_configured');
  if (!(await consumeAiBudget())) throw new AiError('busy', { retryable: true });

  // Prompt building must never take the chat down: if it fails, the model is told to not guess.
  let catalogText;
  try {
    catalogText = renderCatalog(await getCatalogSnapshot(), message);
  } catch (error) {
    console.error(`[care] catalogue rendering failed: ${error?.name || 'Error'}: ${redact(error?.message, 200)}`);
    catalogText = renderCatalog(null);
  }
  const systemInstruction = buildSystemInstruction(catalogText);
  const contents = buildContents(history, message);

  try {
    const result = await generateReply({ systemInstruction, contents });
    const final = finalizeReply(result.text, { truncated: result.truncated });
    if (final.leaked) return { reply: cannedReply('refuse', message), handoff: false, outcome: 'refused_leak', geminiMs: result.ms, attempts: result.attempts };
    if (!final.text) throw new AiError('empty');
    return { reply: final.text, handoff: final.handoff || wantsHumanSupport(message), outcome: 'ok', geminiMs: result.ms, attempts: result.attempts };
  } catch (error) {
    if (error instanceof AiError && error.kind === 'blocked') {
      return { reply: cannedReply('blocked', message), handoff: true, outcome: 'blocked' };
    }
    throw error;
  }
}

// ---------------------------------------------------------------- signed-in chat

const activeUsers = new Set(); // one in-flight chat turn per user per instance

export const chatAuthenticated = handler(async (req, res) => {
  const started = Date.now();
  const body = assertBodyObject(req.body);
  const message = validateMessage(body.message);
  const requestId = validateRequestId(body.requestId);
  const userId = String(req.user._id); // verified session only

  if (activeUsers.has(userId)) {
    return fail(res, 409, 'CHAT_BUSY', 'Please wait for the previous reply before sending another message.');
  }
  activeUsers.add(userId);

  try {
    // A retry of a turn that already completed returns the stored reply: no second
    // Gemini call, no duplicate rows.
    if (requestId) {
      const stored = await findCompletedReply(userId, requestId).catch(() => null);
      if (stored) {
        recordChat({ outcome: 'replayed', totalMs: Date.now() - started, mode: 'user', saved: true });
        return res.json({ success: true, reply: stored, handoff: wantsHumanSupport(message), saved: true, replayed: true });
      }
    }

    const history = await loadRecentMessages(userId, aiConfig.chat.contextMessages).catch(() => []);

    let result;
    try {
      result = await produceReply({ message, history });
    } catch (error) {
      const ai = asAiError(error);
      recordChat({ outcome: `error_${ai.kind}`, totalMs: Date.now() - started, mode: 'user', attempts: ai.attempts || 0 });
      return aiFailure(res, ai);
    }

    let saved = true;
    try {
      await appendTurn(userId, { requestId, userText: message, assistantText: result.reply });
    } catch (error) {
      saved = false;
      console.error('[care] save failed:', error?.name || 'error');
    }

    recordChat({ outcome: result.outcome, totalMs: Date.now() - started, geminiMs: result.geminiMs ?? null, attempts: result.attempts ?? 0, mode: 'user', handoff: result.handoff, saved });
    return res.json({ success: true, reply: result.reply, handoff: result.handoff, saved });
  } finally {
    activeUsers.delete(userId);
  }
});

export const getChatHistory = handler(async (req, res) => {
  const messages = await loadRecentMessages(String(req.user._id), aiConfig.chat.maxStoredMessages);
  return res.json({
    success: true,
    messages: messages.map(({ id, role, content, createdAt }) => ({ id, role, content, createdAt })),
  });
});

export const deleteChatHistory = handler(async (req, res) => {
  await deleteConversation(String(req.user._id));
  return res.json({ success: true, message: 'Your chat history has been cleared.' });
});

// ---------------------------------------------------------------- guest chat (stateless)

export const chatGuest = handler(async (req, res) => {
  const started = Date.now();
  const body = assertBodyObject(req.body);
  const message = validateMessage(body.message);
  const history = validateGuestHistory(body.history);

  try {
    const result = await produceReply({ message, history });
    recordChat({ outcome: result.outcome, totalMs: Date.now() - started, geminiMs: result.geminiMs ?? null, attempts: result.attempts ?? 0, mode: 'guest', handoff: result.handoff });
    return res.json({ success: true, reply: result.reply, handoff: result.handoff, saved: false });
  } catch (error) {
    const ai = asAiError(error);
    recordChat({ outcome: `error_${ai.kind}`, totalMs: Date.now() - started, mode: 'guest', attempts: ai.attempts || 0 });
    return aiFailure(res, ai);
  }
});

// ---------------------------------------------------------------- support tickets

export const createSupportTicket = handler(async (req, res) => {
  const body = assertBodyObject(req.body);
  const name = validateTicketName(body.name);
  const { contact, contactType } = validateTicketContact(body.contact);
  const message = validateTicketMessage(body.message);
  const ownerId = req.user?._id ? String(req.user._id) : null; // never from the body

  const { ticket, duplicate } = await createTicket({ ownerId, name, contact, contactType, message });
  if (!duplicate) await notifyStaff(ticket, req.user?.email || null);

  return res.status(duplicate ? 200 : 201).json({
    success: true,
    reference: ticket.reference,
    status: ticket.status,
    duplicate,
  });
});

/** Owner-only. A reference belonging to someone else is indistinguishable from a missing one. */
export const getSupportTicket = handler(async (req, res) => {
  const reference = validateTicketReference(req.params.reference);
  const ticket = await SupportTicket.findOne({ reference, userId: req.user._id })
    .select('reference status message createdAt')
    .lean();
  if (!ticket) return fail(res, 404, 'NOT_FOUND', 'Support request not found.');
  return res.json({ success: true, ticket: { reference: ticket.reference, status: ticket.status, message: ticket.message, createdAt: ticket.createdAt } });
});
