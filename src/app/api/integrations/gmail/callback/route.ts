import { timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { GmailError, exchangeCode, fetchProfileEmail } from '@/infra/adapters/gmail';
import { serverPageContext } from '@/infra/auth/context';
import { getConfig } from '@/lib/env';
import { jsonError } from '@/lib/api';
import { SecretBoxError } from '@/lib/secretBox';
import { GMAIL_STATE_COOKIE, gmailRedirectUri } from '@/lib/gmail';
import { saveConnectorCredential } from '@/services/credentialService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Comparacao em tempo constante, para o `state` nao vazar por tempo. */
function sameState(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Volta para a tela, com o resultado no endereco em vez de no corpo. */
function backToIntegrations(appUrl: string, params: Record<string, string>): NextResponse {
  const url = new URL('/integracoes', appUrl);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return NextResponse.redirect(url);
}

/**
 * Volta do consentimento do Google.
 *
 * O refresh token e gravado cifrado, amarrado a organizacao, e o operador
 * volta para a tela de Integracoes. Ele nunca ve o token: mostrar credencial
 * em tela pede que alguem a copie para um lugar pior, e num produto vendido
 * nenhum cliente teria onde cola-la.
 */
export async function GET(request: Request) {
  const config = getConfig();
  const url = new URL(request.url);

  const error = url.searchParams.get('error');
  if (error) {
    return backToIntegrations(config.appUrl, {
      gmail: 'erro',
      motivo: `O Google recusou a autorização: ${error}`,
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return jsonError(400, 'Retorno do Google sem código ou sem state.');

  const store = await cookies();
  const expected = store.get(GMAIL_STATE_COOKIE)?.value;
  // Os dois casos falham igual, mas se consertam diferente: sem cookie e
  // demora ou aba antiga; cookie diferente e outra autorizacao por cima desta.
  if (!expected) {
    const headerStore = await headers();
    const answeringHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? '?';
    const canonicalHost = new URL(config.appUrl).host;
    const hostNote =
      answeringHost === canonicalHost
        ? ''
        : ` O fluxo terminou em ${answeringHost}, mas NEXT_PUBLIC_APP_URL aponta para ` +
          `${canonicalHost}: o cookie ficou no outro host.`;
    return backToIntegrations(config.appUrl, {
      gmail: 'erro',
      motivo:
        'A autorização expirou ou começou em outra aba. Clique em Conectar e conclua sem ' +
        `sair do fluxo (a janela é de 30 minutos).${hostNote}`,
    });
  }
  if (!sameState(expected, state)) {
    return backToIntegrations(config.appUrl, {
      gmail: 'erro',
      motivo: 'Esta autorização foi substituída por outra mais recente. Use a aba mais nova.',
    });
  }
  store.delete(GMAIL_STATE_COOKIE);

  if (!config.gmail.clientId || !config.gmail.clientSecret) {
    return jsonError(503, 'Gmail não configurado.');
  }

  try {
    const { refreshToken, accessToken } = await exchangeCode({
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      redirectUri: gmailRedirectUri(config.appUrl),
      code,
    });

    // Qual caixa foi ligada. Falha aqui nao desfaz a conexao — a tela so fica
    // sem o rótulo.
    const accountLabel = await fetchProfileEmail(accessToken).catch(() => null);

    await saveConnectorCredential(serverPageContext(), 'GMAIL', {
      secret: refreshToken,
      accountLabel,
    });

    return backToIntegrations(config.appUrl, { gmail: 'conectado' });
  } catch (caught) {
    if (caught instanceof GmailError || caught instanceof SecretBoxError) {
      return backToIntegrations(config.appUrl, { gmail: 'erro', motivo: caught.message });
    }
    throw caught;
  }
}
