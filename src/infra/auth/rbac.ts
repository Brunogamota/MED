import type { Role } from '@/domain/types';

/**
 * Role-based access control.
 *
 * Permissions are checked in the backend on every request. A tenant is never
 * inferred from a header, a query parameter or anything else the client can
 * choose — it comes from the authenticated credential alone.
 */

export const PERMISSIONS = [
  'med:read',
  'med:write',
  'evidence:write',
  'defense:generate',
  'submission:create',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [...PERMISSIONS],
  ANALYST: ['med:read', 'med:write', 'evidence:write', 'defense:generate', 'audit:read'],
  VIEWER: ['med:read', 'audit:read'],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Permissao insuficiente para "${permission}"`);
    this.name = 'ForbiddenError';
  }
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}
