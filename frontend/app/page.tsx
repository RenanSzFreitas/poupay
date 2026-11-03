'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Poupay</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : user ? (
        <>
          <p>Olá, {user.name}!</p>
          <button onClick={logout} className="rounded border px-4 py-2">
            Sair
          </button>
        </>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="rounded bg-green-600 px-4 py-2 text-white">
            Entrar
          </Link>
          <Link href="/cadastro" className="rounded border px-4 py-2">
            Criar conta
          </Link>
        </div>
      )}
    </main>
  );
}