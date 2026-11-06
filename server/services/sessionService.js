import Session from '../models/Session.js';
import { env } from '../config/env.js';
import { audit, hashIp } from '../utils/audit.js';
import { randomHex, sha256 } from '../utils/crypto.js';
import { signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';

const DAY = 24 * 60 * 60 * 1000;
const refreshMs = () => { const m = /^(\d+)([dh])$/.exec(String(env.refreshTtl)); return m ? Number(m[1]) * (m[2] === 'd' ? DAY : 3600000) : 7 * DAY; };
const touchEvery = 60 * 1000;

export async function createSession({ subjectType, subject, req, mfaVerified = false }) {
  const sid = randomHex(24);
  const now = new Date();
  const isAdmin = subjectType === 'admin';
  const doc = {
    sid, subjectType, subject: subject._id, userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 200), ipHash: hashIp(req?.ip),
    lastActivityAt: now, recentAuthAt: now, mfaVerifiedAt: mfaVerified ? now : null,
    idleTimeoutMs: isAdmin ? env.adminSessionIdleMinutes * 60000 : 0,
    expiresAt: new Date(now.getTime() + (isAdmin ? env.adminSessionHours * 3600000 : refreshMs())),
  };
  let refreshToken = null;
  if (!isAdmin) { refreshToken = signRefreshToken(subject, sid); doc.refreshHash = sha256(refreshToken); }
  await Session.create(doc);
  await audit({ type: 'session_created', actorType: subjectType, actorId: subject._id, req, outcome: 'success' });
  return { sid, refreshToken };
}

export async function revokeSession(filter, reason, req) {
  const s = await Session.findOneAndUpdate({ ...filter, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } }, { new: true });
  if (s) await audit({ type: 'session_revoked', actorType: s.subjectType, actorId: s.subject, req, outcome: 'success', meta: { reason } });
  return s;
}

export async function revokeAllSessions(subjectType, subject, reason, { exceptSid, req } = {}) {
  const filter = { subjectType, subject, revokedAt: null, ...(exceptSid ? { sid: { $ne: exceptSid } } : {}) };
  const r = await Session.updateMany(filter, { $set: { revokedAt: new Date(), revokedReason: reason } });
  await audit({ type: 'sessions_revoked_all', actorType: subjectType, actorId: subject, req, outcome: 'success', meta: { reason, count: r?.modifiedCount ?? 0 } });
  return r;
}

// Server-side check run on EVERY authenticated request.
export async function authenticateSession(sid, subjectType, subject) {
  if (!sid || !subject) return null;
  const now = Date.now();
  const s = await Session.findOne({ sid, subjectType, subject, revokedAt: null, expiresAt: { $gt: new Date(now) } });
  if (!s) return null;
  if (s.idleTimeoutMs && now - new Date(s.lastActivityAt).getTime() > s.idleTimeoutMs) { await revokeSession({ sid }, 'idle_timeout'); return null; }
  if (now - new Date(s.lastActivityAt).getTime() > touchEvery) await Session.updateOne({ sid }, { $set: { lastActivityAt: new Date(now) } });
  return s;
}

/**
 * Refresh-token rotation with reuse detection. Returns { session, refreshToken } on success or
 * { error: 'invalid' | 'reuse' }. Presenting an already-rotated token revokes the whole session.
 */
export async function rotateRefresh(token, user, req) {
  let payload;
  try { payload = verifyRefreshToken(token); } catch { return { error: 'invalid' }; }
  if (!user || String(user._id) !== String(payload.sub)) return { error: 'invalid' };
  const hash = sha256(token);
  const s = await Session.findOne({ sid: payload.sid, subjectType: 'user', subject: payload.sub });
  if (!s || s.revokedAt || new Date(s.expiresAt) <= new Date()) return { error: 'invalid' };
  if (s.refreshHash !== hash) {
    if ((s.prevRefreshHashes || []).includes(hash)) {
      await revokeSession({ sid: s.sid }, 'refresh_reuse_detected', req);
      await audit({ type: 'refresh_reuse_detected', severity: 'alert', actorType: 'user', actorId: s.subject, req, outcome: 'blocked' });
      return { error: 'reuse' };
    }
    return { error: 'invalid' };
  }
  const next = signRefreshToken(user, s.sid);
  const updated = await Session.findOneAndUpdate(
    { sid: s.sid, refreshHash: hash, revokedAt: null },
    { $set: { refreshHash: sha256(next), lastActivityAt: new Date() }, $push: { prevRefreshHashes: { $each: [hash], $slice: -5 } } },
    { new: true },
  );
  return updated ? { session: updated, refreshToken: next } : { error: 'invalid' };
}

export const listSessions = (subjectType, subject) =>
  Session.find({ subjectType, subject, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ lastActivityAt: -1 });

export const publicSession = (s, currentSid) => ({ id: String(s._id), device: s.userAgent || 'Unknown device', createdAt: s.createdAt, lastActivityAt: s.lastActivityAt, current: s.sid === currentSid });
