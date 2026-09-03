import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildConsentUrl } from '@/infra/adapters/gmail';
import { getConfig } from '@/lib/env';
import { jsonError } from '@/lib/api';
import { gmailRedirectUri, GMAIL_STATE_COOKIE } from '@/lib/gmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Inicio do consentimento do Gmail.
 *
 * O `state` e um valor aleatorio guardado num cookie e conferido na volta: sem
 * ele, qualquer pagina poderia induzir o navegador do operador a completar um
 * fluxo de autorizacao que ele nao comecou (CSRF).
 */
export async function GET() {
  const config = getConfig();
  if (!config.gmail.configured || !config.gmail.clientId) {
    return jsonError(
      503,
      'Gmail não configurado: defina GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET.',
    );
  }

  const state = randomBytes(16).toString('hex');
  const store = await cookies();
  store.set(GMAIL_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appEnv !== 'development',
    path: '/',
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(
    buildConsentUrl({
      clientId: config.gmail.clientId,
      redirectUri: gmailRedirectUri(config.appUrl),
      state,
    }),
  );
}
