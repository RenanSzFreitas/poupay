'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type Plan = {
  is_premium: boolean;
  premium_until: string | null;
  subscription_status: 'active' | 'cancelled' | null;
};

export default function AssinaturaPage() {
  const { token, user, loading: authLoading, logout } = useRequireAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

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

  // Pede o endereço de pagamento ao backend e leva o usuário até lá
  async function subscribe() {
    if (!token) return;
    setError('');
    setStarting(true);

    try {
      const { url } = await api<{ url: string }>('/billing/checkout', {
        method: 'POST',
        token,
      });
      window.location.assign(url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Erro inesperado');
      setStarting(false);
    }
  }

  if (authLoading || !user || (!plan && !error)) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  const until = plan?.premium_until
    ? new Date(plan.premium_until).toLocaleDateString('pt-BR')
    : null;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Assinatura</h1>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {plan?.is_premium ? (
        <div className="mb-6 rounded border border-green-600 bg-green-900/20 p-4">
          <p className="font-semibold">
            {plan.subscription_status === 'cancelled'
              ? 'Assinatura cancelada'
              : 'Poupay Premium ativo'}
          </p>
          {until && (
            <p className="text-sm text-gray-400">
              {plan.subscription_status === 'cancelled'
                ? `Você mantém o acesso até ${until}.`
                : `Acesso garantido até ${until}.`}
            </p>
          )}
        </div>
      ) : (
        plan && (
          <div className="mb-6 rounded border border-gray-700 p-4">
            <p className="font-semibold">Você está no plano grátis</p>
            <p className="mb-3 text-sm text-gray-400">
              Assine para comparar suas listas automaticamente entre os supermercados. O valor é
              mostrado na página de pagamento, antes de você confirmar.
            </p>
            <button
              onClick={subscribe}
              disabled={starting}
              className="rounded bg-green-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {starting ? 'Abrindo o pagamento...' : 'Assinar o Premium'}
            </button>
          </div>
        )
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