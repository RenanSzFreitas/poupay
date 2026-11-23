'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PremiumPaywall from '@/components/PremiumPaywall';
import { ErrorText, Loading, PageTitle, brl } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import ImageWithFallback from '@/components/ImageWithFallback';

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
  market_image_url?: string | null;
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

type Mode = 'single' | 'split';
type Scope = 'selected' | 'all';

function CompararConteudo() {
  const { id } = useParams<{ id: string }>();
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  const [listName, setListName] = useState('');
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [scope, setScope] = useState<Scope | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  // Escopo da última comparação concluída; diferente do atual = comparando
  const [loadedScope, setLoadedScope] = useState<Scope | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const [chosen, setChosen] = useState<number | null>(null);

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  // Nome da lista, plano e quantos mercados o usuário selecionou
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      api<{ name: string }>(`/shopping-lists/${id}`, { token }),
      api<{ is_premium: boolean }>('/plan', { token }),
      api<{ id: number }[]>('/users/me/selected-markets', { token }),
    ])
      .then(([list, plan, selected]) => {
        if (cancelled) return;
        setListName(list.name);
        setIsPremium(plan.is_premium);
        setSelectedCount(selected.length);
        setScope(selected.length > 0 ? 'selected' : 'all');
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      });

    return () => {
      cancelled = true;
    };
  }, [token, id]);

  // Compara assim que souber o escopo (e de novo quando ele muda)
  useEffect(() => {
    if (!token || !isPremium || !scope) return;
    let cancelled = false;

    api<CompareResult>(`/shopping-lists/${id}/compare`, {
      method: 'POST',
      token,
      body: scope === 'selected' ? { use: 'selected' } : {},
    })
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setChosen(data.best_single_market?.market_id ?? data.single_market[0]?.market_id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 402) setIsPremium(false);
        else fail(err);
      })
      .finally(() => {
        if (!cancelled) setLoadedScope(scope);
      });

    return () => {
      cancelled = true;
    };
  }, [token, id, isPremium, scope]);

  const comparing = Boolean(isPremium && scope && loadedScope !== scope);

  if (authLoading || !user || (isPremium === null && !error)) return <Loading />;

  const split = result?.split_by_product;
  const best = result?.best_single_market;
  const chosenMarket = result?.single_market.find((m) => m.market_id === chosen);
  const comparedIds = result?.single_market.map((m) => m.market_id) ?? [];
  const registerHref = chosenMarket
    ? `/listas/${id}/comprar/${chosenMarket.market_id}?compare=${comparedIds.join(',')}`
    : null;

  return (
    <main className="page">
      <Link href={`/listas/${id}`} className="text-sm font-semibold text-muted hover:text-olive">
        ← Voltar à lista
      </Link>
      <div className="mt-2">
        <PageTitle title="Comparar preços" subtitle={listName || ' '} />
      </div>

      <div className="mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      {isPremium === false ? (
        <PremiumPaywall />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="tablist">
              <button role="tab" aria-selected={mode === 'single'} onClick={() => setMode('single')} className={mode === 'single' ? 'chip-active' : 'chip'}>
                Tudo em um mercado só
              </button>
              <button role="tab" aria-selected={mode === 'split'} onClick={() => setMode('split')} className={mode === 'split' ? 'chip-active' : 'chip'}>
                O mais barato de cada item
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Comparando:</span>
              <select
                value={scope ?? 'all'}
                onChange={(e) => {
                  setError('');
                  setScope(e.target.value as Scope);
                }}
                className="rounded-lg border border-line bg-white px-2 py-1 text-ink"
              >
                <option value="selected" disabled={selectedCount === 0}>
                  Meus mercados ({selectedCount})
                </option>
                <option value="all">Todos os mercados</option>
              </select>
              <Link href="/supermercados" className="link">Escolher</Link>
            </div>
          </div>

          {comparing && !result ? (
            <p className="text-muted">Comparando...</p>
          ) : result && split ? (
            <div className={`grid items-start gap-6 md:grid-cols-2 ${comparing ? 'opacity-60' : ''}`}>
              {/* Tudo em um mercado só */}
              <section
                className={`card ${mode === 'single' ? 'ring-2 ring-olive/40' : 'hidden md:block'}`}
              >
                <h2 className="mb-1 text-xl font-bold">Um mercado só</h2>
                <p className="mb-4 text-xs text-muted">Toque em um mercado para registrar a compra nele.</p>

                <ul className="space-y-2">
                  {result.single_market.map((m) => {
                    const isBest = best?.market_id === m.market_id;
                    const isChosen = chosen === m.market_id;
                    return (
                      <li key={m.market_id}>
                        <button
                          onClick={() => setChosen(m.market_id)}
                          aria-pressed={isChosen}
                          className={`flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition ${
                            isChosen ? 'border-olive bg-sage-soft' : 'border-transparent hover:bg-cream'
                          }`}
                        >
                          <ImageWithFallback
                            src={m.market_image_url}
                            alt={m.market_name}
                            fallbackText={m.market_name}
                            fit="contain"
                            imgPadding="p-0.5"
                            sizes="48px"
                            fallbackTextClass="text-lg"
                            className="h-12 w-12 shrink-0 rounded-xl"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{m.market_name}</p>
                            {m.complete ? (
                              <p className="text-xs text-muted">
                                Total da lista{m.has_stale_prices && ' · há preços antigos'}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-700">
                                Faltam preços de {m.missing_count} {m.missing_count === 1 ? 'item' : 'itens'}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{brl(m.total)}</p>
                            {isBest && <span className="badge-gold">Menor total</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {!best && (
                  <p className="mt-3 text-xs text-amber-700">
                    Nenhum mercado tem preço para todos os itens. Os totais consideram só os itens com preço.
                  </p>
                )}
              </section>

              {/* O mais barato de cada item */}
              <section className={`card ${mode === 'split' ? 'ring-2 ring-olive/40' : 'hidden md:block'}`}>
                <h2 className="mb-4 text-xl font-bold">O mais barato de cada item</h2>

                {split.items.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum item tem preço nos mercados comparados.</p>
                ) : (
                  <ul className="space-y-3">
                    {split.items.map((i) => (
                      <li key={i.product_id} className="flex justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {i.quantity > 1 && <span className="text-muted">{i.quantity}× </span>}
                            {i.name}
                          </p>
                          <p className="text-xs text-muted">{i.market_name}</p>
                        </div>
                        <p className="font-bold">{brl(i.subtotal)}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {split.without_price.length > 0 && (
                  <p className="mt-3 text-xs text-amber-700">
                    Sem preço em nenhum mercado: {split.without_price.map((p) => p.name).join(', ')}.
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total{split.without_price.length > 0 && ' (parcial)'}</span>
                    <span className="text-xl font-extrabold">{brl(split.total)}</span>
                  </div>
                  {best && split.potential_extra_savings !== null && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-olive">Você economiza</span>
                      <span className="text-xl font-extrabold text-gold-dark">
                        {brl(split.potential_extra_savings)}
                      </span>
                    </div>
                  )}
                  {best && split.potential_extra_savings !== null && (
                    <p className="text-xs text-muted">
                      Em relação a comprar tudo em {best.market_name}. O deslocamento não entra na conta.
                    </p>
                  )}
                </div>

                {registerHref && chosenMarket && (
                  <Link href={registerHref} className="btn-primary mt-5 w-full">
                    Registrar compra em {chosenMarket.market_name}
                  </Link>
                )}
              </section>

              {/* No celular o botão fica também abaixo da aba "Um mercado só" */}
              {registerHref && chosenMarket && mode === 'single' && (
                <Link href={registerHref} className="btn-primary w-full md:hidden">
                  Registrar compra em {chosenMarket.market_name}
                </Link>
              )}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

export default function CompararPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CompararConteudo />
    </Suspense>
  );
}
