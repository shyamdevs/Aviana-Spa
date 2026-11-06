// Pure secret-strength checks. Returns problem descriptions that name the variable only,
// never its value, so results are safe to log.
const PLACEHOLDER = /(replace_with|change_?me|your_|example|placeholder|default|dummy|secret_here)/i;

function entropyBytes(value) {
  const v = String(value || '');
  if (/^[0-9a-f]+$/i.test(v) && v.length % 2 === 0) return v.length / 2;
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(v) && v.length >= 43) return Math.floor((v.replace(/=+$/, '').length * 6) / 8);
  const counts = {};
  for (const ch of v) counts[ch] = (counts[ch] || 0) + 1;
  const bitsPerChar = -Object.values(counts).reduce((s, c) => s + (c / v.length) * Math.log2(c / v.length), 0);
  return Math.floor((bitsPerChar * v.length) / 8);
}

export function checkSecret(name, value) {
  const v = String(value || '');
  if (!v) return `${name} is missing`;
  const isHex = /^[0-9a-f]+$/i.test(v);
  if (!isHex && PLACEHOLDER.test(v)) return `${name} looks like a placeholder or default`;
  if (new Set(v).size < 10) return `${name} has too little variety`;
  if (entropyBytes(v) < 32) return `${name} has less than 256 bits of entropy (use 32+ random bytes)`;
  return null;
}

export function parseEncryptionKeys(raw) {
  const keys = new Map();
  for (const part of String(raw || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [id, b64] = part.split(':');
    const buf = Buffer.from(b64 || '', 'base64');
    if (/^[0-9]{1,4}$/.test(id || '') && buf.length === 32) keys.set(Number(id), buf);
  }
  return keys;
}

export function evaluateSecrets(cfg) {
  const problems = [];
  const named = [['JWT_ACCESS_SECRET', cfg.jwtAccessSecret], ['JWT_REFRESH_SECRET', cfg.jwtRefreshSecret], ['ADMIN_JWT_SECRET', cfg.adminJwtSecret], ['OTP_HMAC_SECRET', cfg.otpHmacSecret]];
  for (const [name, value] of named) { const p = checkSecret(name, value); if (p) problems.push(p); }
  const values = named.map(([, v]) => v).filter(Boolean);
  if (new Set(values).size !== values.length) problems.push('JWT/OTP secrets must all be different from each other');
  if (!cfg.encryptionKeys.size) problems.push('DATA_ENCRYPTION_KEYS must contain at least one 32-byte base64 key (format "1:<base64>")');
  else if (!cfg.encryptionKeys.has(cfg.activeEncryptionKey)) problems.push('DATA_ENCRYPTION_ACTIVE_KEY does not match any configured key');
  if (cfg.bcryptCost < 12) problems.push('BCRYPT_COST must be at least 12 in production');
  return problems;
}
