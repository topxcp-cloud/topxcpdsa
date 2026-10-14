'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { adminLogin, setToken, clearToken, hasToken, checkSession, AdminApiError } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  login: (key: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  error: '',
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasToken()) {
      checkSession()
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          clearToken();
          setIsAuthenticated(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (key: string) => {
    setError('');
    try {
      const data = await adminLogin(key);
      setToken(data.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      const message = err instanceof AdminApiError ? err.message : 'Login failed. Check your admin key.';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setError('');
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
