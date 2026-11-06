/*
 * Where the Aviana Care widget must NOT appear. Matches the real router
 * (src/routes/AppRoutes.jsx): authentication screens and everything under /admin.
 * Paths are normalised first so "/Login", "/login/" and "//login" are all hidden.
 */
const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/signup',
  '/sign-in',
  '/signin',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]);

export function normalizePath(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0].toLowerCase().replace(/\/{2,}/g, '/');
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export function isChatHiddenPath(pathname) {
  const path = normalizePath(pathname);
  if (AUTH_PATHS.has(path)) return true;
  return path === '/admin' || path.startsWith('/admin/');
}

/** The mobile booking screen has a fixed bottom action bar the launcher must clear. */
export function hasMobileBottomBar(pathname) {
  const path = normalizePath(pathname);
  return path === '/booking' || path.startsWith('/booking/');
}
