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
import { SecretBoxError } from '@/lib/secretBox';
import { readConnectorCredential } from '@/services/credentialService';
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

/**
 * Refresh token da organizacao. Vem do banco, cifrado, e de mais lugar nenhum.
 *
 * Houve uma reserva por variavel de ambiente aqui, e ela criava um estado que
 * a interface nao sabia desfazer: conectado, mas sem credencial para apagar,
 * logo sem como desconectar. Um caminho so — quem conecta pela tela desconecta
 * pela tela.
 */
async function organizationRefreshToken(
  organizationId: string,
): Promise<{ ok: true; token: string | null } | { ok: false; reason: string }> {
  try {
    const stored = await readConnectorCredential(organizationId, 'GMAIL');
    if (stored) return { ok: true, token: stored.secret };
  } catch (error) {
    // Chave ausente ou trocada: a tela precisa dizer isso, nao mostrar pilha.
    if (error instanceof SecretBoxError) return { ok: false, reason: error.message };
    throw error;
  }
  return { ok: true, token: null };
}

/** Access token de curta duracao, ou o motivo de nao haver um. */
async function accessToken(
  organizationId: string,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const { gmail } = getConfig();
  if (!gmail.configured) {
    return { ok: false, reason: 'Falta GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no ambiente.' };
  }
  const stored = await organizationRefreshToken(organizationId);
  if (!stored.ok) return { ok: false, reason: stored.reason };
  const refreshToken = stored.token;
  if (!refreshToken) {
    return { ok: false, reason: 'Caixa ainda não autorizada. Conecte o Gmail em Integrações.' };
  }
  try {
    const token = await refreshAccessToken({
      clientId: gmail.clientId as string,
      clientSecret: gmail.clientSecret as string,
      refreshToken,
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
  organizationId: string,
  override?: string | null,
  limit = 25,
): Promise<InboxResult> {
  const query = currentQuery(override);
  const token = await accessToken(organizationId);
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
export async function readRawMessage(
  organizationId: string,
  messageId: string,
): Promise<RawMessageResult> {
  const token = await accessToken(organizationId);
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
