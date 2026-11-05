'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-gray-700 px-4 py-3">
      <nav className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-green-500">
            Poupay
          </Link>
          <Link href="/supermercados" className="text-sm hover:underline">
            Supermercados
          </Link>
          <Link href="/produtos" className="text-sm hover:underline">
            Produtos
          </Link>
          <Link href="/listas" className="text-sm hover:underline">
            Listas
          </Link>
          <Link href="/historico" className="text-sm hover:underline">
            Histórico
          </Link>
          <Link href="/assinatura" className="text-sm hover:underline">
            Premium
          </Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <span>{user.name}</span>
              <button onClick={logout} className="rounded border px-3 py-1">
                Sair
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded bg-green-600 px-3 py-1 text-white">
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}