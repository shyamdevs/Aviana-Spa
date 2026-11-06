import ContactMessage from '../models/ContactMessage.js';
import { audit } from '../utils/audit.js';
import { normalizePhone } from '../utils/phone.js';
import { field, parseBody } from '../utils/validate.js';

// Drops control characters except tab/newline (no regex literal: avoids no-control-regex).
const clean = (v) => [...v].filter((ch) => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c !== 127); }).join('');

export async function createContact(req, res) {
  const b = parseBody(req.body, { name: field.string({ min: 2, max: 100 }), email: field.email(), phone: field.string({ min: 6, max: 20 }), message: field.string({ min: 5, max: 2000 }), website: field.string({ max: 200 }) }, { optional: ['phone', 'website'] });
  // Honeypot: real visitors never see or fill this field. Bots get a normal-looking success.
  if (b.website) { await audit({ type: 'contact_honeypot', severity: 'warn', req, outcome: 'blocked' }); return res.status(201).json({ success: true, message: 'Thank you. Your message has been received.' }); }
  const phone = b.phone ? normalizePhone(b.phone) : undefined;
  if (b.phone && !phone) return res.status(400).json({ success: false, message: 'Enter a valid mobile number.' });
  await ContactMessage.create({ name: clean(b.name), email: b.email, phone, message: clean(b.message) });
  res.status(201).json({ success: true, message: 'Thank you. Your message has been received.' });
}
