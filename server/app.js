import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { adminBookingOptionRouter, publicBookingOptionRouter } from './routes/bookingOptionRoutes.js';
import { webhook } from './controllers/paymentController.js';
import { notFound, errorHandler } from './middleware/error.js';
import { dbReady, connectDB } from './config/db.js';
import { env, requireServerConfig, runtimeConfig } from './config/env.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com', 'https://accounts.google.com', 'https://apis.google.com'],
      frameSrc: ["'self'", 'https://checkout.razorpay.com', 'https://api.razorpay.com', 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', 'https://accounts.google.com'],
      upgradeInsecureRequests: env.nodeEnv === 'production' ? [] : null,
    },
  },
}));
const normalizeOrigin = (value = '') => String(value).trim().replace(/\/$/, '');
// ALLOWED_ORIGINS entries may contain "*" as a wildcard inside the host, e.g.
// https://aviana-spa-*.vercel.app (handy for Vercel preview deployments).
const originMatchers = env.allowedOrigins.map((entry) => {
  if (!entry.includes('*')) return (origin) => origin === entry;
  const pattern = new RegExp(`^${entry.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+')}$`, 'i');
  return (origin) => pattern.test(origin);
});
const isAllowedOrigin = (origin = '') => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return originMatchers.some((match) => match(normalized));
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    const error = new Error(`Origin not allowed by CORS: ${origin || 'unknown'}`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '2mb' }), async (req, res, next) => {
  try {
    if (!runtimeConfig.ready) {
      return res.status(503).json({ success: false, message: 'Server configuration is incomplete.', missing: runtimeConfig.missingRequired });
    }
    await connectDB();
    return webhook(req, res, next);
  } catch (error) {
    return next(error);
  }
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Rate-limit only the credential endpoints, and only count failed attempts. Limiting every
// /api/auth call (including /me and /refresh) locks real visitors out because all traffic that
// arrives through the Vercel proxy can share one IP address.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, validate: { xForwardedForHeader: false } });
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/google', '/api/auth/forgot-password', '/api/auth/reset-password'], authLimiter);
const adminAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, validate: { xForwardedForHeader: false } });
app.use('/api/admin/auth/login', adminAuthLimiter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel Functions have a read-only application filesystem. Keep Express static
// uploads for local/non-Vercel hosting; production uploads should use Cloudinary.
if (process.env.VERCEL !== '1') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: env.nodeEnv === 'production' ? '7d' : 0 }));
}

app.get('/', (req, res) => res.json({ success: true, service: 'aviana-api', status: 'online' }));
app.get('/api', (req, res) => res.json({
  success: true,
  service: 'aviana-api',
  status: 'online',
  message: 'Aviana API is running.',
  health: '/api/health',
  endpoints: {
    services: '/api/services',
    therapists: '/api/therapists',
    extraServices: '/api/extra-services',
    bookingOption: '/api/booking-option'
  }
}));
app.get('/api/health', (req, res) => res.status(runtimeConfig.ready ? 200 : 503).json({
  success: runtimeConfig.ready,
  service: 'aviana-api',
  databaseConnected: dbReady(),
  configurationReady: runtimeConfig.ready,
  ...(runtimeConfig.ready ? {} : { missing: runtimeConfig.missingRequired }),
  timestamp: new Date().toISOString(),
}));

// All API routes except the webhook connect to Mongo lazily. This avoids a cold-start
// database failure taking down the whole Vercel function before it can return JSON.
app.use('/api', requireServerConfig, async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', bookingRoutes);
app.use('/api', paymentRoutes);
app.use('/api', profileRoutes);
app.use('/api', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminBookingOptionRouter);
app.use('/api', publicBookingOptionRouter);
app.use(notFound);
app.use(errorHandler);
export default app;
