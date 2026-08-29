import type {
  Defense,
  DefenseNarrative,
  Evidence,
  ProductType,
  TimelineEvent,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { assessEvidence, type EvidenceAssessment } from '@/domain/evidence/engine';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { buildClaims } from '@/domain/defense/claims';
import { detectRisks } from '@/domain/defense/risks';
import { buildSummary, renderNarrative } from '@/domain/defense/narrative';
import { buildTimeline } from '@/domain/timeline/engine';

/**
 * Defense Engine.
 *
 * Pure function: MedCase -> Defense. Deterministic given the same inputs and
 * the same `now`, which is what makes the output reviewable and the versions
 * comparable. It performs no I/O and calls no model.
 */

export interface GenerateDefenseInput {
  medCase: MedCase;
  /** Monotonic version number for this MED, assigned by the caller. */
  version: number;
  defenseId: string;
  now?: Date;
  generatedBy?: string | null;
  /**
   * Optional replacement narrative (e.g. an LLM rewrite that already passed the
   * fact guard). The claims, evidence and score are never affected by it.
   */
  narrative?: DefenseNarrative;
}

export interface GenerateDefenseResult {
  defense: Defense;
  assessment: EvidenceAssessment;
  timeline: TimelineEvent[];
  /** Stored evidence plus the projections derived from structured records. */
  effectiveEvidences: Evidence[];
}

export function resolveProductType(medCase: MedCase): ProductType {
  return medCase.med.productType ?? medCase.order?.productType ?? 'OTHER';
}

export function generateDefense(input: GenerateDefenseInput): GenerateDefenseResult {
  const now = input.now ?? new Date();
  const productType = resolveProductType(input.medCase);

  const effectiveEvidences = mergeEvidence(
    input.medCase.evidences,
    deriveEvidence(input.medCase, now),
  );
  const medCase: MedCase = { ...input.medCase, evidences: effectiveEvidences };

  const assessment = assessEvidence({
    productType,
    reason: medCase.med.reason,
    evidences: effectiveEvidences,
  });

  const claims = buildClaims({
    medCase,
    availableTypes: assessment.availableTypes,
    productType,
  });

  const timeline = buildTimeline(medCase);
  const riskFlags = detectRisks({ medCase, assessment, now });

  const usedEvidenceIds = [...new Set(claims.flatMap((claim) => claim.evidenceIds))];

  const narrative =
    input.narrative ??
    renderNarrative({ med: medCase.med, claims, documents: medCase.documents });

  const defense: Defense = {
    id: input.defenseId,
    organizationId: medCase.med.organizationId,
    medId: medCase.med.id,
    version: input.version,
    summary: buildSummary(medCase.med, claims),
    claims,
    evidenceIds: usedEvidenceIds,
    missingEvidences: assessment.missingEvidences,
    riskFlags,
    score: assessment.score,
    narrative,
    generatedAt: now.toISOString(),
    generatedBy: input.generatedBy ?? null,
  };

  return { defense, assessment, timeline, effectiveEvidences };
}
