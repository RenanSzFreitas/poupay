'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type SummaryRow = {
  month: string;
  purchases: number;
  total_spent: string;
  purchases_with_reference: number;
  realized_savings: string | null;
  potential_savings: string | null;
};

type Purchase = {
  id: number;
  market_name: string;
  purchased_at: string;
  total_paid: string;
  realized_savings: string | null;
  potential_savings: string | null;
};

type PurchaseItem = {
  product_id: number;
  name: string;
  brand: string | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

type Period = {
  key: string;
  label: string;
  purchases: number;
  withRef: number;
  spent: number;
  realized: number;
  potential: number;
};

// Todos os valores são somados em centavos
const toCents = (v: string | null) => (v === null ? 0 : Math.round(Number(v) * 100));
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (iso: string) => iso.split('-').reverse().join('/');

// Agrupa o resumo mensal da API por mês ou por ano
function buildPeriods(rows: SummaryRow[], mode: 'mes' | 'ano'): Period[] {
  const map = new Map<string, Period>();

  for (const r of rows) {
    const key = mode === 'mes' ? r.month : r.month.slice(0, 4);
    const period = map.get(key) ?? {
      key,
      label: mode === 'mes' ? `${r.month.slice(5)}/${r.month.slice(0, 4)}` : key,
      purchases: 0,
      withRef: 0,
      spent: 0,
      realized: 0,
      potential: 0,
    };

    period.purchases += r.purchases;
    period.withRef += r.purchases_with_reference;
    period.spent += toCents(r.total_spent);
    period.realized += toCents(r.realized_savings);
    period.potential += toCents(r.potential_savings);
    map.set(key, period);
  }

  return Array.from(map.values());
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border border-gray-700 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {note && <p className="text-xs text-gray-400">{note}</p>}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const width = Math.min(100, (Math.abs(value) / max) * 100);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-400">{label}</span>
      <div className="h-4 flex-1 rounded bg-gray-800">
        <div
          className={`h-4 rounded ${value < 0 ? 'bg-red-500' : color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-24 text-right">{brl(value)}</span>
    </div>
  );
}

function PurchaseCard({
  purchase,
  token,
  onUnauthorized,
}: {
  purchase: Purchase;
  token: string;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PurchaseItem[] | null>(null);
  const [error, setError] = useState('');

  // Os itens só são buscados na primeira vez que o usuário abre a compra
  async function toggle() {
    const next = !open;
    setOpen(next);

    if (next && items === null) {
      try {
        const detail = await api<{ items: PurchaseItem[] }>(`/purchases/${purchase.id}`, { token });
        setItems(detail.items);
        setError('');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Erro inesperado');
      }
    }
  }

  return (
    <li className="rounded border border-gray-700 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{purchase.market_name}</p>
          <p className="text-sm text-gray-400">{formatDate(purchase.purchased_at)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{brl(toCents(purchase.total_paid))}</p>
          <p className="text-xs text-gray-400">
            {purchase.realized_savings !== null
              ? `Economia: ${brl(toCents(purchase.realized_savings))}`
              : 'Economia: —'}
          </p>
        </div>
      </div>

      <button onClick={toggle} className="mt-2 text-sm text-green-500 underline">
        {open ? 'Ocultar itens' : 'Ver itens'}
      </button>

      {open && (
        <div className="mt-2 text-sm">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : items === null ? (
            <p>Carregando...</p>
          ) : (
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.product_id} className="flex justify-between gap-3">
                  <span>
                    {i.quantity}× {i.name}
                    <span className="text-gray-400"> · {brl(toCents(i.unit_price))} cada</span>
                  </span>
                  <span>{brl(toCents(i.subtotal))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function HistoricoPage() {
  const { token, user, loading: authLoading, logout } = useRequireAuth();

  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'mes' | 'ano'>('mes');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      api<SummaryRow[]>('/purchases/summary', { token }),
      api<Purchase[]>('/purchases/history', { token }),
    ])
      .then(([s, h]) => {
        if (cancelled) return;
        setSummary(s);
        setPurchases(h);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Erro inesperado');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authLoading || !user || !token || loading) {
    return <main className="mx-auto max-w-4xl p-4">Carregando...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  if (purchases.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="mb-2 text-2xl font-bold">Histórico e economia</h1>
        <p>
          Você ainda não registrou nenhuma compra. Compare uma{' '}
          <Link href="/listas" className="text-green-500 underline">
            lista
          </Link>{' '}
          e use o botão &quot;Comprei aqui&quot;.
        </p>
      </main>
    );
  }

  const totals = summary.reduce(
    (acc, r) => ({
      purchases: acc.purchases + r.purchases,
      withRef: acc.withRef + r.purchases_with_reference,
      spent: acc.spent + toCents(r.total_spent),
      realized: acc.realized + toCents(r.realized_savings),
      potential: acc.potential + toCents(r.potential_savings),
    }),
    { purchases: 0, withRef: 0, spent: 0, realized: 0, potential: 0 }
  );

  const periods = buildPeriods(summary, mode);
  const max = Math.max(1, ...periods.map((p) => Math.max(p.spent, Math.abs(p.realized))));

  const hasBase = totals.withRef > 0;
  const baseNote = hasBase
    ? `Calculada em ${totals.withRef} de ${totals.purchases} compras`
    : 'Sem base de comparação';

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Histórico e economia</h1>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Compras registradas" value={String(totals.purchases)} />
        <Stat label="Total gasto" value={brl(totals.spent)} />
        <Stat
          label="Economia realizada"
          value={hasBase ? brl(totals.realized) : '—'}
          note={baseNote}
        />
        <Stat
          label="Economia potencial"
          value={hasBase ? brl(totals.potential) : '—'}
          note={baseNote}
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gastos e economia</h2>
          <div className="flex gap-2">
            {(['mes', 'ano'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded border px-3 py-1 text-sm ${
                  mode === m ? 'border-green-600 bg-green-700 text-white' : 'border-gray-600'
                }`}
              >
                {m === 'mes' ? 'Por mês' : 'Por ano'}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-4">
          {periods.map((p) => (
            <li key={p.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="text-gray-400">
                  {p.purchases} {p.purchases === 1 ? 'compra' : 'compras'}
                </span>
              </div>

              <div className="space-y-1">
                <Bar label="Gasto" value={p.spent} max={max} color="bg-blue-500" />
                {p.withRef > 0 ? (
                  <Bar label="Economia" value={p.realized} max={max} color="bg-green-500" />
                ) : (
                  <p className="text-xs text-gray-400">Economia: sem base de comparação</p>
                )}
              </div>

              {p.withRef > 0 && p.withRef < p.purchases && (
                <p className="mt-1 text-xs text-gray-400">
                  Economia calculada em {p.withRef} de {p.purchases} compras.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Compras</h2>
        <ul className="space-y-2">
          {purchases.map((p) => (
            <PurchaseCard key={p.id} purchase={p} token={token} onUnauthorized={logout} />
          ))}
        </ul>
      </section>
    </main>
  );
}