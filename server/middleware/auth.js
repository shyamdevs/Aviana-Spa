import User from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { authenticateSession } from '../services/sessionService.js';

const getAccessToken = (req) => req.cookies?.aviana_access || req.headers.authorization?.replace(/^Bearer\s+/i, '');
const deny = (res, status, message) => res.status(status).json({ success: false, message });

// Verifies signature (pinned alg/iss/aud), the SERVER-SIDE session (revocable), and the account.
// Roles and ids are never read from the client; req.user always comes from the database.
async function resolveUser(req) {
  const token = getAccessToken(req);
  if (!token) return { status: 401, message: 'Authentication required.' };
  let payload;
  try { payload = verifyAccessToken(token); } catch { return { status: 401, message: 'Session expired. Please log in again.' }; }
  if (payload.type !== 'user' || !payload.sid) return { status: 401, message: 'Session expired. Please log in again.' };
  const session = await authenticateSession(payload.sid, 'user', payload.sub);
  if (!session) return { status: 401, message: 'Session expired. Please log in again.' };
  const user = await User.findById(payload.sub);
  if (!user) return { status: 401, message: 'Session expired. Please log in again.' };
  if (user.isBlocked) return { status: 403, message: 'Your account has been blocked. Please contact support.' };
  return { user, session };
}

export async function protect(req, res, next) {
  try {
    const r = await resolveUser(req);
    if (r.status) return deny(res, r.status, r.message);
    req.user = r.user; req.session = r.session;
    return next();
  } catch (error) { return next(error); }
}

// Lets public visitors use the information chatbot while associating chats with an account
// whenever a valid signed-in session is present.
export async function optionalProtect(req, res, next) {
  try {
    if (!getAccessToken(req)) { req.user = null; return next(); }
    const r = await resolveUser(req);
    if (r.status) return deny(res, r.status, r.message);
    req.user = r.user; req.session = r.session;
    return next();
  } catch (error) { return next(error); }
}
