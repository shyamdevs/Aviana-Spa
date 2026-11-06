import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/session').then(({ user }) => setUser(user || null)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    // Returns { user } on success, or { mfaRequired, mfaToken } when a second factor is still needed.
    async login(payload) { const r = await api.post('/auth/login', payload); if (r.user) setUser(r.user); return r; },
    async google(idToken) { const r = await api.post('/auth/google', { idToken }); if (r.user) setUser(r.user); return r; },
    async loginMfa(payload) { const r = await api.post('/auth/login/mfa', payload); setUser(r.user); return r.user; },
    async logout() { await api.post('/auth/logout', {}); setUser(null); },
    async refresh() { const result = await api.post('/auth/refresh', {}); setUser(result.user); return result.user; }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
