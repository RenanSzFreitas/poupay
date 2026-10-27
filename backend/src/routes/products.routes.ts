import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import * as productsService from '../services/products.service';

const router = Router();

const idSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().min(2).max(100),
  unit: z.enum(['un', 'g', 'kg', 'ml', 'l']),
  size: z.number().positive(),
});

const updateSchema = createSchema.partial();

function queryText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// Listar com filtros (público)
router.get('/', async (req, res) => {
  try {
    const products = await productsService.listProducts({
      search: queryText(req.query.search),
      category: queryText(req.query.category),
      brand: queryText(req.query.brand),
    });
    return res.json(products);
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
    const product = await productsService.getProduct(id.data);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(product);
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
    const product = await productsService.createProduct(parsed.data);
    return res.status(201).json(product);
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
    const product = await productsService.updateProduct(id.data, parsed.data);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(product);
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
    const deleted = await productsService.deleteProduct(id.data);
    if (!deleted) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;