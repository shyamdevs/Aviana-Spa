import { createContext, useContext, useState } from 'react';
import { API_URL } from '../services/api';

const ADMIN_API_URL = `${API_URL}/admin`;

export const adminApi = {
  async request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    let res;
    try {
      res = await fetch(`${ADMIN_API_URL}${path}`, { credentials: 'include', ...options, headers: { ...(isFormData || !options.body ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
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
      // Expired/invalid admin session: send the admin back to the login page.
      if (res.status === 401 && !['/auth/login', '/auth/me'].includes(path) && window.location.pathname !== '/admin/login') {
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
