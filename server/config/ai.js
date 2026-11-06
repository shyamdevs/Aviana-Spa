import './env.js'; // Ensures dotenv has loaded before any value below is read.

/*
 * Aviana Care (AI customer care) configuration.
 *
 * Every tunable is read from the environment with a safe default and a hard
 * range, so a typo in a Vercel variable can never produce an unbounded timeout,
 * an unlimited token budget or a negative limit. GEMINI_API_KEY stays on the
 * server: nothing in this file is ever sent to the browser.
 */

function intFromEnv(source, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = source[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_FALLBACKS = 'gemini-3.5-flash-lite,gemini-flash-lite-latest';
const THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'];

function resolveThinking(source, model) {
  const raw = String(source.GEMINI_THINKING_LEVEL || '').trim().toLowerCase();
  if (raw === 'off' || raw === 'none') return { mode: 'off' };
  if (THINKING_LEVELS.includes(raw)) return { mode: 'level', level: raw };
  // Auto: a support chatbot needs fast answers, not deep reasoning. Gemini 3.x (and "-latest"
  // aliases, which point at Gemini 3.x) think at HIGH by default and that thinking is counted
  // inside maxOutputTokens, which can leave an EMPTY visible answer. Ask for minimal thinking.
  // If a model rejects the setting, utils/gemini.js retries once without it.
  const id = String(model || '').toLowerCase();
  if (/^gemini-3/.test(id) || /-latest$/.test(id)) return { mode: 'level', level: 'minimal' };
  if (/^gemini-2\.5/.test(id)) return { mode: 'budget', budget: 0 };
  return { mode: 'off' };
}

function parseModelList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9._-]{3,80}$/.test(item));
}

export function buildAiConfig(source = process.env) {
  const read = (name) => String(source[name] ?? '').trim();
  const model = read('GEMINI_MODEL') || DEFAULT_MODEL;
  // Tried in order if the configured model is unknown/retired/over quota for this key.
  const fallbackSource = source.GEMINI_FALLBACK_MODELS === undefined ? DEFAULT_FALLBACKS : source.GEMINI_FALLBACK_MODELS;
  const models = [...new Set([model, ...parseModelList(fallbackSource)])].slice(0, 3);
  const temperature = Number.parseFloat(read('AI_TEMPERATURE'));

  return Object.freeze({
    apiKey: read('GEMINI_API_KEY'),
    model,
    models,
    thinkingFor: (modelId) => resolveThinking(source, modelId),

    // Latency guards. Each attempt is bounded and the whole request has a deadline,
    // so a stalled upstream can never hold a serverless function open.
    attemptTimeoutMs: intFromEnv(source, 'AI_REQUEST_TIMEOUT_MS', 12000, { min: 2000, max: 30000 }),
    totalDeadlineMs: intFromEnv(source, 'AI_TOTAL_DEADLINE_MS', 20000, { min: 3000, max: 45000 }),
    maxRetries: intFromEnv(source, 'AI_MAX_RETRIES', 1, { min: 0, max: 2 }),
    // Thinking + answer share this ceiling, so keep generous headroom (answers stay short via the prompt).
    maxOutputTokens: intFromEnv(source, 'AI_MAX_OUTPUT_TOKENS', 1024, { min: 128, max: 4096 }),
    // Gemini 3 is tuned for its default temperature (1.0): only send one if explicitly configured.
    temperature: Number.isFinite(temperature) && temperature >= 0 && temperature <= 2 ? temperature : null,
    maxConcurrent: intFromEnv(source, 'AI_MAX_CONCURRENT', 6, { min: 1, max: 50 }),

    // Cost guard shared across instances (stored in MongoDB). 0 disables it.
    dailyRequestBudget: intFromEnv(source, 'AI_DAILY_REQUEST_BUDGET', 3000, { min: 0, max: 1_000_000 }),

    catalogTtlMs: intFromEnv(source, 'AI_CATALOG_CACHE_TTL_SECONDS', 60, { min: 5, max: 3600 }) * 1000,

    chat: Object.freeze({
      maxMessageChars: intFromEnv(source, 'CHAT_MAX_MESSAGE_CHARS', 1000, { min: 50, max: 4000 }),
      contextMessages: intFromEnv(source, 'CHAT_CONTEXT_MESSAGES', 8, { min: 0, max: 20 }),
      maxContextChars: intFromEnv(source, 'CHAT_MAX_CONTEXT_CHARS', 4000, { min: 500, max: 12000 }),
      maxStoredMessages: intFromEnv(source, 'CHAT_MAX_STORED_MESSAGES', 60, { min: 10, max: 200 }),
      retentionDays: intFromEnv(source, 'CHAT_RETENTION_DAYS', 30, { min: 1, max: 365 }),
    }),

    limits: Object.freeze({
      windowMs: 10 * 60 * 1000,
      chatPerUser: intFromEnv(source, 'CHAT_LIMIT_PER_USER', 30, { min: 1, max: 1000 }),
      chatPerIp: intFromEnv(source, 'CHAT_LIMIT_PER_IP', 40, { min: 1, max: 2000 }),
      guestChatPerIp: intFromEnv(source, 'CHAT_LIMIT_GUEST_PER_IP', 15, { min: 1, max: 1000 }),
      historyPerIp: intFromEnv(source, 'CHAT_HISTORY_LIMIT_PER_IP', 60, { min: 1, max: 2000 }),
      ticketWindowMs: 60 * 60 * 1000,
      ticketPerIp: intFromEnv(source, 'TICKET_LIMIT_PER_IP', 5, { min: 1, max: 200 }),
      ticketPerUser: intFromEnv(source, 'TICKET_LIMIT_PER_USER', 8, { min: 1, max: 200 }),
    }),

    customerCareEmail: read('CUSTOMER_CARE_EMAIL'),
  });
}

export const aiConfig = buildAiConfig();

/**
 * Returns a human-readable warning when GEMINI_MODEL is likely to cause slow or
 * failing replies, or null when it looks fine. Contains no secrets.
 */
export function modelAdvisory(model = aiConfig.model) {
  const id = String(model || '').toLowerCase();
  if (/^gemini-2\.0/.test(id) || /^gemini-1\./.test(id)) {
    return `GEMINI_MODEL="${model}" is retired; requests will fail. Use ${DEFAULT_MODEL}.`;
  }
  if (/^gemini-2\.5/.test(id)) {
    return `GEMINI_MODEL="${model}" was scheduled for shutdown on 2026-10-16; requests may fail. Use ${DEFAULT_MODEL}.`;
  }
  if (/-latest$/.test(id)) {
    return `GEMINI_MODEL="${model}" is a moving alias that can point to a slower thinking model. Prefer an explicit id such as ${DEFAULT_MODEL}.`;
  }
  return null;
}

export const DEFAULT_GEMINI_MODEL = DEFAULT_MODEL;
