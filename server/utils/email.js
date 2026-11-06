import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

let transporter = null;
if (env.smtpHost && env.smtpUser && env.smtpPass) {
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort !== 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

// True when real SMTP credentials are configured.
export const mailConfigured = Boolean(transporter);

// Test-only capture so automated tests can read an OTP without it ever being logged.
export const testOutbox = [];

const EMAIL_RE = /^[^\s@<>",;:\\\r\n]+@[^\s@<>",;:\\\r\n]+\.[^\s@<>",;:\\\r\n]+$/;
const oneLine = (value) => String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

export class MailUnavailableError extends Error {
  constructor() { super('Email delivery is not configured.'); this.status = 503; this.code = 'MAIL_UNAVAILABLE'; }
}

/**
 * Header-injection safe. `sensitive` mail (OTPs) is never written to any log, and is never
 * "pretend-delivered": without SMTP it throws MailUnavailableError (except under NODE_ENV=test,
 * where it is captured in testOutbox).
 */
export async function sendEmail({ to, subject, html, text, from = env.mailFrom, sensitive = false }) {
  const address = oneLine(to);
  if (!EMAIL_RE.test(address) || address.length > 254) throw Object.assign(new Error('Invalid recipient.'), { status: 400 });
  const safeSubject = oneLine(subject).slice(0, 200);
  if (!transporter) {
    if (env.nodeEnv === 'test') { testOutbox.push({ to: address, subject: safeSubject, html, text, sensitive }); return { accepted: [address], devMode: true }; }
    if (sensitive || env.isProduction) throw new MailUnavailableError();
    console.log(`[MAIL DEV] To: ${address} | Subject: ${safeSubject} | body not logged`);
    return { accepted: [address], devMode: true };
  }
  return transporter.sendMail({ from, to: address, subject: safeSubject, html, text });
}

export function bookingConfirmationHtml(booking) {
  const date = new Date(booking.date).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  const total = Number(booking.totalAmount ?? booking.price ?? 0);
  const paid = Number(booking.paidAmount ?? 0);
  const remaining = Number(booking.remainingAmount ?? Math.max(0, total - paid));
  const paymentType = String(booking.paymentType || 'FULL').toUpperCase();
  const paymentMessage = paymentType === 'BOOKING' && remaining > 0
    ? `<p>Booking amount received: <strong>₹${paid.toLocaleString('en-IN')}</strong><br/>Remaining after service: <strong>₹${remaining.toLocaleString('en-IN')}</strong></p>`
    : `<p>Full payment received: <strong>₹${paid.toLocaleString('en-IN')}</strong></p>`;
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif">Aviana</h1><h2>Booking confirmed</h2><p>Thank you, ${escapeHtml(booking.customerName)}.</p><p><strong>${escapeHtml(booking.service.title)}</strong><br/>${escapeHtml(date)} at ${escapeHtml(booking.time)}<br/>${escapeHtml(booking.bookingType === 'home' ? booking.homeAddress : booking.spaAddress)}<br/>Therapist: ${escapeHtml(booking.therapist.name)}</p>${paymentMessage}<p>Total appointment amount: <strong>₹${total.toLocaleString('en-IN')}</strong></p></div>`;
}
