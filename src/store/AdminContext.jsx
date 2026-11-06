import { createContext, useContext, useState } from 'react';
import Swal from 'sweetalert2';
import { API_URL, CSRF_HEADERS } from '../services/api';

const ADMIN_API_URL = `${API_URL}/admin`;
const AUTH_STEPS = ['/auth/login', '/auth/me', '/auth/mfa', '/auth/mfa/enroll', '/auth/reauth'];

async function promptReauth(client) {
  const { value } = await Swal.fire({
    title: 'Confirm it is you', confirmButtonText: 'Confirm', showCancelButton: true, focusConfirm: false,
    html: '<input id="re-pw" type="password" class="swal2-input" placeholder="Password" autocomplete="current-password"><input id="re-code" class="swal2-input" placeholder="6-digit authenticator code" inputmode="numeric" autocomplete="one-time-code">',
    preConfirm: () => ({ password: document.getElementById('re-pw').value, code: document.getElementById('re-code').value }),
  });
  if (!value) return false;
  try { await client.request('/auth/reauth', { method: 'POST', body: JSON.stringify(value) }); return true; }
  catch (err) { await Swal.fire({ icon: 'error', title: 'Could not confirm', text: err.message }); return false; }
}

export const adminApi = {
  async request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    let res;
    try {
      res = await fetch(`${ADMIN_API_URL}${path}`, { credentials: 'include', ...options, headers: { ...CSRF_HEADERS, ...(isFormData || !options.body ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
    } catch {
      const error = new Error('Could not reach the server. Please check your connection and try again.');
      error.status = 0;
      throw error;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || 'Admin request failed.');
      error.status = res.status;
      error.data = data;
      // Sensitive action: ask for password + authenticator code once, then retry the request.
      if (res.status === 401 && data.code === 'REAUTH_REQUIRED' && !options._retried && (await promptReauth(this))) return this.request(path, { ...options, _retried: true });
      // Expired/invalid admin session: send the admin back to the login page.
      if (res.status === 401 && data.code !== 'REAUTH_REQUIRED' && !AUTH_STEPS.includes(path) && window.location.pathname !== '/admin/login') {
        window.location.assign('/admin/login');
      }
      throw error;
    }
    return data;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }); },
  patch(path, body) { return this.request(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }); },
  delete(path) { return this.request(path, { method: 'DELETE' }); },
};
const AdminContext = createContext(null);
export function AdminProvider({ children }) { const [admin, setAdmin] = useState(null); return <AdminContext.Provider value={{ admin, setAdmin, clear: () => setAdmin(null) }}>{children}</AdminContext.Provider>; }
export const useAdmin = () => useContext(AdminContext);
