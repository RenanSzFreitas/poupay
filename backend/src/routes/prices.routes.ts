import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import * as pricesService from '../services/prices.service';

const router = Router();

const createSchema = z.object({
  market_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  price: z.number().positive().max(100000),
  is_promotion: z.boolean().optional(),
  is_available: z.boolean().optional(),
  source: z.enum(['manual', 'test', 'user', 'integration']).optional(),
});

// Registrar um preço (protegido)
router.post('/', authenticate, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const price = await pricesService.createPrice(parsed.data);
    return res.status(201).json(price);
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Produto ou supermercado não encontrado' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;