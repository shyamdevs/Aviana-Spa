export function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}
export function assertPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 72) {
    const error = new Error('Password must be 8–72 characters.'); error.status = 400; throw error;
  }
}
export function assertEmail(value) {
  const email = cleanEmail(value);
  if (!/^\S+@\S+\.\S+$/.test(email)) { const error = new Error('Enter a valid email address.'); error.status = 400; throw error; }
  return email;
}
