'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ErrorText, PageTitle } from '@/components/ui';
import ImageWithFallback from '@/components/ImageWithFallback'; // NOVO

// Categorias do design; outras que vierem do catálogo entram depois destas
const BASE_CATEGORIES = ['Higiene', 'Limpeza', 'Mercearia', 'Bebidas', 'Hortifruti'];

type Product = {
  id: number;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  size: number;
  image_url: string | null; // NOVO
};

export default function ProdutosPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [known, setKnown] = useState<string[]>([]);

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
          // Guarda categorias que existem no catálogo e não estão na lista fixa
          setKnown((prev) => {
            const next = new Set(prev);
            data.forEach((p) => next.add(p.category));
            return next.size === prev.length ? prev : Array.from(next);
          });
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

  const lower = BASE_CATEGORIES.map((c) => c.toLowerCase());
  const categories = [
    ...BASE_CATEGORIES,
    ...known.filter((c) => !lower.includes(c.toLowerCase())).sort(),
  ];
  const isActive = (c: string) => category.toLowerCase() === c.toLowerCase();

  return (
    <main className="page">
      <PageTitle title="Produtos" subtitle="Busque no catálogo e encontre o que você precisa." />

      <label htmlFor="busca" className="label">Buscar produto</label>
      <input
        id="busca"
        className="field mb-4"
        placeholder="Digite o nome do produto"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')} className={category === '' ? 'chip-active' : 'chip'}>
          Todas
        </button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={isActive(c) ? 'chip-active' : 'chip'}>
            {c}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : loading ? (
        <p className="text-muted">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="text-muted">Nenhum produto encontrado.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="card p-3 sm:p-4">
              {/* NOVO: caixa quadrada fixa; a imagem entra inteira, qualquer que seja o tamanho dela */}
              <ImageWithFallback
                src={p.image_url}
                alt={p.name}
                fallbackText={p.name}
                fit="contain"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="aspect-square w-full rounded-2xl"
              />
              <p className="mt-3 font-bold leading-tight">{p.name}</p>
              <p className="text-xs text-muted">
                {[p.category, p.brand, `${p.size} ${p.unit}`].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}