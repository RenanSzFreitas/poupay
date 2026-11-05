'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type Plan = { is_premium: boolean; premium_until: string | null };

export default function AssinaturaPage() {
  const { token, user, loading: authLoading, logout } = useRequireAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api<Plan>('/plan', { token })
      .then((p) => {
        if (!cancelled) setPlan(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Erro inesperado');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authLoading || !user) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  if (!plan) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Assinatura</h1>

      {plan.is_premium ? (
        <div className="mb-6 rounded border border-green-600 bg-green-900/20 p-4">
          <p className="font-semibold">Poupay Premium ativo</p>
          {plan.premium_until && (
            <p className="text-sm text-gray-400">
              Acesso até {new Date(plan.premium_until).toLocaleDateString('pt-BR')}.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded border border-gray-700 p-4">
          <p className="font-semibold">Você está no plano grátis</p>
          <p className="text-sm text-gray-400">
            A assinatura mensal estará disponível em breve.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded border border-gray-700 p-4">
          <h2 className="mb-2 font-semibold">Grátis</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Consultar supermercados e produtos</li>
            <li>Montar listas de compras</li>
            <li>Favoritar e selecionar supermercados</li>
            <li>Registrar compras e ver o histórico de gastos</li>
          </ul>
        </section>

        <section className="rounded border border-green-600 p-4">
          <h2 className="mb-2 font-semibold">Premium</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Tudo do plano grátis</li>
            <li>Comparação automática da lista entre supermercados</li>
            <li>Economia realizada e potencial em cada compra</li>
          </ul>
        </section>
      </div>
    </main>
  );
}