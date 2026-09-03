/**
 * Leitura da caixa conectada.
 *
 * Devolve resultado, nao excecao: a tela precisa dizer *por que* nao ha lista
 * — falta app, falta autorizacao, o Google recusou — e um throw generico vira
 * "algo deu errado", que nao ajuda ninguem a consertar.
 *
 * Nada aqui interpreta o conteudo. Enquanto nao existir um MED real para ler,
 * transformar assunto em campo seria inventar fato, e o principio do projeto
 * proibe: sem evidencia, sem afirmacao.
 */

import { getConfig } from '@/lib/env';
import {
  GmailError,
  type GmailMessageHeader,
  fetchRawMessage,
  listMessages,
  refreshAccessToken,
} from '@/infra/adapters/gmail';

/**
 * Busca padrao quando `GMAIL_QUERY` nao esta no ambiente.
 *
 * Limitada no tempo de proposito: uma caixa inteira num `format=metadata` por
 * mensagem custa uma chamada por item, e a primeira coisa que o operador quer
 * ver e o que chegou agora.
 */
export const DEFAULT_GMAIL_QUERY = 'newer_than:30d';

export type InboxResult =
  | { ok: true; messages: GmailMessageHeader[]; query: string }
  | { ok: false; reason: string; query: string };

function currentQuery(override?: string | null): string {
  const config = getConfig();
  return override?.trim() || config.gmail.query || DEFAULT_GMAIL_QUERY;
}

/** Access token de curta duracao, ou o motivo de nao haver um. */
async function accessToken(): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const { gmail } = getConfig();
  if (!gmail.configured) {
    return { ok: false, reason: 'Falta GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no ambiente.' };
  }
  if (!gmail.refreshToken) {
    return { ok: false, reason: 'Caixa ainda não autorizada. Conecte o Gmail em Integrações.' };
  }
  try {
    const token = await refreshAccessToken({
      clientId: gmail.clientId as string,
      clientSecret: gmail.clientSecret as string,
      refreshToken: gmail.refreshToken,
    });
    return { ok: true, token };
  } catch (error) {
    // A mensagem do adaptador ja e livre de segredo — ver gmail.ts.
    const reason = error instanceof GmailError ? error.message : 'Falha ao renovar o acesso.';
    return { ok: false, reason };
  }
}

/** Cabecalhos das mensagens que casam com a busca. */
export async function readInbox(
  override?: string | null,
  limit = 25,
): Promise<InboxResult> {
  const query = currentQuery(override);
  const token = await accessToken();
  if (!token.ok) return { ok: false, reason: token.reason, query };
  try {
    const messages = await listMessages({ accessToken: token.token, query, limit });
    return { ok: true, messages, query };
  } catch (error) {
    const reason = error instanceof GmailError ? error.message : 'Falha ao ler a caixa.';
    return { ok: false, reason, query };
  }
}

export type RawMessageResult =
  | { ok: true; raw: string }
  | { ok: false; reason: string; status: number };

/**
 * A mensagem inteira, como chegou.
 *
 * E o insumo do parser: e contra este texto — RFC 822 de verdade, com
 * cabecalhos e corpo — que as regras de extracao serao escritas e testadas.
 */
export async function readRawMessage(messageId: string): Promise<RawMessageResult> {
  const token = await accessToken();
  if (!token.ok) return { ok: false, reason: token.reason, status: 409 };
  try {
    const raw = await fetchRawMessage({ accessToken: token.token, messageId });
    return { ok: true, raw };
  } catch (error) {
    if (error instanceof GmailError) {
      return { ok: false, reason: error.message, status: error.status ?? 502 };
    }
    return { ok: false, reason: 'Falha ao buscar a mensagem.', status: 502 };
  }
}
