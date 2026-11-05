'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

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

  if (loading || !user) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      {status === 'checking' && (
        <>
          <h1 className="mb-2 text-2xl font-bold">Confirmando seu pagamento...</h1>
          <p className="text-sm text-gray-400">Isso costuma levar alguns segundos.</p>
        </>
      )}

      {status === 'active' && (
        <>
          <h1 className="mb-2 text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="mb-4">Seu acesso ao Poupay Premium já está liberado.</p>
          <Link href="/listas" className="rounded bg-green-600 px-4 py-2 text-white">
            Ir para minhas listas
          </Link>
        </>
      )}

      {status === 'slow' && (
        <>
          <h1 className="mb-2 text-2xl font-bold">Ainda estamos confirmando</h1>
          <p className="mb-4 text-sm text-gray-400">
            A confirmação do pagamento está demorando mais que o normal. Seu acesso será liberado
            assim que ela chegar. Se você não pagou, é só voltar e tentar de novo.
          </p>
          <Link href="/assinatura" className="rounded border px-4 py-2">
            Ver minha assinatura
          </Link>
        </>
      )}
    </main>
  );
}