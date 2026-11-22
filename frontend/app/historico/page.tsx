'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Empty, ErrorText, Loading, PageTitle } from '@/components/ui';
import ImageWithFallback from '@/components/ImageWithFallback';

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
  market_image_url?: string | null;
  purchased_at: string;
  total_paid: string;
  realized_savings: string | null;
  potential_savings: string | null;
  item_count?: number;
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

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone: 'dark' | 'gold' | 'light';
}) {
  const styles = {
    dark: 'bg-forest text-white',
    gold: 'bg-gold text-forest',
    light: 'bg-white text-ink shadow-[0_4px_20px_rgba(31,42,18,0.06)]',
  }[tone];
  return (
    <div className={`rounded-3xl p-5 ${styles}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
      {note && <p className="mt-1 text-xs opacity-75">{note}</p>}
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
      <span className="w-16 text-muted">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-cream">
        <div
          className={`h-3 rounded-full ${value < 0 ? 'bg-red-500' : color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-24 text-right font-semibold">{brl(value)}</span>
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
    <li className="py-3">
      <button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        {/* Logo do mercado; sem logo, mostra a inicial */}
        <ImageWithFallback
          src={purchase.market_image_url}
          alt={purchase.market_name}
          fallbackText={purchase.market_name}
          fit="contain"
          imgPadding="p-0.5"
          sizes="48px"
          fallbackTextClass="text-lg"
          className="h-12 w-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{purchase.market_name}</p>
          <p className="text-xs text-muted">
            {formatDate(purchase.purchased_at)}
            {purchase.item_count !== undefined &&
              ` · ${purchase.item_count} ${purchase.item_count === 1 ? 'item' : 'itens'}`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">{brl(toCents(purchase.total_paid))}</p>
          <p className="text-xs text-muted">
            Economia{' '}
            {purchase.realized_savings !== null ? brl(toCents(purchase.realized_savings)) : '—'}
          </p>
        </div>
      </button>

      {open && (
        <div className="ml-13 mt-3 rounded-2xl bg-cream p-3 text-sm">
          {error ? (
            <p className="text-red-700">{error}</p>
          ) : items === null ? (
            <p className="text-muted">Carregando...</p>
          ) : (
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.product_id} className="flex justify-between gap-3">
                  <span>
                    {i.quantity}× {i.name}
                    <span className="text-muted"> · {brl(toCents(i.unit_price))} cada</span>
                  </span>
                  <span className="font-semibold">{brl(toCents(i.subtotal))}</span>
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

  if (authLoading || !user || !token || loading) return <Loading />;

  if (error) {
    return (
      <main className="page">
        <ErrorText>{error}</ErrorText>
      </main>
    );
  }

  const title = (
    <PageTitle title="Histórico e economia" subtitle="Suas compras registradas e quanto você economizou." />
  );

  if (purchases.length === 0) {
    return (
      <main className="page">
        {title}
        <Empty>
          Você ainda não registrou nenhuma compra. Compare uma{' '}
          <Link href="/listas" className="link">lista</Link> e registre a compra no mercado escolhido.
        </Empty>
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

  return (
    <main className="page">
      {title}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat tone="dark" label="Total gasto" value={brl(totals.spent)} />
        <Stat
          tone="gold"
          label="Economia total"
          value={hasBase ? brl(totals.realized) : '—'}
          note={
            hasBase
              ? totals.withRef < totals.purchases
                ? `Calculada em ${totals.withRef} de ${totals.purchases} compras`
                : undefined
              : 'Sem base de comparação ainda'
          }
        />
        <Stat tone="light" label="Compras registradas" value={String(totals.purchases)} />
      </section>

      <section className="card mb-6">
        <h2 className="mb-1 text-xl font-bold">Compras recentes</h2>
        <ul className="divide-y divide-line">
          {purchases.map((p) => (
            <PurchaseCard key={p.id} purchase={p} token={token} onUnauthorized={logout} />
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Gastos e economia</h2>
          <div className="flex gap-2">
            {(['mes', 'ano'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={mode === m ? 'chip-active' : 'chip'}>
                {m === 'mes' ? 'Por mês' : 'Por ano'}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-4">
          {periods.map((p) => (
            <li key={p.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">{p.label}</span>
                <span className="text-muted">
                  {p.purchases} {p.purchases === 1 ? 'compra' : 'compras'}
                </span>
              </div>
              <div className="space-y-1">
                <Bar label="Gasto" value={p.spent} max={max} color="bg-forest" />
                {p.withRef > 0 ? (
                  <Bar label="Economia" value={p.realized} max={max} color="bg-gold" />
                ) : (
                  <p className="text-xs text-muted">Economia: sem base de comparação</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {hasBase && totals.potential > 0 && (
          <p className="mt-4 text-xs text-muted">
            Comprando sempre no mercado mais barato, você teria economizado mais {brl(totals.potential)}.
          </p>
        )}
      </section>
    </main>
  );
}
