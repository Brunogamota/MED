import type { AppConfig } from '@/lib/env';
import { PERMISSIONS, can, type Permission } from '@/infra/auth/rbac';
import type { Role } from '@/domain/types';

/**
 * Quem tem acesso a esta organizacao.
 *
 * Nao existe cadastro de pessoas neste produto: o que autentica e uma chave de
 * API (cada uma com seu papel) ou a senha unica do console. Entao a tela de
 * equipe lista credenciais, e nao nomes — inventar pessoa, foto e data de
 * entrada seria descrever um acesso que ninguem tem.
 *
 * A chave nunca sai daqui inteira. O que vai para a tela sao os quatro ultimos
 * caracteres, o suficiente para o operador dizer qual credencial e qual.
 *
 * A organizacao ativa vem de quem chama — a mesma que o resto do console usa.
 * Deduzir aqui, da primeira chave, faria a tela dizer que o acesso e de uma
 * organizacao enquanto as outras telas leem outra.
 */

export type AccessKind = 'CONSOLE' | 'API_KEY';

export interface AccessEntry {
  id: string;
  kind: AccessKind;
  /** Como a credencial aparece no log de auditoria. */
  actor: string;
  organizationId: string;
  role: Role;
  /** Ultimos caracteres da chave; o login do console nao tem referencia. */
  reference: string | null;
  active: boolean;
  /** Por que esta desligada, quando esta. */
  inactiveReason: string | null;
  permissions: Permission[];
  /** A credencial abre outra organizacao, e nao a que o console esta lendo. */
  foreignOrganization: boolean;
}

/** Ultimos quatro caracteres, precedidos de reticencias. Nunca a chave. */
export function maskApiKey(key: string): string {
  const tail = key.slice(-4);
  return tail.length === 0 ? '••••' : `••••${tail}`;
}

function permissionsOf(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => can(role, permission));
}

/**
 * O acesso configurado, na ordem em que importa: o console primeiro, porque e
 * por ele que se entra na tela onde a lista aparece.
 */
export function buildAccessList(config: AppConfig, organizationId: string): AccessEntry[] {
  const consoleEntry: AccessEntry = {
    id: 'console',
    kind: 'CONSOLE',
    actor: 'ui',
    organizationId,
    role: 'OWNER',
    reference: null,
    active: config.auth.enabled,
    inactiveReason: config.auth.enabled
      ? null
      : 'Falta ADMIN_PASSWORD_HASH ou SESSION_SECRET. Fora de produção o console abre sem pedir senha; em produção ele não abre.',
    permissions: permissionsOf('OWNER'),
    foreignOrganization: false,
  };

  const keyEntries: AccessEntry[] = config.apiKeys.map((grant, index) => ({
    id: `apikey-${index}`,
    kind: 'API_KEY',
    actor: `apikey:${grant.organizationId}`,
    organizationId: grant.organizationId,
    role: grant.role,
    reference: maskApiKey(grant.key),
    active: true,
    inactiveReason: null,
    permissions: permissionsOf(grant.role),
    foreignOrganization: grant.organizationId !== organizationId,
  }));

  return [consoleEntry, ...keyEntries];
}
