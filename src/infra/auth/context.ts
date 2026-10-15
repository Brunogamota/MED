import type { Role } from '@/domain/types';
import { DEMO_ORGANIZATION_ID, getConfig } from '@/lib/env';

/**
 * Request authentication.
 *
 * Production (DATABASE_URL set) requires an API key: with no key configured the
 * app fails closed rather than falling back to an open demo tenant.
 * Demo mode (no DATABASE_URL) grants a fixed demo organization só a preview
 * deployment is explorable before any credential exists.
 */

export interface AuthContext {
  organizationId: string;
  role: Role;
  actor: string;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Credencial ausente ou inválida') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

function extractKey(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim() || null;
  }
  return headers.get('x-api-key')?.trim() || null;
}

/** Constant-time-ish comparison to avoid leaking key material through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function authenticate(headers: Headers): AuthContext {
  const config = getConfig();
  const presented = extractKey(headers);

  if (presented) {
    const grant = config.apiKeys.find((candidate) => safeEqual(candidate.key, presented));
    if (!grant) throw new UnauthorizedError();
    return {
      organizationId: grant.organizationId,
      role: grant.role,
      actor: `apikey:${grant.organizationId}`,
    };
  }

  if (config.demoMode) {
    return { organizationId: DEMO_ORGANIZATION_ID, role: 'OWNER', actor: 'demo' };
  }

  throw new UnauthorizedError();
}

/**
 * Contexto das telas do console.
 *
 * Quem protege estas telas e o login (`src/lib/session.ts`), nao a existencia
 * de uma chave de API — que serve para acesso de maquina, por outro caminho.
 * Por isso aqui nao ha falha: a organizacao e a da conta escolhida no console
 * (`services/accountService.ts`); sem escolha, a padrao — `ORGANIZATION_ID`, a
 * primeira chave configurada, ou a demo.
 *
 * Antes disto, ligar um banco sem tambem definir `API_KEYS` derrubava todas as
 * telas do console com "Nenhuma API key configurada" — o modo demo era o unico
 * caminho que funcionava sem chave, e conectar o banco tirava exatamente esse
 * caminho.
 */
export async function serverPageContext(): Promise<AuthContext> {
  const config = getConfig();
  // A conta escolhida no console define a organização. Import tardio: o
  // serviço de contas lê cookie, e este módulo também é usado fora de request.
  const { getActiveAccount } = await import('@/services/accountService');
  const account = await getActiveAccount();
  return {
    organizationId: account.id,
    role: config.apiKeys[0]?.role ?? 'OWNER',
    actor: config.demoMode ? 'demo' : 'ui',
  };
}
