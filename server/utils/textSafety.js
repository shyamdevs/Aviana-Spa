/*
 * Text hygiene shared by the chat and support-ticket flows.
 * None of this makes text "safe to render as HTML" - the UI renders everything as
 * plain text nodes and e-mails are text-only. These helpers remove characters that
 * have no legitimate use in a customer message and are commonly used to hide
 * instructions from humans (zero-width, bidi overrides) or to corrupt logs/e-mail
 * headers (control characters).
 */

// C0/C1 controls except TAB (\u0009), LF (\u000A) and CR (\u000D).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

// Zero-width, directional-override/isolate, BOM, word-joiner, variation selectors and other
// invisible formatting characters. Matching these combining/joining code points individually
// is exactly the intent, so the "misleading character class" rule is disabled for this line.
// eslint-disable-next-line no-misleading-character-class
const INVISIBLE_CHARS = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;

export function stripUnsafeChars(value) {
  return String(value ?? '').replace(CONTROL_CHARS, '').replace(INVISIBLE_CHARS, '');
}

/** Single-line text: collapses all whitespace (including newlines) to single spaces. */
export function cleanSingleLine(value) {
  return stripUnsafeChars(value).normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Multi-line text: keeps line breaks but limits blank runs and trailing spaces. */
export function cleanMultiLine(value) {
  return stripUnsafeChars(value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Truncates on a code-point boundary so emoji / Devanagari are never split. */
export function truncate(value, maxChars) {
  const chars = Array.from(String(value ?? ''));
  return chars.length <= maxChars ? chars.join('') : chars.slice(0, maxChars).join('').trimEnd();
}

export function charLength(value) {
  return Array.from(String(value ?? '')).length;
}
