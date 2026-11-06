import SecurityEvent from '../models/SecurityEvent.js';
import { env } from '../config/env.js';
import { hmac } from './crypto.js';
import { sendEmail } from './email.js';
import { alertEmail } from './emailTemplates.js';

// Keys whose values must never reach logs or the audit collection.
const SENSITIVE = /pass|otp|token|secret|jwt|cookie|authorization|signature|cvv|card|recovery|totp|mfa.?code|private|key|hash/i;
const MAX_DEPTH = 3;

export function redact(value, depth = 0) {
  if (value == null || typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 300) : value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 30).map(([k, v]) => [k, SENSITIVE.test(k) ? '[redacted]' : redact(v, depth + 1)]));
}

const secret = () => env.otpHmacSecret || env.jwtAccessSecret || 'aviana-audit';
export const hashIdentifier = (value) => (value ? hmac(`id|${String(value).toLowerCase()}`, secret()).slice(0, 32) : '');
export const hashIp = (ip) => hashIdentifier(`ip|${ip || 'unknown'}`);

export async function audit({ type, severity = 'info', actorType = 'anonymous', actorId = null, identifier, req, outcome = '', meta = {} }) {
  try {
    await SecurityEvent.create({ type, severity, actorType, actorId, subjectHash: hashIdentifier(identifier), ipHash: hashIp(req?.ip), outcome, meta: redact(meta) });
  } catch (error) { console.error('[audit] write failed:', error?.name || 'error'); }
}

const lastAlert = new Map();
// Alerts are always stored; the e-mail is throttled to one per type per 15 minutes per instance.
export async function raiseAlert(type, summary, req) {
  await audit({ type, severity: 'alert', actorType: 'system', req, outcome: 'blocked', meta: { summary } });
  console.error(`[security-alert] ${type}`);
  const now = Date.now();
  if (!env.adminNotifyEmail || now - (lastAlert.get(type) || 0) < 15 * 60 * 1000) return;
  lastAlert.set(type, now);
  try { await sendEmail({ to: env.adminNotifyEmail, ...alertEmail(type, summary) }); } catch { /* alert delivery is best effort */ }
}

// Called after a failure event: escalates when one identifier or IP keeps failing.
export async function escalateIfRepeated({ type, identifier, req, threshold = 10, windowMs = 15 * 60 * 1000 }) {
  try {
    const since = new Date(Date.now() - windowMs);
    const filters = [{ type, ipHash: hashIp(req?.ip), createdAt: { $gt: since } }];
    if (identifier) filters.push({ type, subjectHash: hashIdentifier(identifier), createdAt: { $gt: since } });
    for (const f of filters) {
      if ((await SecurityEvent.countDocuments(f)) === threshold) await raiseAlert(`repeated_${type}`, `${threshold}+ ${type} events within ${Math.round(windowMs / 60000)} minutes`, req);
    }
  } catch { /* monitoring must never break a request */ }
}
