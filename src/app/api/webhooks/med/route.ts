import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createMedSchema } from '@/domain/schemas';
import { createMed } from '@/services/medService';
import { getConfig } from '@/lib/env';
import { jsonError, mapError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { authenticate } from '@/infra/auth/context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Inbound MED webhook.
 *
 * Two protections are mandatory here and both fail closed:
 *  - signature: when WEBHOOK_SIGNING_SECRET is configured the HMAC must match;
 *  - idempotency: a replayed delivery returns the existing MED instead of
 *    creating a duplicate (createMed is idempotent on the institution's own
 *    MED identifier).
 */
function verifySignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const presented = header.replace(/^sha256=/, '').trim();
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const presentedBuffer = Buffer.from(presented, 'utf8');
  if (expectedBuffer.length !== presentedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, presentedBuffer);
}

export async function POST(request: Request) {
  const config = getConfig();
  const rawBody = await request.text();

  if (config.webhookSigningSecret) {
    const signature = request.headers.get('x-signature') ?? request.headers.get('x-hub-signature-256');
    if (!verifySignature(config.webhookSigningSecret, rawBody, signature)) {
      return jsonError(401, 'Assinatura invalida');
    }
  } else if (config.appEnv === 'production') {
    // Refuse unauthenticated ingestion in production rather than trusting the caller.
    return jsonError(503, 'Webhook nao configurado (WEBHOOK_SIGNING_SECRET ausente)');
  }

  try {
    const auth = authenticate(request.headers);

    const limit = rateLimit(`webhook:${auth.organizationId}`, 120, 60_000);
    if (!limit.allowed) return jsonError(429, 'Limite de requisicoes excedido');

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonError(422, 'Corpo da requisicao nao e um JSON valido');
    }

    const input = createMedSchema.parse(payload);
    const med = await createMed(auth, input);
    return NextResponse.json({ data: med }, { status: 202 });
  } catch (error) {
    return mapError(error);
  }
}
