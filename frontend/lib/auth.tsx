'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export type User = { id: number; name: string; email: string };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'poupay_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir o site, confere se o token guardado ainda vale
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);

    if (!saved) {
      setLoading(false);
      return;
    }

    api<User>('/auth/me', { token: saved })
      .then((u) => {
        setUser(u);
        setToken(saved);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    await api('/auth/register', { method: 'POST', body: { name, email, password } });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de um AuthProvider');
  return ctx;
}