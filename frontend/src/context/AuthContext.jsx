import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getCurrentUser, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Listen for auth errors from apiClient
    const handleAuthError = () => {
      setUser(null);
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [loadUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await apiLogin(email, password);
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        
        // If password change is required, don't load full user yet, let the UI redirect
        if (response.requires_password_change) {
          return { success: true, requires_password_change: true };
        }
        
        await loadUser();
        return { success: true, requires_password_change: false };
      }
      return { success: false };
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Incorrect email or password.');
      } else {
        setError('An unexpected error occurred.');
      }
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
