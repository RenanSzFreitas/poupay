import { pool } from '../db';
import { compareBasket } from './comparison.service';

export interface PurchaseInput {
  market_id: number;
  list_id?: number;
  purchased_at?: string;
  compare_market_ids?: number[];
  items: { product_id: number; quantity: number; unit_price: number }[];
}

type PurchaseRow = {
  total_paid: string;
  reference_highest_total: string | null;
  reference_lowest_total: string | null;
  reference_market_count: number;
};

const toCents = (v: string | null) => (v === null ? null : Math.round(Number(v) * 100));
const money = (cents: number) => (cents / 100).toFixed(2);

// Calcula as economias a partir da foto de referência guardada na compra
export function withSavings<T extends PurchaseRow>(p: T) {
  const paid = toCents(p.total_paid) as number;
  const highest = toCents(p.reference_highest_total);
  const lowest = toCents(p.reference_lowest_total);
  const hasBase = p.reference_market_count >= 2 && highest !== null && lowest !== null;

  return {
    ...p,
    realized_savings: hasBase ? money((highest as number) - paid) : null,
    potential_savings: hasBase ? money(Math.max(0, paid - (lowest as number))) : null,
  };
}

const COLUMNS = `p.id, p.market_id, m.name AS market_name, p.list_id,
  p.purchased_at::text AS purchased_at, p.total_paid,
  p.reference_highest_total, p.reference_lowest_total,
  p.reference_market_count, p.created_at`;

export async function createPurchase(userId: number, input: PurchaseInput) {
  if (input.list_id !== undefined) {
    const own = await pool.query(
      'SELECT 1 FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [input.list_id, userId]
    );
    if (own.rowCount === 0) return { kind: 'list_not_found' as const };
  }

  // Total pago, somado em centavos
  const itemCents = input.items.map((i) => Math.round(i.unit_price * 100));
  const totalCents = input.items.reduce((sum, i, idx) => sum + itemCents[idx] * i.quantity, 0);

  // Foto da referência: mercados que têm a cesta inteira com preço
  const comparison = await compareBasket(input.items, input.compare_market_ids);
  const complete = comparison ? comparison.single_market.filter((m) => m.complete) : [];
  const lowest = complete.length > 0 ? complete[0].total : null;
  const highest = complete.length > 0 ? complete[complete.length - 1].total : null;

  let purchaseId = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO purchases
         (user_id, market_id, list_id, purchased_at, total_paid,
          reference_highest_total, reference_lowest_total, reference_market_count)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        input.market_id,
        input.list_id ?? null,
        input.purchased_at ?? null,
        money(totalCents),
        highest,
        lowest,
        complete.length,
      ]
    );
    purchaseId = inserted.rows[0].id as number;

    await client.query(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price)
       SELECT $1::bigint, t.product_id, t.quantity, t.cents::numeric / 100
       FROM unnest($2::bigint[], $3::int[], $4::bigint[]) AS t(product_id, quantity, cents)`,
      [
        purchaseId,
        input.items.map((i) => i.product_id),
        input.items.map((i) => i.quantity),
        itemCents,
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { kind: 'ok' as const, purchase: await getPurchase(userId, purchaseId) };
}

export async function getPurchase(userId: number, id: number) {
  const result = await pool.query(
    `SELECT ${COLUMNS}
     FROM purchases p
     JOIN markets m ON m.id = p.market_id
     WHERE p.id = $1 AND p.user_id = $2`,
    [id, userId]
  );
  const purchase = result.rows[0];
  if (!purchase) return null;

  const items = await pool.query(
    `SELECT i.product_id, pr.name, pr.brand, i.quantity, i.unit_price,
            (i.quantity * i.unit_price) AS subtotal
     FROM purchase_items i
     JOIN products pr ON pr.id = i.product_id
     WHERE i.purchase_id = $1
     ORDER BY pr.name`,
    [id]
  );

  return { ...withSavings(purchase), items: items.rows };
}

export async function listPurchases(userId: number, from?: string, to?: string) {
  const result = await pool.query(
    `SELECT ${COLUMNS}
     FROM purchases p
     JOIN markets m ON m.id = p.market_id
     WHERE p.user_id = $1
       AND ($2::date IS NULL OR p.purchased_at >= $2::date)
       AND ($3::date IS NULL OR p.purchased_at <= $3::date)
     ORDER BY p.purchased_at DESC, p.id DESC`,
    [userId, from ?? null, to ?? null]
  );
  return result.rows.map(withSavings);
}

// Gastos e economia agrupados por mês
export async function summaryByMonth(userId: number) {
  const result = await pool.query(
    `SELECT to_char(purchased_at, 'YYYY-MM') AS month,
            COUNT(*)::int AS purchases,
            SUM(total_paid) AS total_spent,
            COUNT(*) FILTER (WHERE reference_market_count >= 2)::int AS purchases_with_reference,
            SUM(CASE WHEN reference_market_count >= 2
                     THEN reference_highest_total - total_paid END) AS realized_savings,
            SUM(CASE WHEN reference_market_count >= 2
                     THEN GREATEST(total_paid - reference_lowest_total, 0) END) AS potential_savings
     FROM purchases
     WHERE user_id = $1
     GROUP BY 1
     ORDER BY 1 DESC`,
    [userId]
  );
  return result.rows;
}