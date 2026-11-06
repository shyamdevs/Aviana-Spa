import { env } from '../config/env.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIES = ['aviana_access', 'aviana_refresh', 'aviana_admin', 'aviana_reg', 'aviana_rst'];
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'aviana-web';

// Defence in depth on top of SameSite cookies + the CORS allow-list. A state-changing request that
// carries an auth cookie must (1) not be flagged cross-site by the browser, (2) come from an
// allowed Origin when one is present, and (3) include a custom header, which a cross-site form or
// simple request cannot add (a custom header forces a CORS preflight that the allow-list rejects).
export function csrfProtection(allowedOrigins = env.allowedOrigins) {
  return (req, res, next) => {
    if (SAFE.has(req.method)) return next();
    if (!AUTH_COOKIES.some((name) => req.cookies?.[name])) return next();
    const fail = () => res.status(403).json({ success: false, message: 'Request blocked for your security. Refresh the page and try again.' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return fail();
    const origin = req.headers.origin;
    if (origin && allowedOrigins.length && !allowedOrigins.some((o) => o === origin || (o.includes('*') && new RegExp(`^${o.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+')}$`, 'i').test(origin)))) return fail();
    if (req.headers[CSRF_HEADER] !== CSRF_VALUE) return fail();
    return next();
  };
}
