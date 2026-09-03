import { timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCode, GmailError } from '@/infra/adapters/gmail';
import { getConfig } from '@/lib/env';
import { jsonError } from '@/lib/api';
import { gmailRedirectUri, GMAIL_STATE_COOKIE } from '@/lib/gmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Comparacao em tempo constante, para o `state` nao vazar por tempo. */
function sameState(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Volta do consentimento do Google.
 *
 * O refresh token **nao** e gravado sozinho: ele e um segredo de longa duracao,
 * e este projeto guarda segredo em variavel de ambiente, nao em banco. A rota
 * mostra o valor uma vez, para o operador colar em `GMAIL_REFRESH_TOKEN` na
 * Vercel — o mesmo caminho de toda credencial daqui.
 */
export async function GET(request: Request) {
  const config = getConfig();
  const url = new URL(request.url);

  const error = url.searchParams.get('error');
  if (error) return jsonError(400, `O Google recusou a autorização: ${error}`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return jsonError(400, 'Retorno do Google sem código ou sem state.');

  const store = await cookies();
  const expected = store.get(GMAIL_STATE_COOKIE)?.value;
  // Os dois casos falham igual, mas se consertam diferente: sem cookie e
  // demora ou aba antiga; cookie diferente e outra autorizacao por cima desta.
  if (!expected) {
    // Diz o host que respondeu e o host configurado. Quando diferem, a causa
    // e essa e nao o prazo — e sem isto impresso a distincao e invisivel.
    const headerStore = await headers();
    const answeringHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? '?';
    const canonicalHost = new URL(config.appUrl).host;
    const hostNote =
      answeringHost === canonicalHost
        ? ''
        : ` O fluxo terminou em ${answeringHost}, mas NEXT_PUBLIC_APP_URL aponta para ` +
          `${canonicalHost}: o cookie ficou no outro host.`;
    return jsonError(
      400,
      'A autorização expirou ou começou em outra aba. Volte a Integrações, clique em ' +
        `Conectar e conclua sem sair do fluxo (a janela é de 30 minutos).${hostNote}`,
    );
  }
  if (!sameState(expected, state)) {
    return jsonError(
      400,
      'Esta autorização foi substituída por outra mais recente. Use a aba mais nova, ' +
        'ou recomece pela tela de Integrações.',
    );
  }
  store.delete(GMAIL_STATE_COOKIE);

  if (!config.gmail.clientId || !config.gmail.clientSecret) {
    return jsonError(503, 'Gmail não configurado.');
  }

  try {
    const { refreshToken } = await exchangeCode({
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      redirectUri: gmailRedirectUri(config.appUrl),
      code,
    });

    // Texto puro, e nao uma tela: isto e para copiar e colar uma vez.
    return new NextResponse(
      [
        'Autorizado.',
        '',
        'Copie a linha abaixo e crie a variável de ambiente na Vercel',
        '(Settings -> Environment Variables -> Production). Depois, Redeploy.',
        '',
        `GMAIL_REFRESH_TOKEN=${refreshToken}`,
        '',
        'Esta página não guardou o token em lugar nenhum. Se fechar sem copiar,',
        'refaça a conexão pela tela de Integrações.',
        '',
        'ATENÇÃO: a linha acima dá acesso de leitura à caixa de e-mail, e vale',
        'até ser revogada. Não tire print desta página, não cole o valor em',
        'chat, ticket ou commit. Vá daqui direto para a Vercel.',
        'Se ele escapar, revogue em myaccount.google.com/permissions e refaça',
        'a conexão — o token antigo morre na hora.',
      ].join('\n'),
      { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } },
    );
  } catch (caught) {
    if (caught instanceof GmailError) return jsonError(caught.status ?? 502, caught.message);
    throw caught;
  }
}
