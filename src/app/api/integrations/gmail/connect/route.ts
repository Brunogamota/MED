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
export async function GET(request: Request) {
  const config = getConfig();
  const redirectUri = gmailRedirectUri(config.appUrl);

  /**
   * `?mostrar=1` devolve a URL de retorno em vez de iniciar o fluxo.
   *
   * `redirect_uri_mismatch` e o erro mais comum aqui, e a tela do Google nao
   * diz qual das duas URLs estava errada — so que elas diferem. Isto mostra a
   * que o app manda, para comparar com a cadastrada no Google Cloud.
   */
  if (new URL(request.url).searchParams.has('mostrar')) {
    return new NextResponse(
      [
        'URL de retorno que este deploy envia ao Google:',
        '',
        redirectUri,
        '',
        'Ela precisa estar cadastrada, igual a esta linha, em',
        'console.cloud.google.com/apis/credentials -> seu cliente OAuth ->',
        'URIs de redirecionamento autorizados.',
        '',
        'Sai de NEXT_PUBLIC_APP_URL. Sem essa variavel, o app cai no endereco',
        'do deploy da Vercel, que muda a cada build e nunca vai bater.',
      ].join('\n'),
      { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }
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
    buildConsentUrl({ clientId: config.gmail.clientId, redirectUri, state }),
  );
}
