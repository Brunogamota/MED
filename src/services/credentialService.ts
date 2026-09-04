/**
 * Credencial de conector, guardada por organizacao.
 *
 * Esta e a unica camada que ve o valor claro. Ela cifra na entrada e decifra
 * na saida; o repositorio so conhece o envelope. Assim nenhum adapter — nem um
 * futuro, nem um de teste — consegue gravar o segredo em texto puro por
 * descuido, porque o valor claro nunca chega ate ele.
 *
 * A chave vive em `ENCRYPTION_KEY`, no ambiente. Um dump do banco sozinho nao
 * abre a caixa de e-mail de ninguem.
 */

import { getRepository } from '@/infra/container';
import { readEncryptionKey, open, seal } from '@/lib/secretBox';
import type { AuthContext } from '@/infra/auth/context';
import { assertCan } from '@/infra/auth/rbac';

export type ConnectorProvider = 'GMAIL';

export interface ConnectorCredential {
  secret: string;
  accountLabel: string | null;
  connectedAt: string;
}

/** Estado de conexao para a tela, sem tocar no segredo. */
export interface ConnectorStatus {
  connected: boolean;
  accountLabel: string | null;
  connectedAt: string | null;
}

function key() {
  return readEncryptionKey(process.env.ENCRYPTION_KEY);
}

/** Guarda (ou substitui) a credencial da organizacao. */
export async function saveConnectorCredential(
  auth: AuthContext,
  provider: ConnectorProvider,
  input: { secret: string; accountLabel?: string | null },
): Promise<ConnectorStatus> {
  assertCan(auth.role, 'integration:write');
  const repository = await getRepository();
  const saved = await repository.saveCredential({
    organizationId: auth.organizationId,
    provider,
    secret: seal(input.secret, key()),
    accountLabel: input.accountLabel ?? null,
    connectedAt: new Date().toISOString(),
  });
  return {
    connected: true,
    accountLabel: saved.accountLabel,
    connectedAt: saved.connectedAt,
  };
}

/**
 * O segredo em claro, para quem precisa chamar o provedor.
 *
 * Devolve `null` quando nao ha credencial. Quando ha mas nao abre — chave
 * trocada, conteudo adulterado — a excecao sobe: entregar meio segredo seria
 * pior do que nenhum.
 */
export async function readConnectorCredential(
  organizationId: string,
  provider: ConnectorProvider,
): Promise<ConnectorCredential | null> {
  const repository = await getRepository();
  const row = await repository.getCredential(organizationId, provider);
  if (!row) return null;
  return {
    secret: open(row.secret, key()),
    accountLabel: row.accountLabel,
    connectedAt: row.connectedAt,
  };
}

/**
 * Existe credencial? Sem abrir o envelope.
 *
 * A tela so precisa saber se esta conectado e com qual conta; decifrar para
 * desenhar um selo verde seria expor o segredo a toa.
 */
export async function connectorStatus(
  organizationId: string,
  provider: ConnectorProvider,
): Promise<ConnectorStatus> {
  const repository = await getRepository();
  const row = await repository.getCredential(organizationId, provider);
  if (!row) return { connected: false, accountLabel: null, connectedAt: null };
  return { connected: true, accountLabel: row.accountLabel, connectedAt: row.connectedAt };
}

/** Desliga o conector. O provedor continua com a autorizacao ate ser revogada la. */
export async function deleteConnectorCredential(
  auth: AuthContext,
  provider: ConnectorProvider,
): Promise<boolean> {
  assertCan(auth.role, 'integration:write');
  const repository = await getRepository();
  return repository.deleteCredential(auth.organizationId, provider);
}
