import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { getPlan } from '../services/plan.service';
import * as purchasesService from '../services/purchases.service';

const router = Router();

// Tudo aqui é do usuário logado
router.use(authenticate);

const idSchema = z.coerce.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const itemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(1000),
  unit_price: z.number().min(0).max(100000),
});

const createSchema = z
  .object({
    market_id: z.number().int().positive(),
    list_id: z.number().int().positive().optional(),
    purchased_at: dateSchema.optional(),
    compare_market_ids: z.array(z.number().int().positive()).min(1).max(50).optional(),
    items: z.array(itemSchema).min(1).max(200),
  })
  .refine((d) => new Set(d.items.map((i) => i.product_id)).size === d.items.length, {
    message: 'Produto repetido nos itens',
  });

function userIdOf(req: AuthRequest) {
  return Number(req.userId);
}

// Registrar compra
router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten(),
    });
  }

  try {
    const plan = await getPlan(userIdOf(req));
    const result = await purchasesService.createPurchase(
      userIdOf(req),
      parsed.data,
      plan.isPremium
    );
    if (result.kind === 'list_not_found') {
      return res.status(404).json({ error: 'Lista não encontrada' });
    }
    return res.status(201).json({ ...result.purchase, savings_locked: !plan.isPremium });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Supermercado ou produto não encontrado' });
    }
    if (err.code === '22008') {
      return res.status(400).json({ error: 'Data inválida' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Histórico de compras (filtros opcionais: ?from=AAAA-MM-DD&to=AAAA-MM-DD)
router.get('/history', async (req: AuthRequest, res) => {
  const from = dateSchema.optional().safeParse(req.query.from);
  const to = dateSchema.optional().safeParse(req.query.to);
  if (!from.success || !to.success) {
    return res.status(400).json({ error: 'Datas devem estar no formato AAAA-MM-DD' });
  }

  try {
    return res.json(await purchasesService.listPurchases(userIdOf(req), from.data, to.data));
  } catch (err: any) {
    if (err.code === '22008') return res.status(400).json({ error: 'Data inválida' });
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gastos e economia por mês
router.get('/summary', async (req: AuthRequest, res) => {
  try {
    return res.json(await purchasesService.summaryByMonth(userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ver uma compra com os itens
router.get('/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const purchase = await purchasesService.getPurchase(userIdOf(req), id.data);
    if (!purchase) return res.status(404).json({ error: 'Compra não encontrada' });
    return res.json(purchase);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;