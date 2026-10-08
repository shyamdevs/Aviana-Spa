import { env } from '../config/env.js';

const base = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
};

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('aviana_access', accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('aviana_refresh', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res) {
  res.clearCookie('aviana_access', base);
  res.clearCookie('aviana_refresh', base);
}

export function setAdminCookie(res, token) {
  res.cookie('aviana_admin', token, { ...base, maxAge: 8 * 60 * 60 * 1000 });
}

export function clearAdminCookie(res) {
  res.clearCookie('aviana_admin', base);
}
