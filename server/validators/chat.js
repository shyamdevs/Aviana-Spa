import mongoose from 'mongoose';
import { aiConfig } from '../config/ai.js';
import { charLength, cleanMultiLine, cleanSingleLine, truncate } from '../utils/textSafety.js';

function invalid(message, code = 'INVALID_REQUEST') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/*
 * NoSQL-injection hardening: every field is required to be a primitive string
 * *before* it is used. A body such as {"message":{"$ne":""}} or
 * {"requestId":{"$gt":""}} is rejected here and can never reach a query.
 */
function requireString(value, label) {
  if (typeof value !== 'string') throw invalid(`${label} must be text.`);
  return value;
}

export function assertBodyObject(body) {
  if (!isPlainObject(body)) throw invalid('Send a JSON object.');
  return body;
}

export function validateMessage(value) {
  const text = cleanMultiLine(requireString(value, 'Message'));
  if (!text) throw invalid('Please enter a message.');
  if (charLength(text) > aiConfig.chat.maxMessageChars) {
    throw invalid(`Message is too long. Please use ${aiConfig.chat.maxMessageChars} characters or fewer.`, 'MESSAGE_TOO_LONG');
  }
  return text;
}

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function validateRequestId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const id = requireString(value, 'requestId');
  if (!REQUEST_ID.test(id)) throw invalid('Invalid request id.');
  return id;
}

/** Guests keep their own short context in the browser; treat it as untrusted. */
export function validateGuestHistory(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid('History must be a list.');
  if (value.length > 12) throw invalid('History is too long.');

  const items = [];
  let total = 0;
  for (const entry of value) {
    if (!isPlainObject(entry)) throw invalid('Invalid history entry.');
    const role = requireString(entry.role, 'History role');
    if (role !== 'user' && role !== 'assistant') throw invalid('Invalid history role.');
    const content = truncate(cleanMultiLine(requireString(entry.content, 'History text')), 1500);
    if (!content) continue;
    total += charLength(content);
    items.push({ role, content });
  }
  if (total > aiConfig.chat.maxContextChars * 2) throw invalid('History is too long.');
  return items;
}

// ---------------------------------------------------------------- support tickets

const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .,'’-]{2,100}$/u;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export function validateTicketName(value) {
  const name = cleanSingleLine(requireString(value, 'Name'));
  if (name.length < 2 || name.length > 100 || !NAME_PATTERN.test(name)) {
    throw invalid('Please enter your name using letters (2 to 100 characters).');
  }
  return name;
}

/** Accepts an e-mail address or a phone number (Indian formats and +country codes). */
export function validateTicketContact(value) {
  const raw = cleanSingleLine(requireString(value, 'Contact'));
  if (raw.length > 200) throw invalid('Please enter a valid email address or phone number.');

  if (raw.includes('@')) {
    const email = raw.toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 160) {
      throw invalid('Please enter a valid email address or phone number.');
    }
    return { contact: email, contactType: 'email' };
  }

  const digits = raw.replace(/[\s().-]/g, '');
  if (/^(\+|00)?\d{10,15}$/.test(digits)) {
    return { contact: digits.replace(/^00/, '+'), contactType: 'phone' };
  }
  throw invalid('Please enter a valid email address or phone number.');
}

export function validateTicketMessage(value) {
  if (value === undefined || value === null) return '';
  const message = cleanMultiLine(requireString(value, 'Message'));
  if (charLength(message) > 1000) throw invalid('Your message must be 1000 characters or fewer.');
  return message;
}

export function validateTicketReference(value) {
  const reference = String(value ?? '').trim().toUpperCase();
  if (!/^AVC-[0-9A-F]{8}$/.test(reference)) throw invalid('Invalid reference number.');
  return reference;
}

export function assertObjectId(value) {
  if (typeof value !== 'string' && !(value instanceof mongoose.Types.ObjectId)) throw invalid('Invalid identifier.');
  if (!mongoose.isValidObjectId(value)) throw invalid('Invalid identifier.');
  return String(value);
}
