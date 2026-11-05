'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function CadastroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(name, email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-black';

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Criar conta</h1>

        <div>
          <label className="mb-1 block text-sm">Nome</label>
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">E-mail</label>
          <input
            className={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Senha (mínimo 8 caracteres)</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-green-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Criando...' : 'Criar conta'}
        </button>

        <p className="text-sm">
          Já tem conta?{' '}
          <Link href="/login" className="text-green-500 underline">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}