'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

// Itens ilustrativos do card "Exemplo de pedido"
const EXEMPLO = [
  { name: 'Shampoo', market: 'Confiança', price: 'R$ 18,90' },
  { name: 'Condicionador', market: 'Taust', price: 'R$ 21,50' },
];

const input =
  'w-full rounded-xl border border-[#e3e2d6] bg-[#fafaf6] px-4 py-3 text-[#1f2a12] placeholder:text-[#9a9a8c] focus:border-[#4f5e2f] focus:outline-none';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid flex-1 bg-[#f6f5ef] md:grid-cols-[1fr_1fr]">
      {/* Lado institucional */}
      <section className="relative hidden overflow-hidden bg-[#2f3d1e] px-12 py-14 text-white md:flex md:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#3b4a26]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#4f5e2f]" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8b931]">
            <span className="block h-4 w-5 rounded-[60%_0] bg-[#2f3d1e]" />
          </span>
          <span className="text-2xl font-bold">Poupay</span>
        </div>

        <span className="relative mt-16 w-fit rounded-full bg-[#e8b931] px-4 py-1 text-sm font-semibold text-[#2f3d1e]">
          Compare. Divida. Receba.
        </span>
        <h1 className="relative mt-6 text-5xl font-bold leading-tight">
          Cada item pelo menor preço, em um pedido só.
        </h1>
        <p className="relative mt-4 max-w-md text-lg text-white/80">
          Comparamos os mercados da sua região e o motoboy busca cada produto onde ele está mais barato.
        </p>

        <div className="relative mt-10 max-w-md rounded-3xl bg-white p-6 text-[#1f2a12] shadow-xl">
          <p className="mb-4 text-sm font-semibold text-[#6b6f5a]">Exemplo de pedido</p>
          {EXEMPLO.map((item) => (
            <div key={item.name} className="mb-3 flex items-center gap-4">
              <span className="h-12 w-12 rounded-xl bg-[#e8ecdc]" />
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#6b6f5a]">{item.market}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{item.price}</p>
                <span className="rounded-full bg-[#f6e3a8] px-2 py-0.5 text-xs font-semibold">
                  Mais barato
                </span>
              </div>
            </div>
          ))}
          <div className="mt-4 flex justify-between border-t border-dashed border-[#d9d9cc] pt-4">
            <span>Você economiza</span>
            <span className="font-bold text-[#4f5e2f]">R$ 7,30</span>
          </div>
        </div>

        <ol className="relative mt-auto flex gap-6 pt-10 text-sm text-white/80">
          {['Busque', 'Compare', 'Receba em casa'].map((step, i) => (
            <li key={step}>
              <span className="font-semibold text-[#e8b931]">{i + 1}</span> {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center p-4 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 text-[#1f2a12] shadow-xl sm:p-11"
        >
          <div>
            <h2 className="text-3xl font-bold">Que bom te ver!</h2>
            <p className="mt-1 text-[#6b6f5a]">Entre para economizar no seu próximo pedido.</p>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">E-mail</label>
            <input
              id="email"
              className={input}
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">Senha</label>
            <PasswordInput
              id="password"
              inputClassName={input}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Recuperação de senha ainda não existe no backend */}
          <div className="text-right">
            <span
              title="Em breve"
              className="cursor-not-allowed text-sm font-semibold text-[#4f5e2f] underline opacity-60"
            >
              Esqueci minha senha
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#4f5e2f] px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-[#435027] disabled:opacity-50"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="flex items-center gap-3 text-sm text-[#9a9a8c]">
            <span className="h-px flex-1 bg-[#e3e2d6]" />
            ou
            <span className="h-px flex-1 bg-[#e3e2d6]" />
          </div>

          {/* Login social ainda não existe no backend */}
          <button
            type="button"
            disabled
            title="Em breve"
            className="w-full cursor-not-allowed rounded-xl border border-[#e3e2d6] px-4 py-3 font-semibold opacity-60"
          >
            Continuar com Google
          </button>

          <p className="text-center text-[#6b6f5a]">
            Novo por aqui?{' '}
            <Link href="/cadastro" className="font-semibold text-[#4f5e2f] underline">
              Criar conta
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
