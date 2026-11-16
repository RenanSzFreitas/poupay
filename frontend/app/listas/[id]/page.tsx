'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { ErrorText, Loading, PageTitle, Thumb } from '@/components/ui';

type Item = {
  id: number;
  product_id: number;
  name: string;
  brand: string | null;
  unit: string;
  size: number;
  category: string;
  quantity: number;
  is_purchased: boolean;
};

type ListDetail = { id: number; name: string; items: Item[] };

type Product = {
  id: number;
  name: string;
  brand: string | null;
  category: string;
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

  // Produtos para adicionar: o começo do catálogo, ou a busca a partir de 2 letras
  useEffect(() => {
    const term = search.trim();
    let cancelled = false;
    const timer = setTimeout(
      () => {
        const query = term.length >= 2 ? `?search=${encodeURIComponent(term)}` : '';
        api<Product[]>(`/products${query}`)
          .then((data) => {
            if (!cancelled) setResults(data.slice(0, 8));
          })
          .catch(() => {});
      },
      term ? 300 : 0
    );

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

  if (authLoading || !user || loading) return <Loading />;

  if (!list) {
    return (
      <main className="page">
        <div className="mb-3">
          <ErrorText>{error || 'Lista não encontrada.'}</ErrorText>
        </div>
        <Link href="/listas" className="link">Voltar às listas</Link>
      </main>
    );
  }

  const inList = new Set(list.items.map((i) => i.product_id));
  const showResults = search.trim().length === 1 ? [] : results;

  return (
    <main className="page">
      <Link href="/listas" className="text-sm font-semibold text-muted hover:text-olive">
        ← Minhas listas
      </Link>
      <div className="mt-2">
        <PageTitle
          title={list.name}
          subtitle="Adicione produtos e ajuste as quantidades."
          action={
            list.items.length > 0 && (
              <Link href={`/listas/${list.id}/comparar`} className="btn-gold">
                Comparar preços
              </Link>
            )
          }
        />
      </div>

      <div className="mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-xl font-bold">Adicionar produtos</h2>
          <label htmlFor="buscar" className="label">Buscar</label>
          <input
            id="buscar"
            className="field mb-4"
            placeholder="Buscar no catálogo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {showResults.length === 0 ? (
            <p className="text-sm text-muted">
              {search.trim().length === 1 ? 'Digite mais uma letra para buscar.' : 'Nenhum produto encontrado.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {showResults.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <Thumb label={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted">
                      {[p.category, p.brand, `${p.size} ${p.unit}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => addProduct(p.id)}
                    disabled={inList.has(p.id)}
                    className="btn-outline px-3 py-1.5"
                  >
                    {inList.has(p.id) ? 'Na lista' : 'Adicionar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-bold">Itens da lista</h2>

          {list.items.length === 0 ? (
            <p className="text-sm text-muted">A lista está vazia. Adicione produtos ao lado.</p>
          ) : (
            <ul className="space-y-3">
              {list.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <Thumb label={item.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted">
                      {[item.brand, `${item.size} ${item.unit}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateItem(item, { quantity: item.quantity - 1 })}
                      disabled={item.quantity <= 1}
                      aria-label={`Diminuir ${item.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-line font-bold hover:border-olive disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item, { quantity: item.quantity + 1 })}
                      disabled={item.quantity >= 1000}
                      aria-label={`Aumentar ${item.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-line font-bold hover:border-olive disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>

                  <button onClick={() => removeItem(item)} className="link-danger ml-2">
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ListaPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ListaConteudo />
    </Suspense>
  );
}