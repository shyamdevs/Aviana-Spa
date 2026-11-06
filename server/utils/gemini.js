import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { aiConfig, modelAdvisory } from '../config/ai.js';

/*
 * Defensive wrapper around @google/genai.
 *  - GEMINI_API_KEY is read here, on the server, and nowhere else.
 *  - Every attempt has a timeout and the whole call has a deadline (the SDK has NO
 *    client-side timeout by default).
 *  - Recovers automatically from the failures that actually happen in practice:
 *      * model unknown/retired/over quota for this key  -> next model in the fallback chain
 *      * empty answer because thinking used up maxOutputTokens -> retry with a bigger budget
 *      * model rejects the thinking setting              -> retry once without it
 *      * transient 5xx / timeout / rate limit            -> bounded retry
 *  - Failures are logged server-side with a precise, REDACTED reason so they can be
 *    diagnosed; clients only ever get a generic message (plus a diagnostic in dev).
 */

export class AiError extends Error {
  constructor(kind, { status, retryable = false, model, detail } = {}) {
    super(kind);
    this.name = 'AiError';
    // not_configured | busy | timeout | rate_limited | quota | unavailable | blocked | empty |
    // empty_truncated | model_unavailable | bad_thinking | bad_request | auth | unknown
    this.kind = kind;
    this.upstreamStatus = status;
    this.retryable = retryable;
    this.model = model;
    this.detail = detail;
  }
}

let client = null;
let warned = false;

function getClient() {
  if (!aiConfig.apiKey) throw new AiError('not_configured', { detail: 'GEMINI_API_KEY is not set on the server.' });
  if (!warned) {
    warned = true;
    const advisory = modelAdvisory();
    if (advisory) console.warn(`[care] ${advisory}`);
    console.log(`[care] Gemini ready: models=${aiConfig.models.join(' -> ')} timeout=${aiConfig.attemptTimeoutMs}ms deadline=${aiConfig.totalDeadlineMs}ms maxOutputTokens=${aiConfig.maxOutputTokens}`);
  }
  client ??= new GoogleGenAI({ apiKey: aiConfig.apiKey, httpOptions: { timeout: aiConfig.attemptTimeoutMs } });
  return client;
}

// ---------------------------------------------------------------- concurrency cap (per instance)

let active = 0;
function acquire() {
  if (active >= aiConfig.maxConcurrent) throw new AiError('busy', { retryable: true });
  active += 1;
  let released = false;
  return () => { if (!released) { released = true; active -= 1; } };
}
export const activeGeminiCalls = () => active;

// ---------------------------------------------------------------- error description + classification

