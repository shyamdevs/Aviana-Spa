import { env } from '../config/env.js';

const base = { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' };
const MIN = 60 * 1000;

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('aviana_access', accessToken, { ...base, maxAge: 15 * MIN });
  // The refresh cookie is only ever sent to the auth endpoints, never to ordinary API routes.
  res.cookie('aviana_refresh', refreshToken, { ...base, path: '/api/auth', maxAge: 7 * 24 * 60 * MIN });
}

export function clearAuthCookies(res) {
  res.clearCookie('aviana_access', base);
  res.clearCookie('aviana_refresh', { ...base, path: '/api/auth' });
  res.clearCookie('aviana_refresh', base); // legacy cookie scoped to "/"
}

export const setAdminCookie = (res, token) => res.cookie('aviana_admin', token, { ...base, sameSite: 'strict', maxAge: env.adminSessionHours * 60 * MIN });
export const clearAdminCookie = (res) => res.clearCookie('aviana_admin', { ...base, sameSite: 'strict' });

// Binds a verification challenge to the browser that started it (httpOnly, 15 minutes).
export const challengeCookieName = (purpose) => (purpose === 'register' ? 'aviana_reg' : 'aviana_rst');
export const setChallengeCookie = (res, purpose, value) => res.cookie(challengeCookieName(purpose), value, { ...base, path: '/api/auth', maxAge: 15 * MIN });
export const clearChallengeCookie = (res, purpose) => res.clearCookie(challengeCookieName(purpose), { ...base, path: '/api/auth' });
