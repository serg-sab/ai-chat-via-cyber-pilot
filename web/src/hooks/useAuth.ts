import { useState, useEffect, useCallback } from 'react';
import type { User } from '../lib/api';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from '../lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await getCurrentUser();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem('token');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    localStorage.setItem('token', result.token);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
    return result.user;
  };

  const register = async (email: string, password: string) => {
    const result = await apiRegister(email, password);
    localStorage.setItem('token', result.token);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
    return result.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };
}