/** Removes anything key-shaped and bounds the length. */
export function redact(text, max = 300) {
  return String(text ?? '')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted-key]')
    .replace(/(key|token|secret)=([^&\s"']+)/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

/** The SDK's ApiError message is usually a JSON string: pull out the human message. */
function upstreamMessage(error) {
  const raw = String(error?.message ?? '');
  try {
    const parsed = JSON.parse(raw);
    return redact(parsed?.error?.message || parsed?.message || raw);
  } catch {
    return redact(raw);
  }
}

export function classifyError(error, model) {
  if (error instanceof AiError) { error.model ??= model; return error; }
  const status = Number(error?.status ?? error?.code) || undefined;
  const name = String(error?.name || '');
  const message = upstreamMessage(error);
  const make = (kind, retryable = false) => new AiError(kind, { status, retryable, model, detail: message });

  if (name === 'AbortError' || name === 'TimeoutError' || /timed? ?out|aborted/i.test(message)) return make('timeout', true);
  if (/API key not valid|API_KEY_INVALID|API key expired|API key.*(invalid|revoked)|PERMISSION_DENIED|permission denied|has been suspended/i.test(message) || status === 401 || status === 403) {
    return make('auth');
  }
  if (status === 429) {
    // Quota exhausted (e.g. no free tier for this model, "limit: 0") will not clear in seconds: try another model.
    return /quota|RESOURCE_EXHAUSTED|limit: 0|billing/i.test(message) ? make('quota') : make('rate_limited', true);
  }
  if (status === 404 || /models?\/.*(not found|not supported)|is not found for API version|no longer available|deprecated|retired/i.test(message)) {
    return make('model_unavailable');
  }
  if (status === 400 && /thinking/i.test(message)) return make('bad_thinking');
  if (status === 400) return make('bad_request');
  if (status && [408, 500, 502, 503, 504].includes(status)) return make('unavailable', true);
  if (/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket/i.test(`${name} ${message} ${error?.cause?.code}`)) return make('unavailable', true);
  return make('unknown');
}

export const ADVICE = {
  not_configured: 'GEMINI_API_KEY is not set. Add it to server/.env (or the Vercel backend project) and restart.',
  auth: 'Google rejected the API key (invalid, expired, restricted or the project lacks access). Create a new key at https://aistudio.google.com/apikey and set GEMINI_API_KEY.',
  model_unavailable: 'This model id does not exist for your key (retired or misspelled). Set GEMINI_MODEL=gemini-3.5-flash-lite.',
  quota: 'Quota/billing problem for this model on your Google project (e.g. no free tier). Enable billing, or use another model.',
  rate_limited: 'Too many requests per minute for this key. It usually clears in a few seconds.',
  timeout: 'Gemini did not answer in time. Use a faster model (gemini-3.5-flash-lite) or raise AI_REQUEST_TIMEOUT_MS.',
  unavailable: 'Gemini (or the network) was temporarily unavailable.',
  empty: 'Gemini returned an empty answer.',
  empty_truncated: 'The model spent its whole token budget thinking. Use a Flash-Lite model or set GEMINI_THINKING_LEVEL=minimal.',
  bad_thinking: 'The model rejected the thinking setting. Set GEMINI_THINKING_LEVEL=off.',
  bad_request: 'Gemini rejected the request as invalid.',
  blocked: 'The prompt was blocked by Gemini safety filters.',
  unknown: 'Unexpected error while calling Gemini.',
};

// ---------------------------------------------------------------- request + response

const MIN_TIME_FOR_RETRY_MS = 2500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function thinkingConfigFor(model, drop) {
  if (drop) return null;
  const choice = aiConfig.thinkingFor(model);
  if (choice.mode === 'level') return { thinkingLevel: ThinkingLevel[choice.level.toUpperCase()] };
  if (choice.mode === 'budget') return { thinkingBudget: choice.budget };
  return null;
}

export function buildRequest({ model, systemInstruction, contents, timeoutMs, tokenBoost = 1, dropThinking = false }) {
  const thinking = thinkingConfigFor(model, dropThinking);
  return {
    model,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: Math.min(4096, aiConfig.maxOutputTokens * tokenBoost),
      candidateCount: 1,
      abortSignal: AbortSignal.timeout(Math.max(500, timeoutMs)),
      ...(aiConfig.temperature !== null ? { temperature: aiConfig.temperature } : {}),
      ...(thinking ? { thinkingConfig: thinking } : {}),
    },
  };
}

function readResponse(response, model) {
  if (response?.promptFeedback?.blockReason) throw new AiError('blocked', { model });
  const candidate = response?.candidates?.[0];
  const parts = (response?.candidates ?? []).flatMap((c) => c?.content?.parts ?? []);
  // Skip "thought" parts; only visible answer text goes to customers.
  const text = parts.filter((p) => typeof p?.text === 'string' && !p.thought).map((p) => p.text).join('').trim();
  const finishReason = String(candidate?.finishReason ?? '');
  if (!text) {
    if (/SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/i.test(finishReason)) throw new AiError('blocked', { model });
    if (/MAX_TOKENS/i.test(finishReason)) throw new AiError('empty_truncated', { model, detail: 'finishReason=MAX_TOKENS with no visible text' });
    throw new AiError('empty', { retryable: true, model, detail: `finishReason=${finishReason || 'none'}` });
  }
  return { text, finishReason, truncated: /MAX_TOKENS/i.test(finishReason) };
}

function logFailure(error, attempt) {
  console.error(`[care] gemini failure ${JSON.stringify({ model: error.model, kind: error.kind, status: error.upstreamStatus ?? null, attempt, detail: error.detail ?? '' })}`);
}

/**
 * @returns {{ text:string, truncated:boolean, attempts:number, ms:number, finishReason:string, model:string }}
 * @throws {AiError}
 */
export async function generateReply({ systemInstruction, contents }) {
  const ai = getClient();
  const release = acquire();
  const started = Date.now();
  const deadline = started + aiConfig.totalDeadlineMs;
  let attempts = 0;
  let lastError = new AiError('unknown');

  try {
    for (const model of aiConfig.models) {
      let retries = 0;
      let tokenBoost = 1;
      let dropThinking = false;

      for (;;) {
        const remaining = deadline - Date.now();
        if (remaining < 800) throw Object.assign(lastError, { attempts });
        attempts += 1;
        try {
          const response = await ai.models.generateContent(
            buildRequest({ model, systemInstruction, contents, timeoutMs: Math.min(aiConfig.attemptTimeoutMs, remaining), tokenBoost, dropThinking }),
          );
          return { ...readResponse(response, model), attempts, ms: Date.now() - started, model };
        } catch (raw) {
          const error = classifyError(raw, model);
          lastError = error;
          error.attempts = attempts;
          logFailure(error, attempts);

          if (error.kind === 'auth' || error.kind === 'not_configured' || error.kind === 'blocked') throw error; // no model can fix these
          if (error.kind === 'bad_thinking' && !dropThinking) { dropThinking = true; continue; }
          if (error.kind === 'empty_truncated' && tokenBoost === 1) { tokenBoost = 3; continue; }
          if (error.retryable && retries < aiConfig.maxRetries && deadline - Date.now() > MIN_TIME_FOR_RETRY_MS) {
            retries += 1;
            await sleep(Math.min(400 * retries, 800));
            continue;
          }
          break; // give up on this model; try the next one in the chain (if time remains)
        }
      }
      if (deadline - Date.now() < MIN_TIME_FOR_RETRY_MS) break;
    }
    throw Object.assign(lastError, { attempts });
  } finally {
    release();
  }
}

/** One minimal call to a specific model - used by `npm run check:ai`. */
export async function probeModel(model, timeoutMs = 20000) {
  const ai = getClient();
  const started = Date.now();
  try {
    const response = await ai.models.generateContent(buildRequest({
      model, systemInstruction: 'Reply with the single word OK.', contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }], timeoutMs,
    }));
    const result = readResponse(response, model);
    return { ok: true, ms: Date.now() - started, text: result.text.slice(0, 40) };
  } catch (raw) {
    const error = classifyError(raw, model);
    return { ok: false, ms: Date.now() - started, kind: error.kind, status: error.upstreamStatus, detail: error.detail, advice: ADVICE[error.kind] };
  }
}

export function resetGeminiClientForTests() {
  client = null;
  warned = false;
  active = 0;
}
