import { useCallback, useEffect, useState } from 'react';
import { api, clearSession, saveSession } from '../../lib/api.js';
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    let token = null;
    try { token = window.localStorage.getItem('topx_token'); } catch {}
    if (!token) { setLoading(false); document.body.classList.add('auth-locked'); return; }
    api('/api/auth/me').then(({user: current}) => {
      if (!alive) return;
      setUser(current); try { window.localStorage.setItem('topx_user', JSON.stringify(current)); } catch {}
      document.body.classList.remove('auth-locked');
    }).catch(() => { clearSession(); document.body.classList.add('auth-locked'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const authenticate = useCallback(async ({ name, email, password }) => {
    setError('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify({ name, email, password }) });
      saveSession(result); setUser(result.user); document.body.classList.remove('auth-locked');
      return result.user;
    } catch (e) { setError(e.message); throw e; }
  }, [authMode]);
  const logout = useCallback(() => { clearSession(); setUser(null); document.body.classList.add('auth-locked'); }, []);
  const updateUser = useCallback((next) => { setUser(next); try { window.localStorage.setItem('topx_user', JSON.stringify(next)); } catch {} }, []);
  return { user, setUser: updateUser, loading, authMode, setAuthMode, error, setError, authenticate, logout };
}
