// The single-use password-reset authorization token lives ONLY in this module-level variable:
// never in localStorage, sessionStorage, the URL, router state or a cookie. A page refresh
// discards it, which simply restarts the (cheap) recovery flow.
let token = null;
let expiresAt = 0;
export const setResetToken = (value, seconds = 300) => { token = value; expiresAt = Date.now() + seconds * 1000; };
export const takeResetToken = () => (token && Date.now() < expiresAt ? token : null);
export const clearResetToken = () => { token = null; expiresAt = 0; };
