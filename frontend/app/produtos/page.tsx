'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Product = {
  id: number;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  size: number;
};

export default function ProdutosPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      const query = params.toString();

      api<Product[]>(`/products${query ? `?${query}` : ''}`)
        .then((data) => {
          if (cancelled) return;
          setProducts(data);
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
  }, [search, category]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Produtos</h1>

      <input
        className="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black"
        placeholder="Buscar por nome ou marca"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {category && (
        <p className="mb-3 text-sm">
          Categoria:{' '}
          <span className="rounded bg-green-700 px-2 py-0.5 text-white">{category}</span>{' '}
          <button onClick={() => setCategory('')} className="underline">
            limpar filtro
          </button>
        </p>
      )}

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <p>Carregando...</p>
      ) : products.length === 0 ? (
        <p>Nenhum produto encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-gray-700 p-3"
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-gray-400">
                  {[p.brand, `${p.size} ${p.unit}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => setCategory(p.category)}
                className="rounded border border-gray-600 px-2 py-1 text-xs hover:bg-gray-800"
              >
                {p.category}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}