'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import PremiumPaywall from '@/components/PremiumPaywall';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';


type Market = { id: number; name: string; city: string };

type CompareItem = {
  product_id: number;
  name: string;
  quantity: number;
  status: 'ok' | 'sem_preco' | 'indisponivel';
  subtotal: string | null;
  is_promotion: boolean | null;
  recorded_at: string | null;
  is_stale: boolean | null;
};

type MarketResult = {
  market_id: number;
  market_name: string;
  total: string;
  complete: boolean;
  missing_count: number;
  has_stale_prices: boolean;
  items: CompareItem[];
};

type SplitItem = {
  product_id: number;
  name: string;
  quantity: number;
  market_name: string;
  subtotal: string;
};

type CompareResult = {
  compared_markets: number;
  single_market: MarketResult[];
  best_single_market: { market_id: number; market_name: string; total: string } | null;
  split_by_product: {
    total: string;
    items: SplitItem[];
    without_price: { product_id: number; name: string }[];
    potential_extra_savings: string | null;
  };
};

const brl = (value: string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CompararConteudo() {
  const { id } = useParams<{ id: string }>();
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [checked, setChecked] = useState<number[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  // Lista de supermercados (pública)
  useEffect(() => {
    let cancelled = false;

    api<Market[]>('/markets')
      .then((data) => {
        if (!cancelled) setMarkets(data);
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      })
      .finally(() => {
        if (!cancelled) setLoadingMarkets(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(marketId: number) {
    setChecked((prev) =>
      prev.includes(marketId) ? prev.filter((x) => x !== marketId) : [...prev, marketId]
    );
  }

  // Marca de uma vez os favoritos ou a seleção salva do usuário
  async function loadPreset(path: 'favorite-markets' | 'selected-markets', label: string) {
    if (!token) return;
    setError('');
    setNotice('');

    try {
      const data = await api<Market[]>(`/users/me/${path}`, { token });
      if (data.length === 0) {
        setNotice(`Você ainda não tem ${label}.`);
        return;
      }
      setChecked(data.map((m) => m.id));
    } catch (err) {
      fail(err);
    }
  }

  async function compare() {
    if (!token) return;
    setError('');
    setNotice('');
    setComparing(true);

    try {
      const data = await api<CompareResult>(`/shopping-lists/${id}/compare`, {
        method: 'POST',
        token,
        body: checked.length > 0 ? { market_ids: checked } : {},
      });
      setResult(data);
      setComparedIds(checked);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setIsPremium(false);
      else fail(err);
    } finally {
      setComparing(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api<{ is_premium: boolean }>('/plan', { token })
      .then((p) => {
        if (!cancelled) setIsPremium(p.is_premium);
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authLoading || !user) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  const split = result?.split_by_product;
  const best = result?.best_single_market;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href={`/listas/${id}`} className="text-sm text-green-500 underline">
        ← Voltar à lista
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Comparar preços</h1>

      {isPremium === null ? (
        <p>Carregando...</p>
      ) : !isPremium ? (
        <PremiumPaywall title="A comparação automática é um recurso Premium" />
      ) : (
      <section className="mb-6">
        <h2 className="mb-1 font-semibold">Supermercados</h2>
        <p className="mb-3 text-sm text-gray-400">
          Marque os que quer comparar. Se não marcar nenhum, todos entram na comparação.
        </p>

        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => loadPreset('favorite-markets', 'favoritos')}
            className="rounded border border-gray-600 px-3 py-1 hover:bg-gray-800"
          >
            Usar favoritos
          </button>
          <button
            onClick={() => loadPreset('selected-markets', 'supermercados selecionados')}
            className="rounded border border-gray-600 px-3 py-1 hover:bg-gray-800"
          >
            Usar minha seleção
          </button>
          <button
            onClick={() => setChecked([])}
            className="rounded border border-gray-600 px-3 py-1 hover:bg-gray-800"
          >
            Limpar
          </button>
        </div>

        {loadingMarkets ? (
          <p>Carregando supermercados...</p>
        ) : markets.length === 0 ? (
          <p>Nenhum supermercado cadastrado.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {markets.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded border border-gray-700 p-2">
                  <input
                    type="checkbox"
                    checked={checked.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {m.name} <span className="text-gray-400">· {m.city}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={compare}
          disabled={comparing}
          className="mt-4 rounded bg-green-600 px-5 py-2 text-white disabled:opacity-50"
        >
          {comparing ? 'Comparando...' : 'Comparar'}
        </button>
      </section>
    )}

      {notice && <p className="mb-3 text-sm text-yellow-500">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {result && split && (
        <div className="space-y-8">
          <section>
            <p className="text-sm text-gray-400">
              {result.compared_markets}{' '}
              {result.compared_markets === 1 ? 'supermercado comparado' : 'supermercados comparados'}
            </p>

            {best ? (
              <div className="mt-2 rounded border border-green-600 bg-green-900/30 p-4">
                <p className="text-sm">Mais barato para comprar tudo em um só lugar</p>
                <p className="text-xl font-bold">
                  {best.market_name} · {brl(best.total)}
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded border border-yellow-600 p-4 text-sm">
                Nenhum supermercado tem preço para todos os itens da lista. Veja abaixo o que falta
                em cada um.
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Comprando tudo em um supermercado</h2>

            <ul className="space-y-2">
              {result.single_market.map((m, index) => (
                <li key={m.market_id} className="rounded border border-gray-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {index + 1}º {m.market_name}
                      </p>
                      <p className="text-sm">
                        {m.complete ? (
                          <span className="text-green-500">Lista completa</span>
                        ) : (
                          <span className="text-yellow-500">
                            Faltam preços de {m.missing_count}{' '}
                            {m.missing_count === 1 ? 'item' : 'itens'}
                          </span>
                        )}
                        {m.has_stale_prices && (
                          <span className="ml-2 text-orange-400">· há preços desatualizados</span>
                        )}
                      </p>
                    </div>
                    <p className="text-lg font-bold">{brl(m.total)}</p>
                  </div>

                  {!m.complete && (
                    <p className="mt-1 text-xs text-gray-400">
                      O total considera só os itens que têm preço.
                    </p>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-green-500">Ver itens</summary>
                    <ul className="mt-2 space-y-1 text-sm">
                      {m.items.map((item) => (
                        <li key={item.product_id} className="flex justify-between gap-3">
                          <span>
                            {item.quantity}× {item.name}
                            {item.is_promotion && (
                              <span className="ml-1 text-green-500">(promoção)</span>
                            )}
                            {item.is_stale && item.recorded_at && (
                              <span className="ml-1 text-orange-400">
                                (preço de {new Date(item.recorded_at).toLocaleDateString('pt-BR')})
                              </span>
                            )}
                          </span>
                          <span>
                            {item.status === 'ok' && item.subtotal
                              ? brl(item.subtotal)
                              : item.status === 'sem_preco'
                                ? 'sem preço'
                                : 'indisponível'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <Link
                    href={`/listas/${id}/comprar/${m.market_id}${
                      comparedIds.length > 0 ? `?compare=${comparedIds.join(',')}` : ''
                    }`}
                    className="mt-3 inline-block rounded border border-green-600 px-3 py-1 text-sm text-green-500 hover:bg-green-900/30"
                  >
                    Comprei aqui
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold">Escolhendo o mais barato de cada item</h2>
            <p className="mb-2 text-sm text-gray-400">
              Pode exigir passar por mais de um supermercado. O custo do deslocamento não entra na
              conta.
            </p>

            {split.items.length === 0 ? (
              <p className="text-sm">Nenhum item tem preço nos supermercados comparados.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {split.items.map((i) => (
                    <li
                      key={i.product_id}
                      className="flex justify-between gap-3 rounded border border-gray-700 p-2 text-sm"
                    >
                      <span>
                        {i.quantity}× {i.name}{' '}
                        <span className="text-gray-400">· {i.market_name}</span>
                      </span>
                      <span>{brl(i.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-2 font-bold">
                  Total: {brl(split.total)}
                  {split.without_price.length > 0 && ' (parcial)'}
                </p>

                {best && split.potential_extra_savings !== null && (
                  <p className="mt-1 text-sm">
                    {Number(split.potential_extra_savings) > 0 ? (
                      <span className="text-green-500">
                        Você economizaria {brl(split.potential_extra_savings)} a mais do que
                        comprando tudo em {best.market_name}.
                      </span>
                    ) : (
                      <span>Comprar tudo em {best.market_name} já é a opção mais barata.</span>
                    )}
                  </p>
                )}
              </>
            )}

            {split.without_price.length > 0 && (
              <p className="mt-2 text-sm text-yellow-500">
                Sem preço em nenhum dos supermercados comparados:{' '}
                {split.without_price.map((p) => p.name).join(', ')}.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default function CompararPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-4">Carregando...</main>}>
      <CompararConteudo />
    </Suspense>
  );
}