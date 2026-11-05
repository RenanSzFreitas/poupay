'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

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
};

const brl = (value: string | number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  if (authLoading || !user || loading) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  if (!marketName) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="mb-3 text-red-500">{error || 'Não foi possível abrir esta tela.'}</p>
        <Link href={`/listas/${id}`} className="text-green-500 underline">
          Voltar à lista
        </Link>
      </main>
    );
  }

  // Tela de resultado depois de registrar
  if (done) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="mb-2 text-2xl font-bold">Compra registrada!</h1>
        <p className="mb-4">
          Você pagou <strong>{brl(done.total_paid)}</strong> em {done.market_name}.
        </p>

        {done.realized_savings !== null && done.potential_savings !== null ? (
          <div className="mb-6 space-y-3 rounded border border-gray-700 p-4">
            <div>
              <p className="text-sm text-gray-400">Economia realizada</p>
              <p className="text-xl font-bold text-green-500">{brl(done.realized_savings)}</p>
              <p className="text-xs text-gray-400">
                Em relação ao supermercado mais caro entre os comparados.
                {Number(done.realized_savings) < 0 &&
                  ' Valor negativo: você pagou mais que o mais caro.'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Economia potencial</p>
              <p className="text-xl font-bold">{brl(done.potential_savings)}</p>
              <p className="text-xs text-gray-400">
                Quanto a mais poderia ter economizado no supermercado mais barato.
              </p>
            </div>
          </div>
        ) : (
          <p className="mb-6 rounded border border-yellow-600 p-4 text-sm">
            Não foi possível calcular a economia: menos de 2 supermercados tinham todos os itens com
            preço cadastrado. O sistema não estima valores que não conhece.
          </p>
        )}

        <div className="flex gap-3">
          <Link href={`/listas/${id}`} className="rounded border px-4 py-2">
            Voltar à lista
          </Link>
          <Link href="/listas" className="rounded border px-4 py-2">
            Minhas listas
          </Link>
        </div>
      </main>
    );
  }

  const totalCents = rows
    .filter((r) => r.include)
    .reduce((sum, r) => sum + (rowCents(r) ?? 0), 0);

  const input = 'rounded border border-gray-300 bg-white px-2 py-1 text-right text-black';

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href={`/listas/${id}/comparar`} className="text-sm text-green-500 underline">
        ← Voltar à comparação
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">Registrar compra</h1>
      <p className="mb-4 text-sm text-gray-400">
        {listName} · {marketName}. Os preços vêm preenchidos com os cadastrados: ajuste para o que
        você realmente pagou (confira no cupom). Desmarque o que não comprou.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1 block text-sm">Data da compra</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded border border-gray-300 bg-white px-2 py-1 text-black"
          />
        </div>

        {rows.length === 0 ? (
          <p>A lista não tem itens.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, index) => {
              const cents = rowCents(r);
              return (
                <li
                  key={r.product_id}
                  className="flex flex-wrap items-center gap-3 rounded border border-gray-700 p-3"
                >
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(index, { include: e.target.checked })}
                    className="h-4 w-4"
                  />

                  <div className={`min-w-40 flex-1 ${r.include ? '' : 'opacity-40'}`}>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      {r.detail} ·{' '}
                      {r.listed ? `cadastrado: ${brl(r.listed)}` : 'sem preço cadastrado aqui'}
                    </p>
                  </div>

                  <label className="text-xs text-gray-400">
                    Qtd
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={r.quantity}
                      disabled={!r.include}
                      onChange={(e) => updateRow(index, { quantity: e.target.value })}
                      className={`${input} ml-1 w-16`}
                    />
                  </label>

                  <label className="text-xs text-gray-400">
                    Preço (R$)
                    <input
                      inputMode="decimal"
                      value={r.price}
                      disabled={!r.include}
                      onChange={(e) => updateRow(index, { price: e.target.value })}
                      className={`${input} ml-1 w-24`}
                    />
                  </label>

                  <span className="w-24 text-right text-sm">
                    {r.include && cents !== null ? brl(cents / 100) : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-lg font-bold">Total pago: {brl(totalCents / 100)}</p>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || rows.length === 0}
          className="mt-4 rounded bg-green-600 px-5 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Registrando...' : 'Registrar compra'}
        </button>
      </form>
    </main>
  );
}

export default function ComprarPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-4">Carregando...</main>}>
      <ComprarConteudo />
    </Suspense>
  );
}