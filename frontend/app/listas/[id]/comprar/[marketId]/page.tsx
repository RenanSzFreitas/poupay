'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { ErrorText, Loading, PageTitle, brl } from '@/components/ui';

type ListItem = {
  product_id: number;
  name: string;
  brand: string | null;
  unit: string;
  size: number;
  quantity: number;
};

type ListDetail = { id: number; name: string; items: ListItem[] };
type Market = { id: number; name: string; city: string };
type MarketPrice = { product_id: number; price: string; is_available: boolean };

type Row = {
  product_id: number;
  name: string;
  detail: string;
  listed: string | null;
  include: boolean;
  quantity: string;
  price: string;
};

type Done = {
  market_name: string;
  total_paid: string;
  realized_savings: string | null;
  potential_savings: string | null;
  savings_locked?: boolean;
};


// Aceita "5,90" e "5.90"; campo vazio é inválido (não vira zero)
function parseNumber(text: string) {
  return text.trim() === '' ? NaN : Number(text.trim().replace(',', '.'));
}

// Subtotal em centavos, ou null se quantidade/preço forem inválidos
function rowCents(r: Row) {
  const price = parseNumber(r.price);
  const qty = Number(r.quantity);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 1) return null;
  return Math.round(price * 100) * qty;
}

function ComprarConteudo() {
  const { id, marketId } = useParams<{ id: string; marketId: string }>();
  const searchParams = useSearchParams();
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  // Mercados usados como referência na comparação (vêm da URL: ?compare=1,2,3)
  const compareIds = (searchParams.get('compare') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50);

  const [today] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [date, setDate] = useState(today);
  const [listName, setListName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Erro inesperado');
  }

  // Carrega a lista, o supermercado e os preços cadastrados nele
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      api<ListDetail>(`/shopping-lists/${id}`, { token }),
      api<Market>(`/markets/${marketId}`),
      api<MarketPrice[]>(`/markets/${marketId}/prices`),
    ])
      .then(([list, market, prices]) => {
        if (cancelled) return;

        const byProduct = new Map(prices.map((p) => [p.product_id, p]));

        setListName(list.name);
        setMarketName(market.name);
        setRows(
          list.items.map((i) => {
            const p = byProduct.get(i.product_id);
            const listed = p && p.is_available ? p.price : null;
            return {
              product_id: i.product_id,
              name: i.name,
              detail: [i.brand, `${i.size} ${i.unit}`].filter(Boolean).join(' · '),
              listed,
              include: true,
              quantity: String(i.quantity),
              price: listed ?? '',
            };
          })
        );
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
  }, [token, id, marketId]);

  function updateRow(index: number, changes: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');

    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) {
      setError('Marque pelo menos um item comprado.');
      return;
    }
    if (chosen.some((r) => rowCents(r) === null)) {
      setError('Confira a quantidade e o preço dos itens marcados.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api<Done>('/purchases', {
        method: 'POST',
        token,
        body: {
          market_id: Number(marketId),
          list_id: Number(id),
          purchased_at: date,
          ...(compareIds.length > 0 ? { compare_market_ids: compareIds } : {}),
          items: chosen.map((r) => ({
            product_id: r.product_id,
            quantity: Number(r.quantity),
            unit_price: Math.round(parseNumber(r.price) * 100) / 100,
          })),
        },
      });
      setDone(result);
    } catch (err) {
      fail(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || loading) return <Loading />;

  if (!marketName) {
    return (
      <main className="page">
        <div className="mb-3">
          <ErrorText>{error || 'Não foi possível abrir esta tela.'}</ErrorText>
        </div>
        <Link href={`/listas/${id}`} className="link">Voltar à lista</Link>
      </main>
    );
  }

  // Depois de registrar
  if (done) {
    const hasSavings = done.realized_savings !== null && done.potential_savings !== null;

    return (
      <main className="page">
        <PageTitle title="Registrar compra" subtitle={`Mercado: ${done.market_name}`} />

        <section className="card mx-auto max-w-lg py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2 className="mt-4 text-2xl font-extrabold">Compra registrada!</h2>
          <p className="mt-1 text-muted">
            Ela já está no seu histórico. Você pagou <strong className="text-ink">{brl(done.total_paid)}</strong>.
          </p>

          {hasSavings ? (
            <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl bg-sage-soft px-4 py-2">
              <span className="font-semibold">Economia: {brl(done.realized_savings!)}</span>
              <span className="badge-gold">Premium</span>
            </div>
          ) : done.savings_locked ? (
            <p className="mx-auto mt-5 max-w-sm rounded-xl bg-sage-soft px-4 py-3 text-sm">
              O cálculo de economia é um recurso Premium.{' '}
              <Link href="/assinatura" className="link">Conhecer o Premium</Link>
            </p>
          ) : (
            <p className="mx-auto mt-5 max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Não deu para calcular a economia: menos de 2 mercados tinham preço para todos os itens.
            </p>
          )}

          {hasSavings && (
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted">
              Em relação ao mercado mais caro entre os comparados.
              {Number(done.potential_savings) > 0 &&
                ` No mais barato, você teria economizado mais ${brl(done.potential_savings!)}.`}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/historico" className="btn-outline px-5 py-2.5">Ver histórico</Link>
            <Link href={`/listas/${id}`} className="btn-outline px-5 py-2.5">Voltar à lista</Link>
          </div>
        </section>
      </main>
    );
  }

  const totalCents = rows
    .filter((r) => r.include)
    .reduce((sum, r) => sum + (rowCents(r) ?? 0), 0);

  const small = 'rounded-lg border border-line bg-field px-2 py-1 text-right text-ink focus:border-olive focus:outline-none disabled:opacity-40';

  return (
    <main className="page">
      <Link href={`/listas/${id}/comparar`} className="text-sm font-semibold text-muted hover:text-olive">
        ← Voltar à comparação
      </Link>
      <div className="mt-2">
        <PageTitle title="Registrar compra" subtitle={`Mercado: ${marketName} · ${listName}`} />
      </div>

      <form onSubmit={handleSubmit} className="card mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">Resumo da compra</h2>
          <label className="text-sm text-muted">
            Data{' '}
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              required
              className={`${small} ml-1 text-left`}
            />
          </label>
        </div>
        <p className="mb-4 text-xs text-muted">
          Os preços vêm do cadastro do mercado. Ajuste para o que você pagou (confira no cupom) e desmarque o
          que não comprou.
        </p>

        {rows.length === 0 ? (
          <p className="text-muted">A lista não tem itens.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r, index) => {
              const cents = rowCents(r);
              return (
                <li key={r.product_id} className="flex flex-wrap items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(index, { include: e.target.checked })}
                    aria-label={`Comprei ${r.name}`}
                    className="h-4 w-4 accent-olive"
                  />
                  <div className={`min-w-36 flex-1 ${r.include ? '' : 'opacity-40'}`}>
                    <p className="font-semibold">{r.name}</p>
                    <label className="text-xs text-muted">
                      Quantidade:
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={r.quantity}
                        disabled={!r.include}
                        onChange={(e) => updateRow(index, { quantity: e.target.value })}
                        className={`${small} ml-1 w-14 py-0.5`}
                      />
                    </label>
                    {!r.listed && <span className="ml-2 text-xs text-amber-700">sem preço cadastrado</span>}
                  </div>
                  <label className="text-xs text-muted">
                    R$
                    <input
                      inputMode="decimal"
                      value={r.price}
                      disabled={!r.include}
                      onChange={(e) => updateRow(index, { price: e.target.value })}
                      aria-label={`Preço de ${r.name}`}
                      className={`${small} ml-1 w-20`}
                    />
                  </label>
                  <span className="w-24 text-right font-bold">
                    {r.include && cents !== null ? brl(cents / 100) : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-extrabold">{brl(totalCents / 100)}</span>
        </div>

        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>

        <button type="submit" disabled={submitting || rows.length === 0} className="btn-primary mt-4 w-full py-3">
          {submitting ? 'Registrando...' : 'Registrar compra'}
        </button>
      </form>
    </main>
  );
}

export default function ComprarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ComprarConteudo />
    </Suspense>
  );
}