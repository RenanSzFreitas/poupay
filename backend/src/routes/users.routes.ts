import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import * as prefs from '../services/market-preferences.service';
import * as profile from '../services/profile.service';

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

// ---- Perfil ----

const digits = (v: string) => profile.onlyDigits(v);
const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.preprocess(
    emptyToNull,
    z.string().transform(digits).pipe(z.string().regex(/^\d{10,11}$/, 'Celular inválido')).nullable()
  ).optional(),
  cpf: z.preprocess(
    emptyToNull,
    z.string().transform(digits).refine(profile.isValidCpf, 'CPF inválido').nullable()
  ).optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await profile.getProfile(userIdOf(req));
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/', async (req: AuthRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await profile.updateProfile(userIdOf(req), parsed.data);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(user);
  } catch (err: any) {
    if (err.code === '23505') {
      const field = String(err.constraint ?? '').includes('cpf') ? 'CPF' : 'E-mail';
      return res.status(409).json({ error: `${field} já cadastrado` });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    return res.json(await profile.getStats(userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ---- Endereços ----

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  street: z.string().trim().min(1).max(150),
  number: z.string().trim().min(1).max(20),
  complement: z.preprocess(emptyToNull, z.string().trim().max(100).nullable()).optional(),
  neighborhood: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'UF inválida').transform((v) => v.toUpperCase()),
  zip_code: z.string().transform(digits).pipe(z.string().regex(/^\d{8}$/, 'CEP inválido')),
  is_primary: z.boolean().optional(),
});

router.get('/addresses', async (req: AuthRequest, res) => {
  try {
    return res.json(await profile.listAddresses(userIdOf(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/addresses', async (req: AuthRequest, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors });
  }

  try {
    return res.status(201).json(await profile.createAddress(userIdOf(req), parsed.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/addresses/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const address = await profile.updateAddress(userIdOf(req), id.data, parsed.data);
    if (!address) return res.status(404).json({ error: 'Endereço não encontrado' });
    return res.json(address);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/addresses/:id', async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'ID inválido' });

  try {
    const removed = await profile.deleteAddress(userIdOf(req), id.data);
    if (!removed) return res.status(404).json({ error: 'Endereço não encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;