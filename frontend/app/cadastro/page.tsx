'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import PasswordInput from '@/components/PasswordInput';
import { ErrorText } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function CadastroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }

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

  return (
    <main className="grid min-h-screen flex-1 bg-cream md:grid-cols-2">
      {/* Lado institucional */}
      <section className="relative hidden overflow-hidden bg-forest px-12 py-14 text-white md:flex md:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-forest-2" />

        <div className="relative">
          <Logo variant="light" />
        </div>

        <div className="relative mt-auto">
          <h1 className="max-w-lg text-4xl font-extrabold leading-tight lg:text-5xl">
            Crie sua conta e comece a economizar.
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Listas de compras, comparação entre supermercados e histórico de economia.
          </p>
        </div>

        <p className="relative mt-auto pt-10 text-sm text-white/70">Grátis para começar.</p>
      </section>

      {/* Formulário */}
      <section className="flex flex-col items-center justify-center gap-6 p-4 py-12">
        <div className="md:hidden">
          <Logo />
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-xl sm:p-10">
          <div>
            <h2 className="text-3xl font-extrabold text-forest">Criar conta</h2>
            <p className="mt-1 text-muted">Leva menos de um minuto.</p>
          </div>

          <div>
            <label htmlFor="name" className="label">Nome</label>
            <input
              id="name"
              className="field"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className="label">E-mail</label>
            <input
              id="email"
              className="field"
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Senha</label>
            <PasswordInput
              id="password"
              inputClassName="field"
              placeholder="Crie uma senha (mínimo 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="label">Confirmar senha</label>
            <PasswordInput
              id="confirm"
              inputClassName="field"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>

          <ErrorText>{error}</ErrorText>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? 'Criando...' : 'Criar conta'}
          </button>

          <p className="text-center text-muted">
            Já tem conta?{' '}
            <Link href="/login" className="link">Entrar</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
