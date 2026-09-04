/**
 * Adaptador do Gmail.
 *
 * Fala com a API do Google por `fetch`, sem SDK: sao tres chamadas, e o SDK
 * oficial carrega meia biblioteca de autenticacao que nao seria usada aqui.
 *
 * O escopo pedido e `gmail.readonly`. A ferramenta le a caixa e nunca escreve,
 * marca ou apaga nada — e o consentimento que o Google mostra ao operador diz
 * exatamente isso.
 *
 * Nada aqui interpreta o conteudo da mensagem. Este arquivo entrega o e-mail
 * cru; transformar isso em campos de um MED e trabalho do dominio, contra um
 * e-mail real, e ainda nao existe.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Formato do id de mensagem do Gmail.
 *
 * O id entra numa URL por interpolacao; um valor com `../` mudaria o endpoint
 * chamado, levando o token para um caminho que nao e este. Validar aqui, na
 * fronteira que monta a URL, cobre todo mundo que chamar.
 */
const MESSAGE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Só leitura. Não pedimos mais do que precisamos. */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  /** Obtido uma vez no consentimento; e o que sobrevive entre deploys. */
  refreshToken: string | null;
}

export interface GmailMessageHeader {
  id: string;
  threadId: string;
  /** Data em que o Gmail recebeu, em ISO. */
  receivedAt: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
}

/**
 * URL do consentimento.
 *
 * `access_type=offline` e `prompt=consent` sao o que faz o Google devolver um
 * refresh token. Sem os dois, a segunda autorizacao devolve so um token de
 * uma hora, e a integracao morre sozinha depois do almoco.
 */
export function buildConsentUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', input.state);
  return url.toString();
}

export class GmailError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'GmailError';
  }
}

type Fetch = typeof fetch;

async function postForm(
  doFetch: Fetch,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await doFetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    // A mensagem do Google e util e nao carrega segredo; o corpo inteiro,
    // que pode trazer o token, nunca entra no erro.
    const detail =
      typeof payload.error_description === 'string'
        ? payload.error_description
        : typeof payload.error === 'string'
          ? payload.error
          : 'sem detalhe';
    throw new GmailError(`Google recusou a troca de token: ${detail}`, response.status);
  }
  return payload;
}

/** Troca o codigo do consentimento pelo refresh token. Acontece uma vez. */
export async function exchangeCode(
  input: { clientId: string; clientSecret: string; redirectUri: string; code: string },
  doFetch: Fetch = fetch,
): Promise<{ refreshToken: string; accessToken: string }> {
  const payload = await postForm(doFetch, {
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code: input.code,
  });

  const refreshToken = payload.refresh_token;
  const accessToken = payload.access_token;
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new GmailError(
      'O Google não devolveu refresh token. Isso acontece quando a conta já autorizou antes: ' +
        'remova o acesso em myaccount.google.com/permissions e autorize de novo.',
    );
  }
  if (typeof accessToken !== 'string') throw new GmailError('Resposta sem access token.');
  return { refreshToken, accessToken };
}

/** Troca o refresh token por um access token de curta duracao. */
export async function refreshAccessToken(
  credentials: GmailCredentials,
  doFetch: Fetch = fetch,
): Promise<string> {
  if (!credentials.refreshToken) throw new GmailError('Gmail não conectado.');
  const payload = await postForm(doFetch, {
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
  });
  const accessToken = payload.access_token;
  if (typeof accessToken !== 'string') throw new GmailError('Resposta sem access token.');
  return accessToken;
}

function headerOf(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
): string | null {
  const found = headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? null;
}

/**
 * Endereco da caixa autorizada.
 *
 * A tela precisa dizer *qual* conta foi ligada — "Gmail conectado" sozinho nao
 * deixa ninguem perceber que autorizou a caixa errada. E endereco, nao
 * credencial: pode aparecer.
 */
export async function fetchProfileEmail(
  accessToken: string,
  doFetch: Fetch = fetch,
): Promise<string | null> {
  const response = await doFetch(`${API_BASE}/profile`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  // Sem endereco a conexao ainda vale; a tela mostra a conexao sem o rotulo.
  if (!response.ok) return null;
  const payload = (await response.json()) as { emailAddress?: string };
  return typeof payload.emailAddress === 'string' ? payload.emailAddress : null;
}

/**
 * Mensagens que casam com a busca, mais novas primeiro.
 *
 * `query` e a mesma sintaxe da caixa de busca do Gmail — `from:med@banco.com.br`
 * — para o operador poder conferir no proprio Gmail o que a ferramenta vai ver.
 */
export async function listMessages(
  input: { accessToken: string; query: string; limit?: number },
  doFetch: Fetch = fetch,
): Promise<GmailMessageHeader[]> {
  const listUrl = new URL(`${API_BASE}/messages`);
  listUrl.searchParams.set('q', input.query);
  listUrl.searchParams.set('maxResults', String(input.limit ?? 25));

  const listResponse = await doFetch(listUrl.toString(), {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
  if (!listResponse.ok) {
    throw new GmailError(`Gmail recusou a listagem (${listResponse.status}).`, listResponse.status);
  }
  const listPayload = (await listResponse.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const ids = listPayload.messages ?? [];

  const headers: GmailMessageHeader[] = [];
  for (const item of ids) {
    const detailUrl = new URL(`${API_BASE}/messages/${item.id}`);
    detailUrl.searchParams.set('format', 'metadata');
    for (const name of ['From', 'Subject', 'Date']) {
      detailUrl.searchParams.append('metadataHeaders', name);
    }
    const detail = await doFetch(detailUrl.toString(), {
      headers: { authorization: `Bearer ${input.accessToken}` },
    });
    if (!detail.ok) continue;
    const message = (await detail.json()) as {
      id: string;
      threadId: string;
      internalDate?: string;
      snippet?: string;
      payload?: { headers?: Array<{ name?: string; value?: string }> };
    };
    headers.push({
      id: message.id,
      threadId: message.threadId,
      receivedAt: new Date(Number(message.internalDate ?? 0)).toISOString(),
      from: headerOf(message.payload?.headers, 'From'),
      subject: headerOf(message.payload?.headers, 'Subject'),
      snippet: message.snippet ?? null,
    });
  }
  return headers;
}

/**
 * A mensagem inteira, como ela chegou.
 *
 * O Gmail devolve o RFC 822 em base64url. E este texto — nao um resumo, nao
 * uma reconstrucao — que vira evidencia do caso, com o id da mensagem como
 * `sourceReference`.
 */
export async function fetchRawMessage(
  input: { accessToken: string; messageId: string },
  doFetch: Fetch = fetch,
): Promise<string> {
  if (!MESSAGE_ID.test(input.messageId)) {
    throw new GmailError('Identificador de mensagem inválido.', 400);
  }
  const url = new URL(`${API_BASE}/messages/${input.messageId}`);
  url.searchParams.set('format', 'raw');
  const response = await doFetch(url.toString(), {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
  if (!response.ok) {
    throw new GmailError(`Gmail recusou a mensagem (${response.status}).`, response.status);
  }
  const payload = (await response.json()) as { raw?: string };
  if (typeof payload.raw !== 'string') throw new GmailError('Mensagem sem corpo cru.');
  return Buffer.from(payload.raw, 'base64url').toString('utf8');
}
