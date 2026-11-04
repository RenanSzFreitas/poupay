'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Market = {
  id: number;
  name: string;
  address: string | null;
  city: string;
};

export default function SupermercadosPage() {
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Espera 300 ms depois da última tecla, para não consultar a API a cada letra
    const timer = setTimeout(() => {
      setLoading(true);
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

      api<Market[]>(`/markets${query}`)
        .then((data) => {
          if (cancelled) return;
          setMarkets(data);
          setError('');
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Supermercados</h1>

      <input
        className="mb-4 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black"
        placeholder="Buscar por nome ou cidade"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <p>Carregando...</p>
      ) : markets.length === 0 ? (
        <p>Nenhum supermercado encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {markets.map((m) => (
            <li key={m.id} className="rounded border border-gray-700 p-3">
              <p className="font-semibold">{m.name}</p>
              <p className="text-sm text-gray-400">
                {[m.address, m.city].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}