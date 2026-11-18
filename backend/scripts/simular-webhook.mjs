import 'dotenv/config';
import crypto from 'node:crypto';

const checkoutId = process.argv[2];
const duplicado = process.argv.includes('--duplicado');

if (!checkoutId || !checkoutId.startsWith('bill_')) {
  console.log('Uso: node scripts/simular-webhook.mjs bill_ID_DO_CHECKOUT [--duplicado]');
  process.exit(1);
}

const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
const publicKey = process.env.ABACATEPAY_HMAC_PUBLIC_KEY;
const port = process.env.PORT || 3000;

if (!secret || !publicKey) {
  console.log('Faltam ABACATEPAY_WEBHOOK_SECRET ou ABACATEPAY_HMAC_PUBLIC_KEY no .env');
  process.exit(1);
}

// Evento no mesmo formato da documentação (subscription.completed)
const payload = {
  id: `log_teste_${Date.now()}`,
  event: 'subscription.completed',
  apiVersion: 2,
  devMode: true,
  data: {
    subscription: {
      id: `subs_teste_${checkoutId.slice(-8)}`,
      status: 'ACTIVE',
      frequency: 'MONTHLY',
    },
    checkout: { id: checkoutId, externalId: null },
  },
};

const raw = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', publicKey).update(raw).digest('base64');
const url = `http://localhost:${port}/webhooks/abacatepay?webhookSecret=${encodeURIComponent(secret)}`;

async function send(label, body, sig) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
    body,
  });
  console.log(label, '-> HTTP', res.status, await res.text());
}

await send('evento válido', raw, signature);
if (duplicado) await send('mesmo evento de novo', raw, signature);
await send('assinatura inválida', raw, 'assinatura-invalida');