// Rejects (never silently rewrites) request data that could smuggle MongoDB operators or
// pollute prototypes: keys containing "$", ".", "[" or "]", or named __proto__/constructor/prototype.
const BAD_KEY = /[$.[\]]|^(__proto__|constructor|prototype)$/;

function hasBadKey(value, depth = 0) {
  if (depth > 8) return true; // absurdly deep payloads are rejected outright
  if (Array.isArray(value)) return value.some((v) => hasBadKey(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.keys(value).some((k) => BAD_KEY.test(k) || hasBadKey(value[k], depth + 1));
  }
  return false;
}

export function rejectUnsafeInput(req, res, next) {
  if (hasBadKey(req.body) || hasBadKey(req.query) || hasBadKey(req.params)) {
    return res.status(400).json({ success: false, message: 'Request contains invalid fields.' });
  }
  return next();
}

export const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80);
export const pageParams = (query, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};
