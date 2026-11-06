// Small strict schema validator: unknown keys are rejected, every value must have the declared
// primitive type (so {"$ne":null} can never be mistaken for a string), strings are trimmed
// and length-bounded. Error messages name fields, never echo submitted values.
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

export const field = {
  string: (o = {}) => ({ t: 'string', min: 0, max: 200, trim: true, ...o }),
  email: () => ({ t: 'email' }),
  otp: () => ({ t: 'string', min: 6, max: 6, pattern: /^\d{6}$/ }),
  hex: (len) => ({ t: 'string', min: len, max: len, pattern: /^[0-9a-f]+$/i }),
  password: () => ({ t: 'password' }),
  bool: () => ({ t: 'boolean' }),
};

export function parseBody(body, shape, { optional = [] } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Invalid request.');
  const unknown = Object.keys(body).filter((k) => !(k in shape));
  if (unknown.length) throw fail('Request contains unexpected fields.');
  const out = {};
  for (const [key, rule] of Object.entries(shape)) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === '') {
      if (optional.includes(key)) continue;
      throw fail(`${key} is required.`);
    }
    if (rule.t === 'boolean') { if (typeof raw !== 'boolean') throw fail(`${key} is invalid.`); out[key] = raw; continue; }
    if (typeof raw !== 'string') throw fail(`${key} is invalid.`);
    if (rule.t === 'password') { out[key] = raw; continue; } // never trimmed or altered
    const v = rule.t === 'email' ? raw.trim().toLowerCase() : (rule.trim === false ? raw : raw.trim());
    if (rule.t === 'email') {
      if (v.length > 254 || !/^[a-z0-9._%+'-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/i.test(v)) throw fail('Enter a valid email address.');
    } else {
      if (v.length < rule.min || v.length > rule.max) throw fail(`${key} is invalid.`);
      if (rule.pattern && !rule.pattern.test(v)) throw fail(`${key} is invalid.`);
    }
    out[key] = v;
  }
  return out;
}
