import User from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';

export async function protect(req, res, next) {
  try {
    const token = req.cookies.aviana_access || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const payload = verifyAccessToken(token);
    if (payload.type !== 'user') return res.status(401).json({ success: false, message: 'Invalid user token.' });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    if (user.isBlocked) return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}
