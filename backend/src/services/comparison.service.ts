import { pool } from '../db';

const STALE_DAYS = 30;

type Row = {
  market_id: number;
  market_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  price: string | null;
  is_available: boolean | null;
  is_promotion: boolean | null;
  recorded_at: Date | null;
};

type ItemStatus = 'ok' | 'sem_preco' | 'indisponivel';

function toCents(price: string) {
  return Math.round(Number(price) * 100);
}

function money(cents: number) {
  return (cents / 100).toFixed(2);
}

export async function compareList(userId: number, listId: number, marketIds?: number[]) {
  const listResult = await pool.query(
    'SELECT id, name FROM shopping_lists WHERE id = $1 AND user_id = $2',
    [listId, userId]
  );
  const list = listResult.rows[0];
  if (!list) return { kind: 'not_found' as const };

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS n FROM shopping_list_items WHERE list_id = $1',
    [listId]
  );
  if (countResult.rows[0].n === 0) return { kind: 'empty' as const };

  // Para cada item da lista x cada supermercado, pega o preço mais recente (se existir)
  const result = await pool.query(
    `SELECT m.id AS market_id, m.name AS market_name,
            i.product_id, p.name AS product_name, i.quantity,
            lp.price, lp.is_available, lp.is_promotion, lp.recorded_at
     FROM shopping_list_items i
     JOIN products p ON p.id = i.product_id
     CROSS JOIN markets m
     LEFT JOIN LATERAL (
       SELECT mp.price, mp.is_available, mp.is_promotion, mp.recorded_at
       FROM market_prices mp
       WHERE mp.market_id = m.id AND mp.product_id = i.product_id
       ORDER BY mp.recorded_at DESC, mp.id DESC
       LIMIT 1
     ) lp ON TRUE
     WHERE i.list_id = $1
       AND ($2::bigint[] IS NULL OR m.id = ANY($2::bigint[]))
     ORDER BY m.id, p.name`,
    [listId, marketIds ?? null]
  );
  const rows = result.rows as Row[];
  if (rows.length === 0) return { kind: 'no_markets' as const };

  const staleLimit = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;

  const markets = new Map<number, {
    market_id: number;
    market_name: string;
    totalCents: number;
    missing_count: number;
    has_stale_prices: boolean;
    items: object[];
  }>();

  const products = new Map<number, {
    name: string;
    quantity: number;
    options: { market_id: number; market_name: string; unitCents: number }[];
  }>();

  for (const r of rows) {
    let status: ItemStatus = 'ok';
    if (r.price === null) status = 'sem_preco';
    else if (!r.is_available) status = 'indisponivel';

    const unitCents = status === 'ok' ? toCents(r.price as string) : null;
    const subtotalCents = unitCents === null ? null : unitCents * r.quantity;
    const isStale = r.recorded_at ? r.recorded_at.getTime() < staleLimit : false;

    let m = markets.get(r.market_id);
    if (!m) {
      m = {
        market_id: r.market_id,
        market_name: r.market_name,
        totalCents: 0,
        missing_count: 0,
        has_stale_prices: false,
        items: [],
      };
      markets.set(r.market_id, m);
    }

    if (status === 'ok') {
      m.totalCents += subtotalCents as number;
      if (isStale) m.has_stale_prices = true;
    } else {
      m.missing_count += 1;
    }

    m.items.push({
      product_id: r.product_id,
      name: r.product_name,
      quantity: r.quantity,
      status,
      unit_price: unitCents === null ? null : money(unitCents),
      subtotal: subtotalCents === null ? null : money(subtotalCents),
      is_promotion: status === 'ok' ? r.is_promotion : null,
      recorded_at: r.recorded_at,
      is_stale: status === 'ok' ? isStale : null,
    });

    let p = products.get(r.product_id);
    if (!p) {
      p = { name: r.product_name, quantity: r.quantity, options: [] };
      products.set(r.product_id, p);
    }
    if (status === 'ok') {
      p.options.push({
        market_id: r.market_id,
        market_name: r.market_name,
        unitCents: unitCents as number,
      });
    }
  }

  // Modo 1: lista completa em um único mercado
  const singleMarket = Array.from(markets.values())
    .map((m) => ({
      market_id: m.market_id,
      market_name: m.market_name,
      total: money(m.totalCents),
      totalCents: m.totalCents,
      complete: m.missing_count === 0,
      missing_count: m.missing_count,
      has_stale_prices: m.has_stale_prices,
      items: m.items,
    }))
    .sort((a, b) => {
      if (a.complete !== b.complete) return a.complete ? -1 : 1;
      if (a.complete) return a.totalCents - b.totalCents;
      return a.missing_count - b.missing_count || a.totalCents - b.totalCents;
    });

  const best = singleMarket[0]?.complete ? singleMarket[0] : null;

  // Modo 2: o mais barato de cada produto
  let splitCents = 0;
  const splitItems: object[] = [];
  const withoutPrice: object[] = [];

  for (const [productId, p] of products) {
    if (p.options.length === 0) {
      withoutPrice.push({ product_id: productId, name: p.name });
      continue;
    }
    const cheapest = p.options.reduce((a, b) => (b.unitCents < a.unitCents ? b : a));
    const subtotal = cheapest.unitCents * p.quantity;
    splitCents += subtotal;
    splitItems.push({
      product_id: productId,
      name: p.name,
      quantity: p.quantity,
      market_id: cheapest.market_id,
      market_name: cheapest.market_name,
      unit_price: money(cheapest.unitCents),
      subtotal: money(subtotal),
    });
  }

  const data = {
    list: { id: list.id, name: list.name },
    compared_markets: markets.size,
    single_market: singleMarket.map(({ totalCents, ...rest }) => rest),
    best_single_market: best
      ? { market_id: best.market_id, market_name: best.market_name, total: best.total }
      : null,
    split_by_product: {
      total: money(splitCents),
      items: splitItems,
      without_price: withoutPrice,
      potential_extra_savings: best ? money(best.totalCents - splitCents) : null,
    },
  };

  return { kind: 'ok' as const, data };
}