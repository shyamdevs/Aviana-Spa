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
    async login(payload) { const result = await api.post('/auth/login', payload); setUser(result.user); return result.user; },
    async register(payload) { const result = await api.post('/auth/register', payload); setUser(result.user); return result.user; },
    async logout() { await api.post('/auth/logout', {}); setUser(null); },
    async refresh() { const result = await api.post('/auth/refresh', {}); setUser(result.user); return result.user; }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
