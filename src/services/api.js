// All API calls go to the same origin by default ("/api"). In production, vercel.json proxies
// "/api/*" to the backend project, so the browser treats the auth cookies as first-party and
// they are never blocked. For local development, vite.config.js proxies "/api" to the Express
// server. Set VITE_API_URL only if you really want to call a different domain directly.
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Auth endpoints that must never trigger an automatic token refresh.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/logout', '/auth/session', '/auth/forgot-password', '/auth/reset-password'];

let refreshInFlight = null;
// Share one refresh call between parallel requests. Refresh tokens rotate, so two simultaneous
// refreshes would invalidate each other and log the user out.
function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request(path, options = {}, retried = false) {
  const isFormData = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...(isFormData || !options.body ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) },
    });
  } catch {
    const error = new Error('Could not reach the server. Please check your connection and try again.');
    error.status = 0;
    throw error;
  }
  if (response.status === 401 && !retried && !NO_REFRESH_PATHS.some((item) => path.startsWith(item))) {
    if (await refreshSession()) return request(path, options, true);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message || 'Something went wrong.'); error.status = response.status; error.data = data; throw error; }
  return data;
}
const body = (value) => value instanceof FormData ? value : JSON.stringify(value);
export const api = {
  get: (path) => request(path),
  post: (path, value) => request(path, { method: 'POST', body: body(value ?? {}) }),
  patch: (path, value) => request(path, { method: 'PATCH', body: body(value ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
export { API_URL };
