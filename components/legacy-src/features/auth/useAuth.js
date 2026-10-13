import { useCallback, useEffect, useState } from 'react';
import { api, clearSession, saveSession } from '../../lib/api.js';
import { auth, googleProvider, isFirebaseConfigured } from '../../../../lib/firebase/config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// Shared state across all useAuth consumers
let globalUser = null;
let globalLoading = true;
let globalError = '';
let initialized = false;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn({ user: globalUser, loading: globalLoading, error: globalError }));
}

function setGlobalState(updates) {
  if ('user' in updates) {
    globalUser = updates.user;
    if (typeof window !== 'undefined') {
      try {
        if (updates.user) {
          window.localStorage.setItem('topx_user', JSON.stringify(updates.user));
          document.body.classList.remove('auth-locked');
        } else {
          window.localStorage.removeItem('topx_user');
        }
      } catch (_) {}
    }
  }
  if ('loading' in updates) globalLoading = updates.loading;
  if ('error' in updates) globalError = updates.error;
  notifyListeners();
}

function initSession() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  let token = null;
  try { token = window.localStorage.getItem('topx_token'); } catch (_) {}

  if (token) {
    api('/api/auth/me')
      .then(({ user: current }) => {
        setGlobalState({ user: current, loading: false, error: '' });
      })
      .catch(() => {
        clearSession();
        setGlobalState({ user: null, loading: false, error: '' });
      });
  } else {
    setGlobalState({ user: null, loading: false, error: '' });
  }

  // Firebase auth observer if configured
  if (auth && isFirebaseConfigured) {
    try {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser && !globalUser) {
          try {
            const idToken = await fbUser.getIdToken();
            const res = await api('/api/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: idToken })
            });
            saveSession(res);
            setGlobalState({ user: res.user, loading: false, error: '' });
          } catch (_) {}
        }
      });
    } catch (_) {}
  }
}

export function useAuth() {
  const [state, setState] = useState(() => ({
    user: globalUser,
    loading: globalLoading,
    error: globalError
  }));
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    initSession();
    const listener = (nextState) => setState({ ...nextState });
    listeners.add(listener);
    setState({ user: globalUser, loading: globalLoading, error: globalError });
    return () => { listeners.delete(listener); };
  }, []);

  const setError = useCallback((err) => {
    setGlobalState({ error: err || '' });
  }, []);

  const authenticate = useCallback(async ({ name, email, password }) => {
    setError('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      saveSession(result);
      setGlobalState({ user: result.user, loading: false, error: '' });
      return result.user;
    } catch (e) {
      setError(e.message || 'Authentication failed');
      throw e;
    }
  }, [authMode, setError]);

  const loginWithGoogle = useCallback(async () => {
    setError('');
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const msg = 'Firebase Google Sign-In is not configured yet. Please configure the NEXT_PUBLIC_FIREBASE_* environment variables in .env.local and enable Google in the Firebase Console.';
      setError(msg);
      throw new Error(msg);
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await api('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: idToken })
      });
      saveSession(res);
      setGlobalState({ user: res.user, loading: false, error: '' });
      return res.user;
    } catch (err) {
      let message = err.message || 'Google sign-in failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completing.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'Google sign-in popup was blocked by browser. Please allow popups for localhost.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        message = 'Previous sign-in request was cancelled.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.';
      }
      setError(message);
      throw new Error(message);
    }
  }, [setError]);

  const logout = useCallback(async () => {
    try {
      if (auth && isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (_) {}
    clearSession();
    setGlobalState({ user: null, loading: false, error: '' });
  }, []);

  const updateUser = useCallback((next) => {
    setGlobalState({ user: next });
  }, []);

  return {
    user: state.user,
    setUser: updateUser,
    loading: state.loading,
    authMode,
    setAuthMode,
    error: state.error,
    setError,
    authenticate,
    loginWithGoogle,
    logout,
    isFirebaseConfigured
  };
}
