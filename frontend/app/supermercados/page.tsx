'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Market = {
  id: number;
  name: string;
  address: string | null;
  city: string;
};

type Filter = 'todos' | 'selecionados' | 'favoritos';

export default function SupermercadosPage() {
  const { token, logout } = useAuth();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  // Lista de supermercados, com busca
  useEffect(() => {
    let cancelled = false;

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

  // Favoritos e seleção do usuário (só se estiver logado)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      api<Market[]>('/users/me/favorite-markets', { token }),
      api<Market[]>('/users/me/selected-markets', { token }),
    ])
      .then(([favs, sels]) => {
        if (cancelled) return;
        setFavorites(favs.map((m) => m.id));
        setSelected(sels.map((m) => m.id));
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function toggleFavorite(marketId: number) {
    if (!token) return;
    setError('');

    try {
      if (favorites.includes(marketId)) {
        await api(`/users/me/favorite-markets/${marketId}`, { method: 'DELETE', token });
        setFavorites((prev) => prev.filter((x) => x !== marketId));
      } else {
        await api('/users/me/favorite-markets', {
          method: 'POST',
          token,
          body: { market_id: marketId },
        });
        setFavorites((prev) => [...prev, marketId]);
      }
    } catch (err) {
      fail(err);
    }
  }

  // A seleção é salva inteira de uma vez (a API troca a lista toda)
  async function toggleSelected(marketId: number) {
    if (!token) return;
    setError('');

    const next = selected.includes(marketId)
      ? selected.filter((x) => x !== marketId)
      : [...selected, marketId];

    try {
      await api('/users/me/selected-markets', {
        method: 'PUT',
        token,
        body: { market_ids: next },
      });
      setSelected(next);
    } catch (err) {
      fail(err);
    }
  }

  const loggedIn = Boolean(token);
  const favs = loggedIn ? favorites : [];
  const sels = loggedIn ? selected : [];

  const visible = markets.filter((m) =>
    filter === 'favoritos' ? favs.includes(m.id) : filter === 'selecionados' ? sels.includes(m.id) : true
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'selecionados', label: 'Selecionados' },
    { key: 'favoritos', label: 'Favoritos' },
  ];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-1 text-2xl font-bold">Supermercados</h1>

      {loggedIn ? (
        <p className="mb-4 text-sm text-gray-400">
          ★ Favorito é um atalho para os mercados que você mais usa. Marcar &quot;Comparar&quot; define
          os mercados que entram nas suas comparações.
        </p>
      ) : (
        <p className="mb-4 text-sm text-gray-400">
          <Link href="/login" className="text-green-500 underline">
            Entre
          </Link>{' '}
          para favoritar e selecionar supermercados.
        </p>
      )}

      <input
        className="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black"
        placeholder="Buscar por nome ou cidade"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loggedIn && (
        <div className="mb-4 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded border px-3 py-1 text-sm ${
                filter === t.key ? 'border-green-600 bg-green-700 text-white' : 'border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <p>Carregando...</p>
      ) : visible.length === 0 ? (
        <p>
          {filter === 'todos'
            ? 'Nenhum supermercado encontrado.'
            : 'Nenhum supermercado nesta visão.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded border border-gray-700 p-3"
            >
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-gray-400">
                  {[m.address, m.city].filter(Boolean).join(' · ')}
                </p>
              </div>

              {loggedIn && (
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={sels.includes(m.id)}
                      onChange={() => toggleSelected(m.id)}
                      className="h-4 w-4"
                    />
                    Comparar
                  </label>
                  <button
                    onClick={() => toggleFavorite(m.id)}
                    aria-label={favs.includes(m.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    className={`text-2xl leading-none ${
                      favs.includes(m.id) ? 'text-yellow-400' : 'text-gray-500'
                    }`}
                  >
                    {favs.includes(m.id) ? '★' : '☆'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}