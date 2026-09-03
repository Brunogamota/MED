import { describe, expect, it } from 'vitest';
import {
  GMAIL_SCOPE,
  GmailError,
  buildConsentUrl,
  exchangeCode,
  fetchRawMessage,
  listMessages,
  refreshAccessToken,
} from '@/infra/adapters/gmail';

/** Um `fetch` que devolve respostas combinadas e guarda o que foi pedido. */
function fakeFetch(
  routes: Array<{ match: string; status?: number; body: unknown }>,
): typeof fetch & { calls: Array<{ url: string; body: string | null }> } {
  const calls: Array<{ url: string; body: string | null }> = [];
  const doFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === 'string' ? init.body : null });
    const route = routes.find((entry) => url.includes(entry.match));
    if (!route) throw new Error(`rota não combinada: ${url}`);
    return {
      ok: (route.status ?? 200) < 400,
      status: route.status ?? 200,
      json: async () => route.body,
    } as Response;
  }) as typeof fetch & { calls: typeof calls };
  doFetch.calls = calls;
  return doFetch;
}

describe('buildConsentUrl', () => {
  it('pede só leitura', () => {
    const url = new URL(
      buildConsentUrl({ clientId: 'cid', redirectUri: 'https://app/cb', state: 's' }),
    );
    expect(url.searchParams.get('scope')).toBe(GMAIL_SCOPE);
    expect(GMAIL_SCOPE).toContain('readonly');
  });

  /**
   * Sem `access_type=offline` e `prompt=consent`, o Google devolve só um token
   * de uma hora. A integração funcionaria na primeira tarde e morreria sozinha.
   */
  it('pede o acesso que sobrevive ao fim do dia', () => {
    const url = new URL(
      buildConsentUrl({ clientId: 'cid', redirectUri: 'https://app/cb', state: 's' }),
    );
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('state')).toBe('s');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app/cb');
  });
});

describe('exchangeCode', () => {
  it('devolve o refresh token', async () => {
    const doFetch = fakeFetch([
      { match: 'oauth2.googleapis.com/token', body: { refresh_token: 'r1', access_token: 'a1' } },
    ]);
    const result = await exchangeCode(
      { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://app/cb', code: 'c' },
      doFetch,
    );
    expect(result).toEqual({ refreshToken: 'r1', accessToken: 'a1' });
    expect(doFetch.calls[0]?.body).toContain('grant_type=authorization_code');
  });

  /**
   * O Google só manda refresh token na primeira autorização de uma conta. Sem
   * mensagem própria, o operador veria "resposta sem token" e não saberia que a
   * saída é revogar o acesso e autorizar de novo.
   */
  it('explica a ausência de refresh token em vez de só falhar', async () => {
    const doFetch = fakeFetch([
      { match: 'token', body: { access_token: 'a1' } },
    ]);
    await expect(
      exchangeCode(
        { clientId: 'c', clientSecret: 's', redirectUri: 'https://app/cb', code: 'c' },
        doFetch,
      ),
    ).rejects.toThrow(/myaccount\.google\.com\/permissions/);
  });

  it('não deixa o corpo da resposta vazar para a mensagem de erro', async () => {
    const doFetch = fakeFetch([
      {
        match: 'token',
        status: 400,
        body: { error: 'invalid_grant', error_description: 'Code expirado', access_token: 'SEGREDO' },
      },
    ]);
    const error = await exchangeCode(
      { clientId: 'c', clientSecret: 's', redirectUri: 'https://app/cb', code: 'c' },
      doFetch,
    ).catch((caught: unknown) => caught as GmailError);

    expect((error as GmailError).message).toContain('Code expirado');
    expect((error as GmailError).message).not.toContain('SEGREDO');
    expect((error as GmailError).status).toBe(400);
  });
});

describe('refreshAccessToken', () => {
  it('troca o refresh pelo access token', async () => {
    const doFetch = fakeFetch([{ match: 'token', body: { access_token: 'a2' } }]);
    const token = await refreshAccessToken(
      { clientId: 'c', clientSecret: 's', refreshToken: 'r1' },
      doFetch,
    );
    expect(token).toBe('a2');
    expect(doFetch.calls[0]?.body).toContain('grant_type=refresh_token');
  });

  it('sem refresh token, diz que não está conectado', async () => {
    await expect(
      refreshAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: null }),
    ).rejects.toThrow(/não conectado/);
  });
});

describe('listMessages', () => {
  const listBody = { messages: [{ id: 'm1', threadId: 't1' }] };
  const detailBody = {
    id: 'm1',
    threadId: 't1',
    internalDate: '1788390000000',
    snippet: 'Prezado, informamos a abertura de um MED',
    payload: {
      headers: [
        { name: 'From', value: 'med@banco.com.br' },
        { name: 'Subject', value: 'Abertura de MED' },
      ],
    },
  };

  it('leva a busca do operador e devolve o cabeçalho de cada mensagem', async () => {
    const doFetch = fakeFetch([
      { match: '/messages?', body: listBody },
      { match: '/messages/m1', body: detailBody },
    ]);
    const rows = await listMessages(
      { accessToken: 'a', query: 'from:med@banco.com.br', limit: 5 },
      doFetch,
    );

    expect(doFetch.calls[0]?.url).toContain('q=from%3Amed%40banco.com.br');
    expect(doFetch.calls[0]?.url).toContain('maxResults=5');
    expect(rows).toEqual([
      {
        id: 'm1',
        threadId: 't1',
        receivedAt: new Date(1788390000000).toISOString(),
        from: 'med@banco.com.br',
        subject: 'Abertura de MED',
        snippet: 'Prezado, informamos a abertura de um MED',
      },
    ]);
  });

  it('cabeçalho ausente vira nulo, nunca texto inventado', async () => {
    const doFetch = fakeFetch([
      { match: '/messages?', body: listBody },
      { match: '/messages/m1', body: { id: 'm1', threadId: 't1', payload: { headers: [] } } },
    ]);
    const [row] = await listMessages({ accessToken: 'a', query: 'x' }, doFetch);
    expect(row?.from).toBeNull();
    expect(row?.subject).toBeNull();
    expect(row?.snippet).toBeNull();
  });

  it('uma mensagem que o Gmail recusa não derruba a listagem inteira', async () => {
    const doFetch = fakeFetch([
      { match: '/messages?', body: { messages: [{ id: 'm1', threadId: 't1' }, { id: 'm2', threadId: 't2' }] } },
      { match: '/messages/m1', status: 404, body: {} },
      { match: '/messages/m2', body: { ...detailBody, id: 'm2', threadId: 't2' } },
    ]);
    const rows = await listMessages({ accessToken: 'a', query: 'x' }, doFetch);
    expect(rows.map((row) => row.id)).toEqual(['m2']);
  });
});

describe('fetchRawMessage', () => {
  it('devolve a mensagem como ela chegou, decodificada', async () => {
    const original = 'From: med@banco.com.br\r\nSubject: Abertura\r\n\r\nCorpo com acento: ação';
    const doFetch = fakeFetch([
      { match: '/messages/m1', body: { raw: Buffer.from(original, 'utf8').toString('base64url') } },
    ]);
    expect(await fetchRawMessage({ accessToken: 'a', messageId: 'm1' }, doFetch)).toBe(original);
  });

  it('pede o formato cru, e não um resumo', async () => {
    const doFetch = fakeFetch([{ match: '/messages/m1', body: { raw: 'YQ' } }]);
    await fetchRawMessage({ accessToken: 'a', messageId: 'm1' }, doFetch);
    expect(doFetch.calls[0]?.url).toContain('format=raw');
  });
});
