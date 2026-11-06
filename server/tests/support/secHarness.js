import './env.js';
import mongoose from 'mongoose';
import { installMemDb } from './memdb.js';

// Boots the REAL Express app (helmet, CORS, CSRF, sanitizer, limiters, controllers, error handler)
// on an ephemeral port, with the Mongoose statics replaced by the in-memory emulator.
export async function startSecurityHarness() {
  const names = ['User', 'Admin', 'Session', 'OtpChallenge', 'SecurityEvent', 'WebhookEvent', 'RateLimitHit', 'Booking', 'Payment', 'ContactMessage', 'ActivityLog', 'Service', 'Therapist', 'Setting', 'BookingOption', 'ExtraService', 'AvailabilityBlock'];
  const models = {};
  for (const n of names) models[n] = (await import(`../../models/${n}.js`)).default;
  const mem = installMemDb(models);
  const { default: app } = await import('../../app.js');
  Object.defineProperty(mongoose.connection, 'readyState', { get: () => 1, configurable: true });
  const email = await import('../../utils/email.js');
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = () => ({ cookies: {} });

  async function call(method, path, { body, client, headers = {}, raw, csrf = true } = {}) {
    const cookie = client ? Object.entries(client.cookies).map(([k, v]) => `${k}=${v}`).join('; ') : '';
    const res = await fetch(base + path, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-Requested-With': 'aviana-web' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const line of res.headers.getSetCookie?.() || []) {
      const [pair] = line.split(';'); const i = pair.indexOf('='); const k = pair.slice(0, i); const v = pair.slice(i + 1);
      if (!client) continue;
      if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(line) || v === '') delete client.cookies[k]; else client.cookies[k] = v;
    }
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  const lastOtp = (to) => { const m = [...email.testOutbox].reverse().find((x) => x.to === to && /code/i.test(x.text)); return m?.text.match(/Code: (\d{6})/)?.[1]; };
  return { mem, call, jar, base, outbox: email.testOutbox, lastOtp, reset: () => { mem.clear(); email.testOutbox.length = 0; }, close: () => new Promise((r) => server.close(r)) };
}
