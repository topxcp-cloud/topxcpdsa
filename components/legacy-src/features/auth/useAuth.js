import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
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
      if (updates.user) document.body.classList.remove('auth-locked');
    }
  }
  if ('loading' in updates) globalLoading = updates.loading;
  if ('error' in updates) globalError = updates.error;
  notifyListeners();
}

let googleAuthPromise = null;
async function syncGoogleUser(fbUser) {
  if (globalUser) return globalUser;
  if (googleAuthPromise) return googleAuthPromise;
  googleAuthPromise = (async () => {
    try {
      const idToken = await fbUser.getIdToken();
      const res = await api('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: idToken,
          uid: fbUser.uid,
          photoURL: fbUser.photoURL || '',
          name: fbUser.displayName || '',
          email: fbUser.email || ''
        })
      });
      setGlobalState({ user: res.user, loading: false, error: '' });
      return res.user;
    } finally {
      googleAuthPromise = null;
    }
  })();
  return googleAuthPromise;
}

function initSession() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  api('/api/auth/me')
    .then(({ user: current }) => {
      setGlobalState({ user: current, loading: false, error: '' });
    })
    .catch(error => {
      setGlobalState({
        user: null,
        loading: false,
        error: error.status === 401 ? '' : (error.message || 'Could not connect to the database.')
      });
    });

  // Firebase auth observer if configured
  if (auth && isFirebaseConfigured) {
    try {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser && !globalUser) {
          try {
            await syncGoogleUser(fbUser);
          } catch (error) {
            setGlobalState({ error: error.message || 'Google sign-in failed.' });
          }
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
    setState(prev => {
      if (prev.user === globalUser && prev.loading === globalLoading && prev.error === globalError) {
        return prev;
      }
      return { user: globalUser, loading: globalLoading, error: globalError };
    });
    return () => { listeners.delete(listener); };
  }, []);

  const setError = useCallback((err) => {
    setGlobalState({ error: err || '' });
  }, []);

  const authenticate = useCallback(async () => {
    const msg = 'Email and password authentication has been disabled. Please sign in with your Google account.';
    setError(msg);
    throw new Error(msg);
  }, [setError]);

  const loginWithGoogle = useCallback(async () => {
    setError('');
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const msg = 'Firebase Google Sign-In is not configured yet. Please configure the NEXT_PUBLIC_FIREBASE_* environment variables in .env.local and enable Google in the Firebase Console.';
      setError(msg);
      throw new Error(msg);
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = await syncGoogleUser(result.user);
      if (user && typeof window !== 'undefined' && typeof window.replayTopxIntro === 'function') {
        window.replayTopxIntro();
      }
      return user;
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
      await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      setGlobalState({ error: error.message || 'Could not sign out.' });
      return;
    }
    try {
      if (auth && isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (error) {
      setGlobalState({ error: error.message || 'Could not sign out of Google.' });
    }
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
