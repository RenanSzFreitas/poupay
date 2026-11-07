'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Loading, PageTitle } from '@/components/ui';

export default function ObrigadoPage() {
  const { token, user, loading } = useRequireAuth();
  const [status, setStatus] = useState<'checking' | 'active' | 'slow'>('checking');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let attempts = 0;

    const timer = setInterval(async () => {
      attempts += 1;

      try {
        const plan = await api<{ is_premium: boolean }>('/plan', { token });
        if (cancelled) return;
        if (plan.is_premium) {
          setStatus('active');
          clearInterval(timer);
          return;
        }
      } catch {
        // tenta de novo no próximo ciclo
      }

      if (!cancelled && attempts >= 20) {
        setStatus('slow');
        clearInterval(timer);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  if (loading || !user) return <Loading />;

  return (
    <main className="page">
      <PageTitle title="Obrigado!" subtitle="Estamos confirmando seu pagamento com o banco." />

      <section className="card mx-auto max-w-md py-10 text-center" aria-live="polite">
        {status === 'checking' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive">
              <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">Confirmando seu pagamento...</h2>
            <p className="mt-1 text-muted">Aguarde um instante, estamos confirmando com o banco.</p>
          </>
        )}

        {status === 'active' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">Pagamento confirmado!</h2>
            <p className="mt-1 text-muted">Seu Premium já está ativo.</p>
            <Link href="/listas" className="btn-primary mt-6">Ver minhas listas</Link>
          </>
        )}

        {status === 'slow' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-forest">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">Ainda estamos confirmando</h2>
            <p className="mt-1 text-muted">
              Está demorando um pouco. Seu acesso é liberado assim que o pagamento for confirmado.
            </p>
            <Link href="/assinatura" className="btn-outline mt-6 px-5 py-2.5">Ver assinatura</Link>
          </>
        )}
      </section>
    </main>
  );
}
