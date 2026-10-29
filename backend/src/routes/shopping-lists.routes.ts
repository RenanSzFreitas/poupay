import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import * as listsService from '../services/shopping-lists.service';
import { compareList } from '../services/comparison.service';
import { getMarketIdsOf } from '../services/market-preferences.service';

const router = Router();

// Todas as rotas de lista exigem login
router.use(authenticate);

const idSchema = z.coerce.number().int().positive();

const listSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const addItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(1000).default(1),
});

const updateItemSchema = z
  .object({
    quantity: z.number().int().positive().max(1000).optional(),
    is_purchased: z.boolean().optional(),
  })
  .refine((d) => d.quantity !== undefined || d.is_purchased !== undefined);

function userIdOf(req: AuthRequest) {
  return Number(req.userId);
}

// Criar lista
router.post('/', async (req: AuthRequest, res) => {
  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const list = await listsService.createList(userIdOf(req), parsed.data.name);
    return res.status(201).json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar as listas do usuário
router.get('/', async (req: AuthRequest, res) => {
  try {
    return res.json(await listsService.listLists(userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ver uma lista com os itens
router.get('/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const list = await listsService.getList(userIdOf(req), id.data);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Renomear lista
router.patch('/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const list = await listsService.renameList(userIdOf(req), id.data, parsed.data.name);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Apagar lista
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const deleted = await listsService.deleteList(userIdOf(req), id.data);
    if (!deleted) return res.status(404).json({ error: 'Lista não encontrada' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar produto à lista
router.post('/:id/items', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const item = await listsService.addItem(
      userIdOf(req),
      id.data,
      parsed.data.product_id,
      parsed.data.quantity
    );
    if (!item) return res.status(404).json({ error: 'Lista não encontrada' });
    return res.status(201).json(item);
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Produto já está na lista' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar quantidade ou marcar como comprado
router.patch('/:id/items/:itemId', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  const itemId = idSchema.safeParse(req.params.itemId);
  if (!id.success || !itemId.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const item = await listsService.updateItem(userIdOf(req), id.data, itemId.data, parsed.data);
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover item da lista
router.delete('/:id/items/:itemId', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  const itemId = idSchema.safeParse(req.params.itemId);
  if (!id.success || !itemId.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const deleted = await listsService.deleteItem(userIdOf(req), id.data, itemId.data);
    if (!deleted) return res.status(404).json({ error: 'Item não encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

const compareSchema = z.object({
  market_ids: z.array(z.number().int().positive()).min(1).max(50).optional(),
  use: z.enum(['selected', 'favorites']).optional(),
});

// Comparar o custo da lista entre supermercados
router.post('/:id/compare', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = compareSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    let marketIds = parsed.data.market_ids;

    if (!marketIds && parsed.data.use) {
      marketIds = await getMarketIdsOf(
        parsed.data.use === 'favorites' ? 'favorite' : 'selected',
        userIdOf(req)
      );
      if (marketIds.length === 0) {
        return res.status(400).json({ error: 'Nenhum supermercado na seleção escolhida' });
      }
    }

    const result = await compareList(userIdOf(req), id.data, marketIds);

    if (result.kind === 'not_found') {
      return res.status(404).json({ error: 'Lista não encontrada' });
    }
    if (result.kind === 'empty') {
      return res.status(400).json({ error: 'A lista não tem itens' });
    }
    if (result.kind === 'no_markets') {
      return res.status(404).json({ error: 'Nenhum supermercado encontrado' });
    }

    return res.json(result.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;