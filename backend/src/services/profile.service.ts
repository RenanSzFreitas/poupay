import { pool } from '../db';

// Só os dígitos: "(11) 98765-4321" -> "11987654321"
export const onlyDigits = (v: string) => v.replace(/\D/g, '');

// Confere os dois dígitos verificadores do CPF
export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

const PROFILE_COLUMNS = 'id, name, email, phone, cpf, premium_until, created_at';

export async function getProfile(userId: number) {
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [userId]);
  return result.rows[0] ?? null;
}

export interface ProfileInput {
  name?: string;
  email?: string;
  phone?: string | null;
  cpf?: string | null;
}

// Atualiza só os campos enviados
export async function updateProfile(userId: number, input: ProfileInput) {
  const sets: string[] = [];
  const values: unknown[] = [];

  const put = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (input.name !== undefined) put('name', input.name);
  if (input.email !== undefined) put('email', input.email.toLowerCase());
  if (input.phone !== undefined) put('phone', input.phone);
  if (input.cpf !== undefined) put('cpf', input.cpf);

  if (sets.length === 0) return getProfile(userId);

  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING ${PROFILE_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

// Números do topo do perfil
export async function getStats(userId: number) {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM purchases WHERE user_id = $1) AS purchases,
       (SELECT COALESCE(SUM(reference_highest_total - total_paid), 0)
          FROM purchases
          WHERE user_id = $1 AND reference_market_count >= 2) AS total_savings,
       (SELECT COUNT(*)::int FROM user_favorite_markets WHERE user_id = $1) AS favorite_markets`,
    [userId]
  );
  const row = result.rows[0];
  return {
    purchases: row.purchases as number,
    total_savings: Number(row.total_savings).toFixed(2),
    favorite_markets: row.favorite_markets as number,
  };
}
