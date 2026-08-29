import type {
  DefenseScore,
  DefenseScoreComponent,
  Evidence,
  EvidenceCategory,
  EvidenceStrength,
  EvidenceType,
  MedReason,
  MissingEvidence,
  Necessity,
  ProductType,
  RequirementStatus,
} from '@/domain/types';
import { EVIDENCE_CATEGORIES } from '@/domain/types';
import { getEvidenceDefinition } from '@/domain/evidence/catalog';
import {
  normalizeWeights,
  resolveCategoryWeights,
  resolveRequirements,
  type CategoryWeights,
} from '@/domain/evidence/requirements';
import { strongestOf } from '@/domain/evidence/strength';

/**
 * Evidence Engine.
 *
 * Takes the evidence a case actually has and answers three questions, with no
 * inference and no model in the loop:
 *   - what do we have?
 *   - what is missing?
 *   - how complete is the documentation, per our own rules?
 *
 * The score is a completeness/strength measure defined by this file. It is
 * explicitly NOT a probability of winning the MED.
 */

export interface EvidenceAssessmentItem {
  type: EvidenceType;
  category: EvidenceCategory;
  label: string;
  rationale: string;
  necessity: Necessity;
  status: RequirementStatus;
  evidenceIds: string[];
  strength: EvidenceStrength | null;
}

export interface EvidenceAssessment {
  productType: ProductType;
  reason: MedReason;
  weights: CategoryWeights;
  items: EvidenceAssessmentItem[];
  availableTypes: EvidenceType[];
  missingEvidences: MissingEvidence[];
  score: DefenseScore;
  /** Evidence records that are not part of any requirement for this case. */
  supplementaryEvidenceIds: string[];
}

const NECESSITY_WEIGHT: Record<Necessity, number> = {
  REQUIRED: 3,
  RECOMMENDED: 2,
  OPTIONAL: 1,
};

/**
 * How much of a requirement's points a piece of evidence earns. Weak evidence
 * counts, but it does not count the same as verified third-party evidence.
 */
const STRENGTH_FACTOR: Record<EvidenceStrength, number> = {
  STRONG: 1,
  MEDIUM: 0.75,
  WEAK: 0.45,
};

/** Evidence that exists but has not been confirmed yet still earns a little. */
const PENDING_FACTOR = 0.2;

export function groupEvidenceByType(evidences: Evidence[]): Map<EvidenceType, Evidence[]> {
  const grouped = new Map<EvidenceType, Evidence[]>();
  for (const evidence of evidences) {
    const bucket = grouped.get(evidence.type);
    if (bucket) {
      bucket.push(evidence);
    } else {
      grouped.set(evidence.type, [evidence]);
    }
  }
  return grouped;
}

function statusFor(evidences: Evidence[]): RequirementStatus {
  if (evidences.length === 0) return 'MISSING';
  if (evidences.some((evidence) => evidence.verificationStatus === 'CONFLICTING')) {
    return 'CONFLICTING';
  }
  if (evidences.every((evidence) => evidence.verificationStatus === 'PENDING')) {
    return 'PENDING';
  }
  return 'AVAILABLE';
}

function factorFor(status: RequirementStatus, strength: EvidenceStrength | null): number {
  switch (status) {
    case 'AVAILABLE':
      return strength ? STRENGTH_FACTOR[strength] : 0;
    case 'PENDING':
      return PENDING_FACTOR;
    case 'CONFLICTING':
    case 'MISSING':
      return 0;
  }
}

function computeScore(
  items: EvidenceAssessmentItem[],
  weights: CategoryWeights,
): DefenseScore {
  // Categories with no requirements for this case cannot be scored, so their
  // weight is redistributed instead of silently capping the score below 100.
  const active = EVIDENCE_CATEGORIES.filter((category) =>
    items.some((item) => item.category === category),
  );
  if (active.length === 0) {
    return { total: 0, max: 100, components: [] };
  }

  const activeWeights = normalizeWeights(
    EVIDENCE_CATEGORIES.reduce((accumulator, category) => {
      accumulator[category] = active.includes(category) ? weights[category] : 0;
      return accumulator;
    }, {} as CategoryWeights),
  );

  const components: DefenseScoreComponent[] = [];
  for (const category of EVIDENCE_CATEGORIES) {
    const max = activeWeights[category];
    if (max === 0) continue;
    const categoryItems = items.filter((item) => item.category === category);
    const possible = categoryItems.reduce(
      (sum, item) => sum + NECESSITY_WEIGHT[item.necessity],
      0,
    );
    const achieved = categoryItems.reduce(
      (sum, item) =>
        sum + NECESSITY_WEIGHT[item.necessity] * factorFor(item.status, item.strength),
      0,
    );
    const earned = possible === 0 ? 0 : Math.round((achieved / possible) * max);
    components.push({ category, earned, max });
  }

  const total = components.reduce((sum, component) => sum + component.earned, 0);
  const max = components.reduce((sum, component) => sum + component.max, 0);
  return { total, max, components };
}

export interface AssessEvidenceInput {
  productType: ProductType;
  reason: MedReason;
  evidences: Evidence[];
}

export function assessEvidence(input: AssessEvidenceInput): EvidenceAssessment {
  const { productType, reason, evidences } = input;
  const requirements = resolveRequirements(productType, reason);
  const weights = resolveCategoryWeights(productType, reason);
  const grouped = groupEvidenceByType(evidences);

  const items: EvidenceAssessmentItem[] = requirements.map((requirement) => {
    const matches = grouped.get(requirement.type) ?? [];
    const status = statusFor(matches);
    const definition = getEvidenceDefinition(requirement.type);
    return {
      type: requirement.type,
      category: definition.category,
      label: definition.label,
      rationale: definition.rationale,
      necessity: requirement.necessity,
      status,
      evidenceIds: matches.map((evidence) => evidence.id),
      strength: status === 'AVAILABLE' ? strongestOf(matches) : null,
    };
  });

  // Stable ordering: category, then necessity, then type — so the UI, the PDF
  // and the JSON pack always list evidence in the same order.
  items.sort((a, b) => {
    const byCategory =
      EVIDENCE_CATEGORIES.indexOf(a.category) - EVIDENCE_CATEGORIES.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    const byNecessity = NECESSITY_WEIGHT[b.necessity] - NECESSITY_WEIGHT[a.necessity];
    if (byNecessity !== 0) return byNecessity;
    return a.type.localeCompare(b.type);
  });

  const missingEvidences: MissingEvidence[] = items
    .filter((item) => item.status !== 'AVAILABLE')
    .filter((item) => item.necessity !== 'OPTIONAL')
    .map((item) => ({
      type: item.type,
      category: item.category,
      necessity: item.necessity,
      status: item.status as Exclude<RequirementStatus, 'AVAILABLE'>,
      label: item.label,
      rationale: item.rationale,
    }));

  const requiredTypes = new Set(requirements.map((requirement) => requirement.type));
  const supplementaryEvidenceIds = evidences
    .filter((evidence) => !requiredTypes.has(evidence.type))
    .map((evidence) => evidence.id);

  return {
    productType,
    reason,
    weights,
    items,
    availableTypes: items
      .filter((item) => item.status === 'AVAILABLE')
      .map((item) => item.type),
    missingEvidences,
    score: computeScore(items, weights),
    supplementaryEvidenceIds,
  };
}
