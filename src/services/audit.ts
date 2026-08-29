import type { AuditAction, AuditLogEntry, EvidenceSource, JsonValue } from '@/domain/types';
import type { AuthContext } from '@/infra/auth/context';
import type { Repository } from '@/infra/container';
import { newId } from '@/lib/ids';

/**
 * Audit trail.
 *
 * Every write records who did it, when, through which integration, and both the
 * previous and the new value. Critical data is never silently overwritten: the
 * history lives here even when the row itself is updated in place.
 */
export interface RecordAuditInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  medId?: string | null;
  source?: EvidenceSource;
  previousValue?: JsonValue | null;
  newValue?: JsonValue | null;
}

export async function recordAudit(
  repository: Repository,
  auth: AuthContext,
  input: RecordAuditInput,
): Promise<AuditLogEntry> {
  return repository.appendAudit({
    id: newId('aud'),
    organizationId: auth.organizationId,
    medId: input.medId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actor: auth.actor,
    actorRole: auth.role,
    source: input.source ?? 'MANUAL',
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    occurredAt: new Date().toISOString(),
  });
}
