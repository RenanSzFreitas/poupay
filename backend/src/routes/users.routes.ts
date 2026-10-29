import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import * as prefs from '../services/market-preferences.service';

const router = Router();

// Tudo aqui é do usuário logado
router.use(authenticate);

const idSchema = z.coerce.number().int().positive();
const addSchema = z.object({ market_id: z.number().int().positive() });
const selectedSchema = z.object({
  market_ids: z.array(z.number().int().positive()).max(50),
});

function userIdOf(req: AuthRequest) {
  return Number(req.userId);
}

// ---- Favoritos ----

router.get('/favorite-markets', async (req: AuthRequest, res) => {
  try {
    return res.json(await prefs.listMarketsOf('favorite', userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/favorite-markets', async (req: AuthRequest, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const fav = await prefs.addMarket('favorite', userIdOf(req), parsed.data.market_id);
    return res.status(201).json(fav);
  } catch (err: any) {
    if (err.code === '23503') return res.status(404).json({ error: 'Supermercado não encontrado' });
    if (err.code === '23505') return res.status(409).json({ error: 'Supermercado já está nos favoritos' });
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/favorite-markets/:marketId', async (req: AuthRequest, res) => {
  const marketId = idSchema.safeParse(req.params.marketId);
  if (!marketId.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const removed = await prefs.removeMarket('favorite', userIdOf(req), marketId.data);
    if (!removed) return res.status(404).json({ error: 'Favorito não encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ---- Seleção para comparação ----

router.get('/selected-markets', async (req: AuthRequest, res) => {
  try {
    return res.json(await prefs.listMarketsOf('selected', userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/selected-markets', async (req: AuthRequest, res) => {
  const parsed = selectedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    await prefs.replaceSelected(userIdOf(req), parsed.data.market_ids);
    return res.json(await prefs.listMarketsOf('selected', userIdOf(req)));
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Algum supermercado não foi encontrado' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;