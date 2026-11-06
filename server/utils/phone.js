// Server-side phone validation to E.164. libphonenumber-js is the recommended library, but no
// package can be installed in this environment, so this implements the E.164 structure rules and
// the Indian numbering plan (mobiles start 6-9). Replace with libphonenumber-js when available.
export function normalizePhone(input, defaultCountry = '+91') {
  const raw = String(input ?? '').trim();
  if (!raw || raw.length > 20 || /[^\d\s()+\-.]/.test(raw)) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith('+')) {
    digits = digits.replace(/^0+/, '');
    digits = `${defaultCountry}${digits}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}
