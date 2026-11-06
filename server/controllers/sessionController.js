import mongoose from 'mongoose';
import { clearAuthCookies } from '../utils/cookies.js';
import { listSessions, publicSession, revokeAllSessions, revokeSession } from '../services/sessionService.js';

export async function mySessions(req, res) {
  const rows = await listSessions('user', req.user._id);
  res.json({ success: true, sessions: rows.map((s) => publicSession(s, req.session.sid)) });
}

// Ownership is part of the query: a user can never revoke another user's session.
export async function revokeMySession(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid session.' });
  const s = await revokeSession({ _id: req.params.id, subjectType: 'user', subject: req.user._id }, 'user_revoked', req);
  if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
  if (s.sid === req.session.sid) clearAuthCookies(res);
  res.json({ success: true });
}

export async function logoutAll(req, res) {
  await revokeAllSessions('user', req.user._id, 'logout_all', { req });
  clearAuthCookies(res);
  res.json({ success: true });
}
