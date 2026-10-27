import { pool } from '../db';

export interface ProductInput {
  name: string;
  brand?: string;
  category: string;
  unit: 'un' | 'g' | 'kg' | 'ml' | 'l';
  size: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
}

export async function listProducts(filters: ProductFilters) {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(name ILIKE $${values.length} OR brand ILIKE $${values.length})`);
  }
  if (filters.category) {
    values.push(filters.category);
    conditions.push(`category ILIKE $${values.length}`);
  }
  if (filters.brand) {
    values.push(filters.brand);
    conditions.push(`brand ILIKE $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM products ${where} ORDER BY name`,
    values
  );
  return result.rows;
}

export async function getProduct(id: number) {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createProduct(data: ProductInput) {
  const result = await pool.query(
    `INSERT INTO products (name, brand, category, unit, size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.brand ?? null, data.category, data.unit, data.size]
  );
  return result.rows[0];
}

export async function updateProduct(id: number, data: Partial<ProductInput>) {
  const result = await pool.query(
    `UPDATE products SET
       name = COALESCE($1, name),
       brand = COALESCE($2, brand),
       category = COALESCE($3, category),
       unit = COALESCE($4, unit),
       size = COALESCE($5, size),
       updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [data.name ?? null, data.brand ?? null, data.category ?? null,
     data.unit ?? null, data.size ?? null, id]
  );
  return result.rows[0] ?? null;
}

export async function deleteProduct(id: number) {
  const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}