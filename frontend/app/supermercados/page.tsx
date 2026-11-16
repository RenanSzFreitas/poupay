'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorText, PageTitle, Thumb } from '@/components/ui';

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
    <main className="page">
      <PageTitle
        title="Supermercados"
        subtitle={
          loggedIn ? (
            'Escolha quais mercados entram nas suas comparações.'
          ) : (
            <>
              <Link href="/login" className="link">Entre</Link> para favoritar e escolher os mercados das suas
              comparações.
            </>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {loggedIn ? (
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={filter === t.key ? 'chip-active' : 'chip'}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <input
          className="field w-full py-2 sm:w-72"
          placeholder="Buscar por nome ou cidade"
          aria-label="Buscar supermercado"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : loading ? (
        <p className="text-muted">Carregando...</p>
      ) : visible.length === 0 ? (
        <p className="text-muted">
          {filter === 'todos' ? 'Nenhum supermercado encontrado.' : 'Nenhum supermercado nesta visão.'}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => {
            const isSel = sels.includes(m.id);
            const isFav = favs.includes(m.id);
            return (
              <li
                key={m.id}
                className={`card border-2 p-5 transition ${isSel ? 'border-olive' : 'border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <Thumb label={m.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{m.name}</p>
                    <p className="truncate text-xs text-muted">
                      {[m.address, m.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {loggedIn && (
                    <button
                      onClick={() => toggleFavorite(m.id)}
                      aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      aria-pressed={isFav}
                      className={`text-2xl leading-none transition ${isFav ? 'text-gold' : 'text-ink/50 hover:text-gold'}`}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                  )}
                </div>

                {loggedIn && (
                  <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleSelected(m.id)}
                      className="h-4 w-4 accent-olive"
                    />
                    Usar nas comparações
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
