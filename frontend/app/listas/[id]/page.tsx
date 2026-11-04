'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type Item = {
  id: number;
  product_id: number;
  name: string;
  brand: string | null;
  unit: string;
  size: number;
  quantity: number;
  is_purchased: boolean;
};

type ListDetail = { id: number; name: string; items: Item[] };

type Product = {
  id: number;
  name: string;
  brand: string | null;
  unit: string;
  size: number;
};

function ListaConteudo() {
  const { id } = useParams<{ id: string }>();
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  // Carrega a lista (e recarrega quando o reloadKey muda)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api<ListDetail>(`/shopping-lists/${id}`, { token })
      .then((data) => {
        if (cancelled) return;
        setList(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, id, reloadKey]);

  // Busca produtos para adicionar (só a partir de 2 letras)
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      api<Product[]>(`/products?search=${encodeURIComponent(term)}`)
        .then((data) => {
          if (!cancelled) setResults(data.slice(0, 8));
        })
        .catch(() => {});
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  async function addProduct(productId: number) {
    if (!token) return;
    setError('');

    try {
      await api(`/shopping-lists/${id}/items`, {
        method: 'POST',
        token,
        body: { product_id: productId, quantity: 1 },
      });
      setSearch('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      fail(err);
    }
  }

  async function updateItem(item: Item, changes: { quantity?: number; is_purchased?: boolean }) {
    if (!token) return;
    setError('');

    try {
      await api(`/shopping-lists/${id}/items/${item.id}`, {
        method: 'PATCH',
        token,
        body: changes,
      });
      setList((l) =>
        l && { ...l, items: l.items.map((i) => (i.id === item.id ? { ...i, ...changes } : i)) }
      );
    } catch (err) {
      fail(err);
    }
  }

  async function removeItem(item: Item) {
    if (!token) return;
    setError('');

    try {
      await api(`/shopping-lists/${id}/items/${item.id}`, { method: 'DELETE', token });
      setList((l) => l && { ...l, items: l.items.filter((i) => i.id !== item.id) });
    } catch (err) {
      fail(err);
    }
  }

  if (authLoading || !user || loading) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  if (!list) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="mb-3 text-red-500">{error || 'Lista não encontrada.'}</p>
        <Link href="/listas" className="text-green-500 underline">
          Voltar às listas
        </Link>
      </main>
    );
  }

  const visibleResults = search.trim().length >= 2 ? results : [];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href="/listas" className="text-sm text-green-500 underline">
        ← Minhas listas
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{list.name}</h1>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <section className="mb-6">
        <input
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-black"
          placeholder="Buscar produto para adicionar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {visibleResults.length > 0 && (
          <ul className="mt-2 space-y-1">
            {visibleResults.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-gray-700 p-2"
              >
                <span className="text-sm">
                  {p.name}
                  <span className="text-gray-400">
                    {' '}
                    · {[p.brand, `${p.size} ${p.unit}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button
                  onClick={() => addProduct(p.id)}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {list.items.length === 0 ? (
        <p>A lista está vazia. Busque um produto acima para adicionar.</p>
      ) : (
        <ul className="space-y-2">
          {list.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded border border-gray-700 p-3"
            >
              <input
                type="checkbox"
                checked={item.is_purchased}
                onChange={(e) => updateItem(item, { is_purchased: e.target.checked })}
                className="h-4 w-4"
              />

              <div className={`flex-1 ${item.is_purchased ? 'line-through opacity-50' : ''}`}>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-400">
                  {[item.brand, `${item.size} ${item.unit}`].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateItem(item, { quantity: item.quantity - 1 })}
                  disabled={item.quantity <= 1}
                  className="h-7 w-7 rounded border border-gray-600 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateItem(item, { quantity: item.quantity + 1 })}
                  disabled={item.quantity >= 1000}
                  className="h-7 w-7 rounded border border-gray-600 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => removeItem(item)}
                className="rounded border border-gray-600 px-2 py-1 text-xs hover:bg-gray-800"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function ListaPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-4">Carregando...</main>}>
      <ListaConteudo />
    </Suspense>
  );
}