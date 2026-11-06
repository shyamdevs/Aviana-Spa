import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const hashToken = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');

// Every token pins its algorithm, issuer and audience, so a token minted for one purpose
// (or signed with "none"/a different algorithm) is rejected by every other verifier.
const ALG = { algorithm: 'HS256', issuer: 'aviana' };
const VERIFY = (aud) => ({ algorithms: ['HS256'], issuer: 'aviana', audience: aud });

// Access tokens are capped at 30 minutes whatever the environment asks for.
function accessTtl() {
  const m = /^(\d+)([mh])$/.exec(String(env.accessTtl));
  const minutes = m ? Number(m[1]) * (m[2] === 'h' ? 60 : 1) : 15;
  return `${Math.min(Math.max(minutes, 1), 30)}m`;
}

export const signAccessToken = (user, sid) =>
  jwt.sign({ sub: user._id.toString(), sid, type: 'user' }, env.jwtAccessSecret, { ...ALG, audience: 'aviana:user', expiresIn: accessTtl() });

export const signRefreshToken = (user, sid) =>
  jwt.sign({ sub: user._id.toString(), sid, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') }, env.jwtRefreshSecret, { ...ALG, audience: 'aviana:refresh', expiresIn: env.refreshTtl });

// Admin tokens only prove "this is session <sid>"; the Session row enforces idle + absolute expiry.
export const signAdminToken = (admin, sid) =>
  jwt.sign({ sub: admin._id.toString(), sid, type: 'admin' }, env.adminJwtSecret, { ...ALG, audience: 'aviana:admin', expiresIn: `${env.adminSessionHours}h` });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret, VERIFY('aviana:user'));
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret, VERIFY('aviana:refresh'));
export const verifyAdminToken = (token) => jwt.verify(token, env.adminJwtSecret, VERIFY('aviana:admin'));
