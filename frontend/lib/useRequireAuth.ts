'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth';

// Usa em telas que exigem login: se não houver usuário, redireciona para /login
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace('/login');
    }
  }, [auth.loading, auth.user, router]);

  return auth;
}