import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PublicUser, UserRole } from '../../packages/shared/types';
import { apiFetch, setAccessToken } from '../services/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    role: UserRole.TENANT | UserRole.PG_OWNER;
    fullName: string;
    email: string;
    phone: string;
    businessName?: string;
    password: string;
    confirmPassword: string;
    acceptTerms: true;
  }) => Promise<{ user: PublicUser; devOtpHint?: string }>;
  verifyOtp: (code: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        setAccessToken(null);
        setUser(null);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (identifier: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; user: PublicUser }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      },
      false
    );
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    role: UserRole.TENANT | UserRole.PG_OWNER;
    fullName: string;
    email: string;
    phone: string;
    businessName?: string;
    password: string;
    confirmPassword: string;
    acceptTerms: true;
  }) => {
    const data = await apiFetch<{
      accessToken: string;
      user: PublicUser;
      devOtpHint?: string;
    }>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      false
    );
    setAccessToken(data.accessToken);
    setUser(data.user);
    return { user: data.user, devOtpHint: data.devOtpHint };
  };

  const verifyOtp = async (code: string) => {
    const data = await apiFetch<{ user: PublicUser }>('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' }, false).catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const data = await apiFetch<{ user: PublicUser }>('/api/v1/auth/me');
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
