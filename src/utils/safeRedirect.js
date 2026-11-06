// Open-redirect protection: only same-site absolute paths ("/dashboard") are accepted.
// Anything else - "//evil.com", "/\evil.com", "https://evil.com", "javascript:" - falls back.
export function safeReturnTo(value, fallback = '/dashboard') {
  const v = String(value || '');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || [...v].some((ch) => ch.charCodeAt(0) < 32)) return fallback;
  try { return new URL(v, 'https://aviana.invalid').origin === 'https://aviana.invalid' ? v : fallback; } catch { return fallback; }
}
