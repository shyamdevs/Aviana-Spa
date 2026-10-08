import Admin from '../models/Admin.js';
import { verifyAdminToken } from '../utils/tokens.js';

export async function protectAdmin(req, res, next) {
  try {
    const token = req.cookies.aviana_admin || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    const payload = verifyAdminToken(token);
    if (payload.type !== 'admin') return res.status(401).json({ success: false, message: 'Invalid admin token.' });
    const admin = await Admin.findById(payload.sub);
    if (!admin || !admin.isActive) return res.status(401).json({ success: false, message: 'Admin account unavailable.' });
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Admin session expired.' });
  }
}
