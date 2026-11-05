import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { getPlan } from '../services/plan.service';

export async function requirePremium(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plan = await getPlan(Number(req.userId));

    if (!plan.isPremium) {
      return res.status(402).json({
        error: 'Recurso exclusivo para assinantes',
        code: 'PREMIUM_REQUIRED',
      });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}