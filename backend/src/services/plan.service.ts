import { pool } from '../db';

export async function getPlan(userId: number) {
  const result = await pool.query(
    `SELECT premium_until,
            (premium_until IS NOT NULL AND premium_until > NOW()) AS is_premium
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0];
  const isPremium = Boolean(row?.is_premium);

  return {
    isPremium,
    premiumUntil: isPremium ? (row.premium_until as Date) : null,
  };
}