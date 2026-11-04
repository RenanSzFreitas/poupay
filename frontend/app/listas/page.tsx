'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type ShoppingList = { id: number; name: string; item_count: number };

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

  if (authLoading || !user || loading) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Minhas listas</h1>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-black"
          placeholder="Nome da nova lista (ex.: Compras da semana)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Criar
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {lists.length === 0 ? (
        <p>Você ainda não tem listas. Crie a primeira acima.</p>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded border border-gray-700 p-3"
            >
              <Link href={`/listas/${l.id}`} className="flex-1">
                <p className="font-semibold">{l.name}</p>
                <p className="text-sm text-gray-400">
                  {l.item_count} {l.item_count === 1 ? 'item' : 'itens'}
                </p>
              </Link>
              <button
                onClick={() => handleDelete(l)}
                className="rounded border border-gray-600 px-2 py-1 text-xs hover:bg-gray-800"
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}