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

// ---- Endereços ----

export interface AddressInput {
  label: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary?: boolean;
}

const ADDRESS_COLUMNS = `id, label, street, number, complement, neighborhood,
  city, state, zip_code, is_primary, created_at, updated_at`;

export async function listAddresses(userId: number) {
  const result = await pool.query(
    `SELECT ${ADDRESS_COLUMNS} FROM user_addresses
     WHERE user_id = $1
     ORDER BY is_primary DESC, created_at`,
    [userId]
  );
  return result.rows;
}

export async function createAddress(userId: number, input: AddressInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // O primeiro endereço vira principal automaticamente
    const count = await client.query(
      'SELECT COUNT(*)::int AS n FROM user_addresses WHERE user_id = $1',
      [userId]
    );
    const primary = input.is_primary === true || count.rows[0].n === 0;

    if (primary) {
      await client.query('UPDATE user_addresses SET is_primary = FALSE WHERE user_id = $1', [userId]);
    }

    const result = await client.query(
      `INSERT INTO user_addresses
         (user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${ADDRESS_COLUMNS}`,
      [
        userId, input.label, input.street, input.number, input.complement ?? null,
        input.neighborhood, input.city, input.state, input.zip_code, primary,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const EDITABLE = [
  'label', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'zip_code',
] as const;

export async function updateAddress(userId: number, id: number, input: Partial<AddressInput>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const own = await client.query(
      'SELECT 1 FROM user_addresses WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [id, userId]
    );
    if (own.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Só dá para "promover" a principal; o principal só deixa de ser quando outro é promovido
    if (input.is_primary === true) {
      await client.query(
        'UPDATE user_addresses SET is_primary = FALSE WHERE user_id = $1 AND id <> $2',
        [userId, id]
      );
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of EDITABLE) {
      if (input[key] !== undefined) {
        values.push(input[key]);
        sets.push(`${key} = $${values.length}`);
      }
    }
    if (input.is_primary === true) sets.push('is_primary = TRUE');

    values.push(id);
    const result = await client.query(
      `UPDATE user_addresses SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $${values.length}
       RETURNING ${ADDRESS_COLUMNS}`,
      values
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAddress(userId: number, id: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const removed = await client.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING is_primary',
      [id, userId]
    );
    if (removed.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    // Se apagou o principal, o mais antigo que sobrou assume
    if (removed.rows[0].is_primary) {
      await client.query(
        `UPDATE user_addresses SET is_primary = TRUE
         WHERE id = (SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at LIMIT 1)`,
        [userId]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
