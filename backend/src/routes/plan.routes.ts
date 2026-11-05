import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { getPlan } from '../services/plan.service';
import { getSubscriptionStatus } from '../services/billing.service';

const router = Router();

// Plano do usuário logado
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.userId);
    const plan = await getPlan(userId);
    const subscriptionStatus = await getSubscriptionStatus(userId);
    return res.json({
      is_premium: plan.isPremium,
      premium_until: plan.premiumUntil,
      subscription_status: subscriptionStatus,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;