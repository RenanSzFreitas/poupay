import { pool } from '../db';

export async function createList(userId: number, name: string) {
  const result = await pool.query(
    'INSERT INTO shopping_lists (user_id, name) VALUES ($1, $2) RETURNING *',
    [userId, name]
  );
  return result.rows[0];
}

export async function listLists(userId: number) {
  const result = await pool.query(
    `SELECT sl.*, COUNT(i.id)::int AS item_count
     FROM shopping_lists sl
     LEFT JOIN shopping_list_items i ON i.list_id = sl.id
     WHERE sl.user_id = $1
     GROUP BY sl.id
     ORDER BY sl.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getList(userId: number, listId: number) {
  const listResult = await pool.query(
    'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
    [listId, userId]
  );
  const list = listResult.rows[0];
  if (!list) return null;

  const items = await pool.query(
    `SELECT i.id, i.product_id, p.name, p.brand, p.category, p.unit, p.size,
            i.quantity, i.is_purchased
     FROM shopping_list_items i
     JOIN products p ON p.id = i.product_id
     WHERE i.list_id = $1
     ORDER BY p.name`,
    [listId]
  );

  return { ...list, items: items.rows };
}

export async function renameList(userId: number, listId: number, name: string) {
  const result = await pool.query(
    `UPDATE shopping_lists SET name = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [name, listId, userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteList(userId: number, listId: number) {
  const result = await pool.query(
    'DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2',
    [listId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Retorna null se a lista não existe ou não é do usuário
export async function addItem(
  userId: number,
  listId: number,
  productId: number,
  quantity: number
) {
  const result = await pool.query(
    `INSERT INTO shopping_list_items (list_id, product_id, quantity)
     SELECT sl.id, $2, $3
     FROM shopping_lists sl
     WHERE sl.id = $1 AND sl.user_id = $4
     RETURNING *`,
    [listId, productId, quantity, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateItem(
  userId: number,
  listId: number,
  itemId: number,
  data: { quantity?: number; is_purchased?: boolean }
) {
  const result = await pool.query(
    `UPDATE shopping_list_items i SET
       quantity = COALESCE($1, i.quantity),
       is_purchased = COALESCE($2, i.is_purchased)
     FROM shopping_lists sl
     WHERE i.id = $3 AND i.list_id = $4
       AND sl.id = i.list_id AND sl.user_id = $5
     RETURNING i.*`,
    [data.quantity ?? null, data.is_purchased ?? null, itemId, listId, userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteItem(userId: number, listId: number, itemId: number) {
  const result = await pool.query(
    `DELETE FROM shopping_list_items i
     USING shopping_lists sl
     WHERE i.id = $1 AND i.list_id = $2
       AND sl.id = i.list_id AND sl.user_id = $3`,
    [itemId, listId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}