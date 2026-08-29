import type { Defense, EvidencePack } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { buildTimeline } from '@/domain/timeline/engine';

/**
 * Evidence Pack.
 *
 * The complete, provider-independent record of a case: what happened, what
 * supports it, and the defense generated from it. Everything downstream — PDF,
 * JSON export, a partner-specific payload — is a projection of this object, so
 * the pack itself never contains anything provider-specific.
 */

export const EVIDENCE_PACK_VERSION = '1.0.0';

export function buildEvidencePack(medCase: MedCase, defense: Defense): EvidencePack {
  const evidences = mergeEvidence(medCase.evidences, deriveEvidence(medCase));
  const enriched: MedCase = { ...medCase, evidences };

  return {
    packVersion: EVIDENCE_PACK_VERSION,
    generatedAt: new Date().toISOString(),
    med: medCase.med,
    transaction: medCase.transaction,
    order: medCase.order,
    customer: medCase.customer,
    tracking: medCase.tracking,
    evidences,
    documents: medCase.documents,
    timeline: buildTimeline(enriched),
    defense,
  };
}
