import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnv = path.resolve(__dirname, '../.env');
dotenv.config({ path: serverEnv });
dotenv.config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_SECRET'];
const missingRequired = required.filter((key) => !process.env[key]);

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production' || process.env.VERCEL === '1';

// Cookie defaults. In production the site is served over HTTPS, so cookies are always Secure.
// SameSite=Lax works when the frontend proxies /api to this backend (see vercel.json) because the
// browser then sees every request as same-site. Use COOKIE_SAME_SITE=none only if the frontend
// calls this backend directly from a different domain.
const requestedSameSite = String(process.env.COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
const cookieSameSite = ['lax', 'strict', 'none'].includes(requestedSameSite) ? requestedSameSite : 'lax';
const cookieSecure = isProduction || cookieSameSite === 'none' || process.env.COOKIE_SECURE === 'true';

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  allowedOrigins: [
    ...(process.env.CLIENT_URL || '').split(','),
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ]
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || '',
  accessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  cookieSecure,
  cookieSameSite,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  homeVisitFee: Number(process.env.HOME_VISIT_FEE ?? 500),
  cancellationWindowHours: Number(process.env.CANCELLATION_WINDOW_HOURS || 12),
  rescheduleWindowHours: Number(process.env.RESCHEDULE_WINDOW_HOURS || 2),
  refundPercent: Number(process.env.REFUND_PERCENT || 100),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'Aviana <no-reply@aviana.local>',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@aviana.local',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!',
};

export const runtimeConfig = {
  required,
  missingRequired,
  ready: missingRequired.length === 0,
};

export function requireServerConfig(req, res, next) {
  if (runtimeConfig.ready) return next();
  return res.status(503).json({
    success: false,
    message: 'Server configuration is incomplete. Add the required Vercel environment variables and redeploy.',
    missing: runtimeConfig.missingRequired,
  });
}
