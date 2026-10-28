import { Pool, types } from 'pg';

types.setTypeParser(20, (value) => parseInt(value, 10));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});