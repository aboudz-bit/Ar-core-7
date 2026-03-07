import { prisma } from './prisma';
import { createHmac } from 'crypto';

export type WebhookEvent =
  | 'ar_viewed'
  | 'ar_launched'
  | 'experience_published'
  | 'qr_opened'
  | 'asset_uploaded';

const WEBHOOK_SIGNING_SECRET = process.env.WEBHOOK_SIGNING_SECRET || 'whsec_dev_secret';

/**
 * Generate HMAC signature for webhook payload.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch a webhook event to all registered endpoints for a company.
 * Creates delivery records and processes them asynchronously.
 */
export async function dispatchWebhook(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      companyId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Create delivery records and attempt delivery
  for (const webhook of webhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as object,
        maxAttempts: 3,
      },
    });

    // Fire and forget — attempt delivery asynchronously
    attemptDelivery(delivery.id, webhook.url, webhook.secret, payload).catch((err) => {
      console.error(`Webhook delivery ${delivery.id} failed:`, err);
    });
  }
}

/**
 * Attempt to deliver a webhook. Handles retries with exponential backoff.
 */
async function attemptDelivery(
  deliveryId: string,
  url: string,
  secret: string,
  payload: object,
  attempt: number = 1
): Promise<void> {
  const payloadStr = JSON.stringify(payload);
  const signature = signPayload(payloadStr, secret || WEBHOOK_SIGNING_SECRET);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ARCore7-Signature': signature,
        'X-ARCore7-Event': (payload as { event: string }).event,
        'X-ARCore7-Delivery': deliveryId,
        'User-Agent': 'ARCore7-Webhooks/1.0',
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        statusCode: response.status,
        response: (await response.text()).slice(0, 1000),
        attempts: attempt,
        deliveredAt: response.ok ? new Date() : null,
        failedAt: response.ok ? null : new Date(),
        nextRetryAt: response.ok ? null : getNextRetryTime(attempt),
      },
    });

    if (!response.ok && attempt < 3) {
      const delay = getRetryDelay(attempt);
      setTimeout(() => {
        attemptDelivery(deliveryId, url, secret, payload, attempt + 1);
      }, delay);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: attempt,
        response: errorMsg.slice(0, 1000),
        failedAt: new Date(),
        nextRetryAt: attempt < 3 ? getNextRetryTime(attempt) : null,
      },
    });

    if (attempt < 3) {
      const delay = getRetryDelay(attempt);
      setTimeout(() => {
        attemptDelivery(deliveryId, url, secret, payload, attempt + 1);
      }, delay);
    }
  }
}

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 10s, 60s, 300s
  return [10_000, 60_000, 300_000][attempt - 1] || 300_000;
}

function getNextRetryTime(attempt: number): Date {
  const delay = getRetryDelay(attempt);
  return new Date(Date.now() + delay);
}

/**
 * Verify webhook signature on the receiving end.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);
  return expected === signature;
}
