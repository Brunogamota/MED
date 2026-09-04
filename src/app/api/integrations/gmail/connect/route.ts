import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildConsentUrl } from '@/infra/adapters/gmail';
import { getConfig } from '@/lib/env';
import { SecretBoxError, readEncryptionKey } from '@/lib/secretBox';
import { jsonError } from '@/lib/api';
import { GMAIL_STATE_COOKIE, GMAIL_STATE_MAX_AGE_SECONDS, gmailRedirectUri } from '@/lib/gmail';

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

  /**
   * O consentimento tem de comecar no mesmo host em que termina.
   *
   * O cookie do `state` e gravado no host que responde a este pedido, mas o
   * Google volta sempre para o host de `NEXT_PUBLIC_APP_URL`. Comecar pelo
   * endereco do deploy (`med-xxxx.vercel.app`, que e o link do painel da
   * Vercel) e terminar no endereco fixo deixa o cookie do lado de la: a volta
   * nao acha nada e acusa autorizacao expirada, quando o que houve foi troca
   * de host.
   *
   * Entao mandamos o operador para o host canonico antes de comecar. O marcador
   * `canonico` impede um segundo salto caso o host visto aqui nunca coincida
   * com o configurado — melhor falhar adiante, com mensagem, do que em laco.
   */
  const requestUrl = new URL(request.url);
  const headerStore = await headers();
  const currentHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  if (
    !requestUrl.searchParams.has('canonico') &&
    currentHost &&
    new URL(config.appUrl).host !== currentHost
  ) {
    const canonical = new URL('/api/integrations/gmail/connect', config.appUrl);
    canonical.searchParams.set('canonico', '1');
    return NextResponse.redirect(canonical);
  }

  /**
   * Sem chave de cifra nao ha onde guardar o token com seguranca.
   *
   * Recusar aqui, e nao no retorno: mandar o operador autorizar no Google para
   * so entao dizer que faltava configuracao gasta o consentimento dele a toa.
   */
  try {
    readEncryptionKey(process.env.ENCRYPTION_KEY);
  } catch (caught) {
    if (caught instanceof SecretBoxError) return jsonError(503, caught.message);
    throw caught;
  }

  const state = randomBytes(16).toString('hex');
  const store = await cookies();
  store.set(GMAIL_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appEnv !== 'development',
    path: '/',
    maxAge: GMAIL_STATE_MAX_AGE_SECONDS,
  });

  return NextResponse.redirect(
    buildConsentUrl({ clientId: config.gmail.clientId, redirectUri, state }),
  );
}
