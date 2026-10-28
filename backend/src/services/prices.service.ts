import { pool } from '../db';

export interface PriceInput {
  market_id: number;
  product_id: number;
  price: number;
  is_promotion?: boolean;
  is_available?: boolean;
  source?: 'manual' | 'test' | 'user' | 'integration';
}

export async function createPrice(data: PriceInput) {
  const result = await pool.query(
    `INSERT INTO market_prices
       (market_id, product_id, price, is_promotion, is_available, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.market_id,
      data.product_id,
      data.price,
      data.is_promotion ?? false,
      data.is_available ?? true,
      data.source ?? 'manual',
    ]
  );
  return result.rows[0];
}

// Preço mais recente de cada produto em um supermercado
export async function listLatestByMarket(marketId: number) {
  const result = await pool.query(
    `SELECT DISTINCT ON (mp.product_id)
       mp.id, mp.product_id, p.name, p.brand, p.category, p.unit, p.size,
       mp.price, mp.is_promotion, mp.is_available, mp.source, mp.recorded_at
     FROM market_prices mp
     JOIN products p ON p.id = mp.product_id
     WHERE mp.market_id = $1
     ORDER BY mp.product_id, mp.recorded_at DESC, mp.id DESC`,
    [marketId]
  );
  return result.rows;
}

// Preço mais recente de um produto em cada supermercado, do mais barato ao mais caro
export async function listLatestByProduct(productId: number) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (mp.market_id)
         mp.id, mp.market_id, m.name AS market_name, m.city,
         mp.price, mp.is_promotion, mp.is_available, mp.source, mp.recorded_at
       FROM market_prices mp
       JOIN markets m ON m.id = mp.market_id
       WHERE mp.product_id = $1
       ORDER BY mp.market_id, mp.recorded_at DESC, mp.id DESC
     ) latest
     ORDER BY is_available DESC, price ASC`,
    [productId]
  );
  return result.rows;
}