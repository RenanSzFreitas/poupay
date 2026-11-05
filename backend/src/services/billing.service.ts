import type { PoolClient } from 'pg';
import { pool } from '../db';

const API_URL = 'https://api.abacatepay.com/v2';

// Cria o checkout da assinatura na AbacatePay e guarda o vínculo com o usuário
export async function createSubscriptionCheckout(userId: number) {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  const productId = process.env.ABACATEPAY_PRODUCT_ID;
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3001';

  if (!apiKey || !productId) {
    throw new Error('AbacatePay não configurada (ABACATEPAY_API_KEY / ABACATEPAY_PRODUCT_ID)');
  }

  const res = await fetch(`${API_URL}/subscriptions/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ id: productId, quantity: 1 }],
      methods: ['CARD'],
      externalId: `poupay-user-${userId}`,
      metadata: { userId: String(userId) },
      completionUrl: `${frontend}/assinatura/obrigado`,
      returnUrl: `${frontend}/assinatura`,
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success || !body?.data?.url) {
    console.error('AbacatePay: falha ao criar o checkout', res.status, body?.error);
    throw new Error('Falha ao criar o checkout');
  }

  await pool.query(
    'INSERT INTO billing_subscriptions (user_id, checkout_id) VALUES ($1, $2)',
    [userId, body.data.id]
  );

  return { url: body.data.url as string };
}

// Situação da última assinatura do usuário (null se nunca pagou)
export async function getSubscriptionStatus(userId: number) {
  const result = await pool.query(
    `SELECT status FROM billing_subscriptions
     WHERE user_id = $1 AND subscription_id IS NOT NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  return (result.rows[0]?.status as 'active' | 'cancelled' | undefined) ?? null;
}

// Pagamento confirmado (primeira cobrança ou renovação): libera 1 mês + 3 dias de folga
async function activate(client: PoolClient, data: any) {
  const subscriptionId = data?.subscription?.id;
  if (typeof subscriptionId !== 'string') return;

  // 1) Renovação: já conhecemos essa assinatura
  let row = (
    await client.query(
      'SELECT id, user_id FROM billing_subscriptions WHERE subscription_id = $1',
      [subscriptionId]
    )
  ).rows[0];

  // 2) Primeira cobrança: liga a assinatura ao checkout que criamos
  const checkoutId = data?.checkout?.id;
  if (!row && typeof checkoutId === 'string') {
    row = (
      await client.query(
        `UPDATE billing_subscriptions
         SET subscription_id = $1, updated_at = NOW()
         WHERE checkout_id = $2 AND subscription_id IS NULL
         RETURNING id, user_id`,
        [subscriptionId, checkoutId]
      )
    ).rows[0];
  }

  // 3) Plano B: usa o externalId que enviamos ao criar o checkout
  const externalId = data?.checkout?.externalId ?? data?.payment?.externalId;
  const match = typeof externalId === 'string' ? externalId.match(/^poupay-user-(\d+)$/) : null;
  if (!row && match) {
    row = (
      await client.query(
        `UPDATE billing_subscriptions
         SET subscription_id = $1, updated_at = NOW()
         WHERE id = (
           SELECT id FROM billing_subscriptions
           WHERE user_id = $2 AND subscription_id IS NULL
           ORDER BY created_at DESC LIMIT 1
         )
         RETURNING id, user_id`,
        [subscriptionId, Number(match[1])]
      )
    ).rows[0];
  }

  if (!row) {
    console.warn('Webhook: assinatura sem usuário correspondente', subscriptionId);
    return;
  }

  await client.query(
    `UPDATE billing_subscriptions SET status = 'active', updated_at = NOW() WHERE id = $1`,
    [row.id]
  );
  await client.query(
    `UPDATE users SET premium_until = NOW() + INTERVAL '1 month 3 days' WHERE id = $1`,
    [row.user_id]
  );
}

// Cancelamento: o usuário mantém o acesso até o fim do período que já pagou
async function markCancelled(client: PoolClient, data: any) {
  const subscriptionId = data?.subscription?.id;
  if (typeof subscriptionId !== 'string') return;

  await client.query(
    `UPDATE billing_subscriptions SET status = 'cancelled', updated_at = NOW()
     WHERE subscription_id = $1`,
    [subscriptionId]
  );
}

// Processa um evento do webhook, uma única vez (idempotente)
export async function processWebhook(payload: any): Promise<'processed' | 'duplicate' | 'ignored'> {
  const eventId = payload?.id;
  const type = payload?.event;

  if (typeof eventId !== 'string' || typeof type !== 'string') return 'ignored';

  // Em produção, eventos simulados do Dev mode não podem liberar acesso
  if (payload?.devMode === true && process.env.NODE_ENV === 'production') return 'ignored';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO billing_events (event_id, event) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING event_id`,
      [eventId, type]
    );

    if (inserted.rowCount === 0) {
      await client.query('ROLLBACK');
      return 'duplicate';
    }

    if (type === 'subscription.completed' || type === 'subscription.renewed') {
      await activate(client, payload.data);
    } else if (type === 'subscription.cancelled') {
      await markCancelled(client, payload.data);
    }

    await client.query('COMMIT');
    return 'processed';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}