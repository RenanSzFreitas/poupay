import { pool } from '../db';

export type Kind = 'favorite' | 'selected';

// Nomes de tabela fixos no código: nunca vêm do usuário
const TABLES: Record<Kind, string> = {
  favorite: 'user_favorite_markets',
  selected: 'user_selected_markets',
};

export async function listMarketsOf(kind: Kind, userId: number) {
  const result = await pool.query(
    `SELECT m.*, x.created_at AS added_at
     FROM ${TABLES[kind]} x
     JOIN markets m ON m.id = x.market_id
     WHERE x.user_id = $1
     ORDER BY m.name`,
    [userId]
  );
  return result.rows;
}

export async function getMarketIdsOf(kind: Kind, userId: number) {
  const result = await pool.query(
    `SELECT market_id FROM ${TABLES[kind]} WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((r) => r.market_id as number);
}

export async function addMarket(kind: Kind, userId: number, marketId: number) {
  const result = await pool.query(
    `INSERT INTO ${TABLES[kind]} (user_id, market_id)
     VALUES ($1, $2)
     RETURNING market_id, created_at`,
    [userId, marketId]
  );
  return result.rows[0];
}

export async function removeMarket(kind: Kind, userId: number, marketId: number) {
  const result = await pool.query(
    `DELETE FROM ${TABLES[kind]} WHERE user_id = $1 AND market_id = $2`,
    [userId, marketId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Troca a seleção inteira de uma vez (tudo ou nada)
export async function replaceSelected(userId: number, marketIds: number[]) {
  const unique = Array.from(new Set(marketIds));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_selected_markets WHERE user_id = $1', [userId]);
    if (unique.length > 0) {
      await client.query(
        `INSERT INTO user_selected_markets (user_id, market_id)
         SELECT $1, UNNEST($2::bigint[])`,
        [userId, unique]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}