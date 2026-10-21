'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { adminLogin, adminLogout, checkSession, AdminApiError } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  login: (key: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  error: '',
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession()
      .then(() => setIsAuthenticated(true))
      .catch((err: unknown) => {
        setIsAuthenticated(false);
        if (!(err instanceof AdminApiError) || err.status !== 401) {
          setError(err instanceof Error ? err.message : 'Could not verify the admin session.');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (key: string) => {
    setError('');
    try {
      const data = await adminLogin(key);
      setIsAuthenticated(true);
    } catch (err: any) {
      const message = err instanceof AdminApiError ? err.message : 'Login failed. Check your admin key.';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
      setIsAuthenticated(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
