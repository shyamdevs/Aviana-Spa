import Admin from '../models/Admin.js';
import { verifyAdminToken } from '../utils/tokens.js';
import { authenticateSession } from '../services/sessionService.js';
import { audit } from '../utils/audit.js';

// Least privilege. Roles live only in the database and cannot be set through any API.
const PERMISSIONS = {
  owner: ['*'],
  manager: ['dashboard', 'users:read', 'users:block', 'bookings:read', 'bookings:write', 'payments:read', 'payments:record', 'catalog:write', 'availability:write', 'settings:read', 'logs:read'],
  staff: ['dashboard', 'users:read', 'bookings:read', 'bookings:write', 'payments:read', 'availability:write', 'settings:read'],
};
export const can = (role, perm) => (PERMISSIONS[role] || []).some((p) => p === '*' || p === perm);

// Cookie only (SameSite=Strict): an admin credential is never accepted from a header.
export async function protectAdmin(req, res, next) {
  try {
    const token = req.cookies?.aviana_admin;
    if (!token) return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    let payload;
    try { payload = verifyAdminToken(token); } catch { return res.status(401).json({ success: false, message: 'Admin session expired.' }); }
    if (payload.type !== 'admin' || !payload.sid) return res.status(401).json({ success: false, message: 'Admin session expired.' });
    const session = await authenticateSession(payload.sid, 'admin', payload.sub);
    if (!session || !session.mfaVerifiedAt) return res.status(401).json({ success: false, message: 'Admin session expired.' });
    const admin = await Admin.findById(payload.sub);
    if (!admin || !admin.isActive) return res.status(401).json({ success: false, message: 'Admin account unavailable.' });
    req.admin = admin; req.adminSession = session;
    return next();
  } catch (error) { return next(error); }
}

// Every admin endpoint checks authorization itself; a front-end route guard is never relied upon.
export const requirePermission = (perm) => async (req, res, next) => {
  if (req.admin && can(req.admin.role, perm)) return next();
  await audit({ type: 'admin_forbidden', severity: 'warn', actorType: 'admin', actorId: req.admin?._id, req, outcome: 'blocked', meta: { perm, method: req.method, path: req.baseUrl + req.path } });
  return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
};

// Sensitive operations need a password + MFA confirmation within the last `minutes`.
export const requireRecentAuth = (minutes = 10) => (req, res, next) => {
  const at = req.adminSession?.recentAuthAt ? new Date(req.adminSession.recentAuthAt).getTime() : 0;
  if (Date.now() - at <= minutes * 60000) return next();
  return res.status(401).json({ success: false, code: 'REAUTH_REQUIRED', message: 'Please confirm your identity to continue.' });
};

export const guard = (perm, { reauth = false } = {}) => [protectAdmin, requirePermission(perm), ...(reauth ? [requireRecentAuth()] : [])];
