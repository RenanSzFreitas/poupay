'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { ErrorText, Loading, PageTitle } from '@/components/ui';

// O preço é definido no produto do AbacatePay; aqui só exibimos (ex.: NEXT_PUBLIC_PREMIUM_PRICE=9,90)
const PREMIUM_PRICE = process.env.NEXT_PUBLIC_PREMIUM_PRICE;

const FREE = ['Catálogo de supermercados e produtos', 'Listas de compras', 'Histórico de compras'];
const PREMIUM = ['Tudo do plano Grátis', 'Comparar preços entre supermercados', 'Cálculo de quanto você economizou'];

function Check({ className }: { className: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`mt-0.5 shrink-0 ${className}`}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

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

  if (authLoading || !user || (!plan && !error)) return <Loading />;

  const until = plan?.premium_until
    ? new Date(plan.premium_until).toLocaleDateString('pt-BR')
    : null;
  const premium = Boolean(plan?.is_premium);
  const statusText = premium
    ? plan?.subscription_status === 'cancelled'
      ? `Status: cancelado${until ? ` · acesso até ${until}` : ''}`
      : `Status: ativo${until ? ` · válido até ${until}` : ''}`
    : 'Comparação de preços disponível no Premium';

  return (
    <main className="page">
      <PageTitle title="Assinatura" subtitle="Escolha o plano ideal para você." />

      <div className="mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      {plan && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-sage px-5 py-4">
          <div>
            <p className="font-bold">Plano atual: {premium ? 'Premium' : 'Grátis'}</p>
            <p className="text-xs text-muted">{statusText}</p>
          </div>
          <span className="text-sm font-bold">{premium ? 'Premium' : 'Grátis'}</span>
        </div>
      )}

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-bold">Grátis</h2>
          <p className="mt-3 text-3xl font-extrabold">R$ 0</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="text-gold-dark" />
                {f}
              </li>
            ))}
          </ul>
          <div className="btn-outline mt-6 w-full cursor-default py-2.5 hover:border-line hover:text-ink">
            {premium ? 'Incluído no Premium' : 'Plano atual'}
          </div>
        </section>

        <section className="rounded-3xl bg-forest p-6 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Premium</h2>
            <span className="badge-gold">Recomendado</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold">
            {PREMIUM_PRICE ? (
              <>
                R$ {PREMIUM_PRICE}
                <span className="text-sm font-medium text-white/70"> /mês</span>
              </>
            ) : (
              <span className="text-lg font-semibold">Valor mostrado no pagamento</span>
            )}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PREMIUM.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="text-gold" />
                {f}
              </li>
            ))}
          </ul>
          {premium ? (
            <div className="mt-6 rounded-xl bg-forest-2 py-2.5 text-center font-semibold text-gold">
              {plan?.subscription_status === 'cancelled' ? 'Assinatura cancelada' : 'Plano atual'}
            </div>
          ) : (
            <button onClick={subscribe} disabled={starting} className="btn-gold mt-6 w-full">
              {starting ? 'Abrindo o pagamento...' : 'Assinar o Premium'}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
