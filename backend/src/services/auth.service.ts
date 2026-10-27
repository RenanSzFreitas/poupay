import bcrypt from 'bcryptjs';
import { pool } from '../db';
import jwt from 'jsonwebtoken';

export async function registerUser(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email.toLowerCase(), passwordHash]
  );

  return result.rows[0];
}

export async function loginUser(email: string, password: string) {
  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  if (!user) return null;

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return null;

  const token = jwt.sign(
    { sub: String(user.id) },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );

  return { token, user: { id: user.id, name: user.name, email: user.email } };
}