import crypto from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';
import { aiConfig } from '../config/ai.js';
import { MongoRateLimitStore } from './mongoRateLimitStore.js';

/*
 * Identifiers are HMAC-hashed before they are used as limiter keys, so the
 * rate-limit collection never contains raw IP addresses or user ids.
 */
function hashKey(value) {
  const secret = env.jwtAccessSecret || 'aviana-rate-limit';
  return crypto.createHmac('sha256', `rl:${secret}`).update(String(value)).digest('hex').slice(0, 32);
}

const ipKey = (req) => `ip:${hashKey(ipKeyGenerator(req.ip || 'unknown'))}`;
const userKey = (req) => `u:${hashKey(String(req.user?._id || 'anonymous'))}`;

function tooMany(message) {
  return (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const retryAfterSeconds = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 60;
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ success: false, code: 'RATE_LIMITED', message, retryAfterSeconds });
  };
}

/**
 * @param shared  true = counted in MongoDB (works across instances, one extra DB
 *                round trip); false = in-memory per instance (instant burst guard).
 */
export function createLimiter({ name, windowMs, limit, keyGenerator, shared, message, model }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: shared ? new MongoRateLimitStore({ prefix: name, windowMs, ...(model ? { model } : {}) }) : undefined,
    // If the counter store is unavailable, serve the request rather than lock every
    // customer out. The shared daily Gemini budget and per-instance caps still apply.
    passOnStoreError: true,
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
    handler: tooMany(message),
  });
}

const { limits } = aiConfig;
const BUSY = 'You are sending messages too quickly. Please wait a moment and try again.';

export const chatUserLimiter = createLimiter({
  name: 'chat-user', windowMs: limits.windowMs, limit: limits.chatPerUser, keyGenerator: userKey, shared: true, message: BUSY,
});
export const chatIpLimiter = createLimiter({
  name: 'chat-ip', windowMs: limits.windowMs, limit: limits.chatPerIp, keyGenerator: ipKey, shared: false, message: BUSY,
});
export const guestChatIpLimiter = createLimiter({
  name: 'chat-guest-ip', windowMs: limits.windowMs, limit: limits.guestChatPerIp, keyGenerator: ipKey, shared: true, message: BUSY,
});
export const historyLimiter = createLimiter({
  name: 'chat-history-ip', windowMs: limits.windowMs, limit: limits.historyPerIp, keyGenerator: ipKey, shared: false, message: BUSY,
});
export const ticketIpLimiter = createLimiter({
  name: 'ticket-ip', windowMs: limits.ticketWindowMs, limit: limits.ticketPerIp, keyGenerator: ipKey, shared: true,
  message: 'Too many support requests from this connection. Please try again later or contact us directly.',
});
export const ticketUserLimiter = createLimiter({
  name: 'ticket-user', windowMs: limits.ticketWindowMs, limit: limits.ticketPerUser, keyGenerator: userKey, shared: true,
  message: 'You have sent several support requests recently. Please wait before sending another.',
});

// ---------------------------------------------------------------- global Gemini budget

const DAY_MS = 24 * 60 * 60 * 1000;
let budgetStore = null;

/**
 * Counts one Gemini call against the shared daily budget. Returns false only when
 * the budget is genuinely exhausted; any storage error fails open.
 */
export async function consumeAiBudget(budget = aiConfig.dailyRequestBudget, store = null) {
  if (!budget) return true;
  try {
    budgetStore ??= new MongoRateLimitStore({ prefix: 'ai-budget', windowMs: DAY_MS });
    const { totalHits } = await (store || budgetStore).increment('global');
    return totalHits <= budget;
  } catch (error) {
    console.error('[care] budget counter unavailable:', error?.name || 'error');
    return true;
  }
}
