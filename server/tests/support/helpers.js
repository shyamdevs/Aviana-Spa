import { hashPassword } from '../../utils/password.js';

export const PW = 'Orchid-Lantern-47!';
export async function seedUser(h, over = {}) {
  const User = (await import('../../models/User.js')).default;
  return User.create({ fullName: 'Asha Verma', email: 'asha@example.com', phone: '+919876543210', passwordHash: await hashPassword(PW), emailVerifiedAt: new Date(), ...over });
}
export async function login(h, email = 'asha@example.com', password = PW) {
  const c = h.jar(); const r = await h.call('POST', '/api/auth/login', { client: c, body: { email, password } });
  return { c, r };
}

import { totpAt } from '../../utils/totp.js';
import { hashPassword as hp } from '../../utils/password.js';

// Moves the process clock forward so successive TOTP codes fall in fresh 30-second steps.
const realNow = Date.now; let offset = 0;
Date.now = () => realNow() + offset;
export const tick = (ms = 31_000) => { offset += ms; };
export const resetClock = () => { offset = 0; };
export const code = (secret) => totpAt(secret, Date.now());

export const ADMIN_PW = 'Granite-Meadow-58#';
export async function seedAdmin(role = 'owner', email = 'owner@aviana.test') {
  const Admin = (await import('../../models/Admin.js')).default;
  return Admin.create({ name: 'Test Admin', email, passwordHash: await hp(ADMIN_PW), role });
}

// Full admin sign-in through the real endpoints (password -> mandatory TOTP enrolment -> session).
export async function adminSignIn(h, email = 'owner@aviana.test') {
  const c = h.jar();
  const l = await h.call('POST', '/api/admin/auth/login', { client: c, body: { email, password: ADMIN_PW } });
  if (l.json.mfaEnrollRequired) {
    tick();
    const e = await h.call('POST', '/api/admin/auth/mfa/enroll', { client: c, body: { enrollToken: l.json.enrollToken, code: code(l.json.secret) } });
    return { c, secret: l.json.secret, recovery: e.json.recoveryCodes, res: e };
  }
  return { c, login: l };
}
export async function adminMfaSignIn(h, secret, email = 'owner@aviana.test') {
  const c = h.jar();
  const l = await h.call('POST', '/api/admin/auth/login', { client: c, body: { email, password: ADMIN_PW } });
  tick();
  const m = await h.call('POST', '/api/admin/auth/mfa', { client: c, body: { mfaToken: l.json.mfaToken, code: code(secret) } });
  return { c, res: m };
}
export async function reauth(h, c, secret) { tick(); return h.call('POST', '/api/admin/auth/reauth', { client: c, body: { password: ADMIN_PW, code: code(secret) } }); }
