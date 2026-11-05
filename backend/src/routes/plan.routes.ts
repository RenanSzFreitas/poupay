import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { getPlan } from '../services/plan.service';

const router = Router();

// Plano do usuário logado
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const plan = await getPlan(Number(req.userId));
    return res.json({ is_premium: plan.isPremium, premium_until: plan.premiumUntil });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;