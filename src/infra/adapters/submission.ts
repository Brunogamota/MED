import type { EvidencePack, JsonValue } from '@/domain/types';
import { formatAddress, formatAmount } from '@/lib/format';
import { toJson } from '@/lib/json';

/**
 * Submission adapters.
 *
 * A Defense is universal; a DefenseSubmission is its translation for one
 * institution. Adding a partner means adding an adapter here — the Evidence
 * Pack never changes shape to accommodate one.
 *
 * The generic adapter below produces a complete, self-describing JSON payload.
 * It performs no network call: nothing is transmitted to any institution until
 * a real integration is configured for that partner.
 */

export interface SubmissionProviderAdapter {
  readonly provider: string;
  buildPayload(pack: EvidencePack): JsonValue;
}

export const genericJsonAdapter: SubmissionProviderAdapter = {
  provider: 'generic-json',
  buildPayload(pack) {
    return toJson({
      schema: 'med-defense.evidence-pack.v1',
      packVersion: pack.packVersion,
      med: {
        medId: pack.med.medId,
        endToEndId: pack.med.endToEndId,
        amount: formatAmount(pack.med.amount, pack.med.currency),
        reason: pack.med.reason,
        openedAt: pack.med.openedAt,
        responseDeadlineAt: pack.med.responseDeadlineAt,
        requestingInstitution: pack.med.requestingInstitution,
      },
      defense: {
        id: pack.defense.id,
        version: pack.defense.version,
        summary: pack.defense.summary,
        narrative: pack.defense.narrative.body,
        claims: pack.defense.claims.map((claim) => ({
          statement: claim.statement,
          evidenceIds: claim.evidenceIds,
          strength: claim.strength,
        })),
        score: pack.defense.score,
        missingEvidences: pack.defense.missingEvidences.map((missing) => missing.type),
      },
      evidences: pack.evidences.map((evidence) => ({
        id: evidence.id,
        type: evidence.type,
        value: evidence.displayValue ?? evidence.value,
        source: evidence.source,
        sourceProvider: evidence.sourceProvider,
        sourceReference: evidence.sourceReference,
        verificationStatus: evidence.verificationStatus,
        receivedAt: evidence.receivedAt,
      })),
      timeline: pack.timeline.map((event) => ({
        occurredAt: event.occurredAt,
        type: event.type,
        description: event.description,
        source: event.source,
        sourceReference: event.sourceReference,
      })),
      documents: pack.documents.map((document) => ({
        id: document.id,
        kind: document.kind,
        filename: document.filename,
        contentType: document.contentType,
        byteSize: document.byteSize,
      })),
      shipping: pack.order?.shippingAddress
        ? { address: formatAddress(pack.order.shippingAddress) }
        : null,
    });
  },
};

const ADAPTERS = new Map<string, SubmissionProviderAdapter>([
  [genericJsonAdapter.provider, genericJsonAdapter],
]);

export function getSubmissionAdapter(provider: string): SubmissionProviderAdapter {
  return ADAPTERS.get(provider) ?? genericJsonAdapter;
}

export function listSubmissionProviders(): string[] {
  return [...ADAPTERS.keys()];
}
