import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import * as marketsService from '../services/markets.service';

const router = Router();

const idSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const updateSchema = createSchema.partial();

// Listar (público)
router.get('/', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const markets = await marketsService.listMarkets(search);
    return res.json(markets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar um (público)
router.get('/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const market = await marketsService.getMarket(id.data);
    if (!market) return res.status(404).json({ error: 'Supermercado não encontrado' });
    return res.json(market);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar (protegido)
router.post('/', authenticate, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const market = await marketsService.createMarket(parsed.data);
    return res.status(201).json(market);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar (protegido)
router.patch('/:id', authenticate, async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    const market = await marketsService.updateMarket(id.data, parsed.data);
    if (!market) return res.status(404).json({ error: 'Supermercado não encontrado' });
    return res.json(market);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Apagar (protegido)
router.delete('/:id', authenticate, async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const deleted = await marketsService.deleteMarket(id.data);
    if (!deleted) return res.status(404).json({ error: 'Supermercado não encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;