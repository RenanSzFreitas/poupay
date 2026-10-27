import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import authRouter from './routes/auth.routes';
import marketsRouter from './routes/markets.routes';
import productsRouter from './routes/products.routes';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/markets', marketsRouter);
app.use('/products', productsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', database: 'unreachable' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});