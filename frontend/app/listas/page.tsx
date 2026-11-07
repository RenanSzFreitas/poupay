'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Empty, ErrorText, Loading, PageTitle } from '@/components/ui';

type ShoppingList = { id: number; name: string; item_count: number; updated_at: string };

export default function ListasPage() {
  const router = useRouter();
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  // Token vencido (1 hora): sai da conta e o porteiro leva para o login
  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api<ShoppingList[]>('/shopping-lists', { token })
      .then((data) => {
        if (cancelled) return;
        setLists(data);
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
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError('');

    try {
      const created = await api<{ id: number }>('/shopping-lists', {
        method: 'POST',
        token,
        body: { name },
      });
      router.push(`/listas/${created.id}`);
    } catch (err) {
      fail(err);
      setCreating(false);
    }
  }

  async function handleDelete(list: ShoppingList) {
    if (!token || !window.confirm(`Apagar a lista "${list.name}"?`)) return;

    try {
      await api(`/shopping-lists/${list.id}`, { method: 'DELETE', token });
      setLists((prev) => prev.filter((l) => l.id !== list.id));
    } catch (err) {
      fail(err);
    }
  }

  if (authLoading || !user || loading) return <Loading />;

  return (
    <main className="page">
      <PageTitle title="Minhas listas" subtitle="Crie uma lista e compare os preços entre os mercados." />

      <form onSubmit={handleCreate} className="card mb-6 p-5">
        <label htmlFor="nova" className="label">Nova lista</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="nova"
            className="field flex-1"
            placeholder="Nome da lista (ex.: Compras da semana)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Criando...' : 'Criar lista'}
          </button>
        </div>
      </form>

      <div className="mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      {lists.length === 0 ? (
        <Empty>Você ainda não tem listas. Crie a primeira acima.</Empty>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <li key={l.id} className="card flex flex-col p-5">
              <p className="text-lg font-bold">{l.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {l.item_count} {l.item_count === 1 ? 'item' : 'itens'} · atualizada em{' '}
                {new Date(l.updated_at).toLocaleDateString('pt-BR')}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Link href={`/listas/${l.id}`} className="btn-outline">
                  Abrir lista
                </Link>
                <button onClick={() => handleDelete(l)} className="link-danger">
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
