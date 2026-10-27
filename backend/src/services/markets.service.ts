import { pool } from '../db';

export interface MarketInput {
  name: string;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

export async function listMarkets(search?: string) {
  if (search) {
    const result = await pool.query(
      'SELECT * FROM markets WHERE name ILIKE $1 OR city ILIKE $1 ORDER BY name',
      [`%${search}%`]
    );
    return result.rows;
  }
  const result = await pool.query('SELECT * FROM markets ORDER BY name');
  return result.rows;
}

export async function getMarket(id: number) {
  const result = await pool.query('SELECT * FROM markets WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createMarket(data: MarketInput) {
  const result = await pool.query(
    `INSERT INTO markets (name, address, city, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.address ?? null, data.city, data.latitude ?? null, data.longitude ?? null]
  );
  return result.rows[0];
}

export async function updateMarket(id: number, data: Partial<MarketInput>) {
  const result = await pool.query(
    `UPDATE markets SET
       name = COALESCE($1, name),
       address = COALESCE($2, address),
       city = COALESCE($3, city),
       latitude = COALESCE($4, latitude),
       longitude = COALESCE($5, longitude),
       updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [data.name ?? null, data.address ?? null, data.city ?? null,
     data.latitude ?? null, data.longitude ?? null, id]
  );
  return result.rows[0] ?? null;
}

export async function deleteMarket(id: number) {
  const result = await pool.query('DELETE FROM markets WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}