import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import authRouter from './routes/auth.routes';
import marketsRouter from './routes/markets.routes';
import productsRouter from './routes/products.routes';
import pricesRouter from './routes/prices.routes';
import shoppingListsRouter from './routes/shopping-lists.routes';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi';
import usersRouter from './routes/users.routes';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/markets', marketsRouter);
app.use('/products', productsRouter);
app.use('/prices', pricesRouter);
app.use('/shopping-lists', shoppingListsRouter);
app.use('/users/me', usersRouter);
app.get('/docs.json', (_req, res) => {
  res.json(openapi);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

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