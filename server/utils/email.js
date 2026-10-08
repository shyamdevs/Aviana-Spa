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
    auth: { user: env.smtpUser, pass: env.smtpPass }
  });
}

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`\n[MAIL DEV] To: ${to}\nSubject: ${subject}\n${text || html}\n`);
    return { accepted: [to], devMode: true };
  }
  return transporter.sendMail({ from: env.mailFrom, to, subject, html, text });
}

export function passwordResetHtml(name, resetUrl) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif">Aviana</h1><p>Hello ${escapeHtml(name)},</p><p>Use the button below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}" style="background:#b08d57;color:white;padding:12px 18px;text-decoration:none">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`;
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
