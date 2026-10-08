import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: 'user' }, env.jwtAccessSecret, { expiresIn: env.accessTtl });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: 'refresh' }, env.jwtRefreshSecret, { expiresIn: env.refreshTtl });
}

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), type: 'admin' }, env.adminJwtSecret, { expiresIn: '8h' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.adminJwtSecret);
}
