import crypto from 'node:crypto';
import SupportTicket from '../models/SupportTicket.js';
import { aiConfig } from '../config/ai.js';
import { env } from '../config/env.js';
import { mailConfigured, sendEmail } from './email.js';

const DEDUPE_BUCKET_MS = 15 * 60 * 1000;
const MAX_REFERENCE_ATTEMPTS = 4;

export const newReference = () => `AVC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/** Same owner + same content inside one 15-minute bucket => same ticket. */
export function dedupeKeyFor({ ownerId, name, contact, message }, now = Date.now()) {
  const bucket = Math.floor(now / DEDUPE_BUCKET_MS);
  const body = JSON.stringify([ownerId || 'guest', name.toLowerCase(), contact, message.toLowerCase(), bucket]);
  return crypto.createHash('sha256').update(body).digest('hex');
}

/**
 * Creates (or idempotently returns) a ticket. `ownerId` must come from the verified
 * session; for guests it is null and the ticket has no owner.
 * @returns {{ ticket, duplicate: boolean }}
 */
export async function createTicket({ ownerId, name, contact, contactType, message }) {
  const dedupeKey = dedupeKeyFor({ ownerId, name, contact, message });

  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      const ticket = await SupportTicket.create({
        reference: newReference(),
        userId: ownerId || null,
        name, contact, contactType, message,
        status: 'open',
        source: 'website_chat',
        dedupeKey,
      });
      return { ticket, duplicate: false };
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const pattern = error.keyPattern || {};
      if (pattern.dedupeKey || /dedupeKey/.test(error.message || '')) {
        const existing = await SupportTicket.findOne({ dedupeKey }).select('reference status createdAt');
        if (existing) return { ticket: existing, duplicate: true };
      }
      // Otherwise the random reference collided: try a new one.
    }
  }
  throw new Error('Could not allocate a ticket reference.');
}

// ---------------------------------------------------------------- staff notification

function notificationText(ticket, accountEmail) {
  // Plain text only: customer-supplied content is never interpreted as HTML.
  return [
    `Reference: ${ticket.reference}`,
    `Signed-in customer: ${accountEmail ? `yes (${accountEmail})` : 'no (guest)'}`,
    `Name: ${ticket.name}`,
    `Contact (${ticket.contactType || 'unknown'}): ${ticket.contact}`,
    `Message: ${ticket.message || 'No additional message provided.'}`,
    '',
    'Please follow up with this customer using the contact details above.',
  ].join('\n');
}

async function deliver(ticket, accountEmail, send) {
  const to = aiConfig.customerCareEmail;
  if (!to || (!mailConfigured && send === sendEmail)) return 'skipped';
  try {
    await send({
      to,
      from: process.env.MAIL_FROM || env.smtpUser || undefined,
      subject: `New Aviana Care ticket: ${ticket.reference}`,
      text: notificationText(ticket, accountEmail),
    });
    return 'sent';
  } catch (error) {
    // Log the failure class only; never the customer's details.
    console.error('[care] ticket e-mail failed:', error?.code || error?.name || 'error');
    return 'failed';
  }
}

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve('failed'), ms))]);

/**
 * Sends the staff e-mail without delaying or failing the customer's response.
 *  - On Vercel the platform's waitUntil keeps the function alive after the response.
 *  - If waitUntil is unavailable on a serverless runtime, wait briefly (bounded) so
 *    the send is not frozen mid-flight.
 *  - On a normal long-lived Node server it simply runs in the background.
 * The ticket is already saved, so no outcome here can turn it into an error.
 */
export async function notifyStaff(ticket, accountEmail, { send = sendEmail } = {}) {
  const job = deliver(ticket, accountEmail, send)
    .then(async (status) => {
      try { await SupportTicket.updateOne({ _id: ticket._id }, { $set: { notificationStatus: status } }); } catch { /* best effort */ }
      return status;
    });

  const context = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (typeof context?.waitUntil === 'function') {
    context.waitUntil(job);
    return;
  }
  if (process.env.VERCEL === '1') {
    await withTimeout(job, 4000);
    return;
  }
  job.catch(() => {});
}
