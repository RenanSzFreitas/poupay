import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { getPlan } from '../services/plan.service';
import { createSubscriptionCheckout } from '../services/billing.service';

const router = Router();

// Inicia a assinatura: devolve o endereço da página de pagamento
router.post('/checkout', authenticate, async (req: AuthRequest, res) => {
  const userId = Number(req.userId);

  try {
    const plan = await getPlan(userId);
    if (plan.isPremium) {
      return res.status(409).json({ error: 'Você já tem uma assinatura ativa' });
    }

    const { url } = await createSubscriptionCheckout(userId);
    return res.status(201).json({ url });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: 'Não foi possível iniciar o pagamento. Tente novamente em instantes.',
    });
  }
});

export default router;