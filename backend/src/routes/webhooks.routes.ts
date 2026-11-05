import crypto from 'node:crypto';
import express, { Router } from 'express';
import { processWebhook } from '../services/billing.service';

const router = Router();

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// O corpo precisa chegar "cru" (sem passar pelo express.json), porque a assinatura
// é calculada sobre os bytes exatos que a AbacatePay enviou
router.post('/abacatepay', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const publicKey = process.env.ABACATEPAY_HMAC_PUBLIC_KEY;

  if (!secret || !publicKey) {
    console.error('Webhook não configurado (secret ou chave HMAC ausentes)');
    return res.status(500).json({ error: 'Webhook não configurado' });
  }

  // Camada 1: o secret que vai na URL
  const querySecret = typeof req.query.webhookSecret === 'string' ? req.query.webhookSecret : '';
  if (!safeEqual(querySecret, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Camada 2: a assinatura HMAC do corpo
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const signature = req.header('x-webhook-signature') ?? '';
  const expected = crypto.createHmac('sha256', publicKey).update(rawBody).digest('base64');

  if (!safeEqual(expected, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  try {
    await processWebhook(payload);
    return res.status(200).json({ ok: true });
  } catch (err) {
    // 500 faz a AbacatePay tentar de novo mais tarde
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;