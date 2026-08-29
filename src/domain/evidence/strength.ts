import type { Evidence, EvidenceSource, EvidenceStrength } from '@/domain/types';
import { getEvidenceDefinition } from '@/domain/evidence/catalog';

/**
 * Evidence strength is computed from explicit, auditable rules. It is never
 * asked of a model and never guessed: the inputs are the evidence type, where
 * the value came from, and whether it was verified.
 */

export type SourceTrust =
  | 'THIRD_PARTY_VERIFIABLE'
  | 'PROVIDER'
  | 'FIRST_PARTY'
  | 'SELF_REPORTED';

const SOURCE_TRUST: Record<EvidenceSource, SourceTrust> = {
  TRACKING_PROVIDER: 'THIRD_PARTY_VERIFIABLE',
  PAYMENT_PROVIDER: 'THIRD_PARTY_VERIFIABLE',
  ANTIFRAUD: 'THIRD_PARTY_VERIFIABLE',
  SHOPIFY: 'PROVIDER',
  ERP: 'PROVIDER',
  API: 'PROVIDER',
  WEBHOOK: 'PROVIDER',
  MERCHANT: 'FIRST_PARTY',
  SYSTEM_DERIVED: 'FIRST_PARTY',
  MANUAL: 'SELF_REPORTED',
};

export function sourceTrustOf(source: EvidenceSource): SourceTrust {
  return SOURCE_TRUST[source];
}

const LADDER: EvidenceStrength[] = ['WEAK', 'MEDIUM', 'STRONG'];

function step(strength: EvidenceStrength, delta: number): EvidenceStrength {
  const index = LADDER.indexOf(strength);
  const next = Math.min(LADDER.length - 1, Math.max(0, index + delta));
  return LADDER[next] as EvidenceStrength;
}

export interface StrengthEvaluation {
  strength: EvidenceStrength;
  /** Ordered list of rule identifiers that produced the result. */
  appliedRules: string[];
}

/**
 * Rules, applied in this order:
 *
 *  R0  conflicting evidence is always WEAK — a contradicted fact proves nothing
 *  R1  start from the evidence type's intrinsic value (catalog `baseStrength`)
 *  R2  self-reported provenance (MANUAL) drops one level
 *  R3  unverified/pending first-party or self-reported data drops one level
 *  R4  machine-sourced evidence with no source reference drops one level,
 *      because it cannot be re-checked against the origin
 *  R5  verified third-party evidence gains one level
 */
export function evaluateStrength(evidence: Evidence): StrengthEvaluation {
  const appliedRules: string[] = [];

  if (evidence.verificationStatus === 'CONFLICTING') {
    return { strength: 'WEAK', appliedRules: ['R0_CONFLICTING'] };
  }

  const definition = getEvidenceDefinition(evidence.type);
  let strength = definition.baseStrength;
  appliedRules.push(`R1_BASE_${definition.baseStrength}`);

  const trust = sourceTrustOf(evidence.source);

  if (trust === 'SELF_REPORTED') {
    strength = step(strength, -1);
    appliedRules.push('R2_SELF_REPORTED');
  }

  const unverified =
    evidence.verificationStatus === 'UNVERIFIED' || evidence.verificationStatus === 'PENDING';
  if (unverified && (trust === 'FIRST_PARTY' || trust === 'SELF_REPORTED')) {
    strength = step(strength, -1);
    appliedRules.push('R3_UNVERIFIED_FIRST_PARTY');
  }

  const machineSourced = trust !== 'SELF_REPORTED';
  if (machineSourced && !evidence.sourceReference) {
    strength = step(strength, -1);
    appliedRules.push('R4_NO_SOURCE_REFERENCE');
  }

  if (evidence.verificationStatus === 'VERIFIED' && trust === 'THIRD_PARTY_VERIFIABLE') {
    strength = step(strength, +1);
    appliedRules.push('R5_VERIFIED_THIRD_PARTY');
  }

  return { strength, appliedRules };
}

const STRENGTH_ORDER: Record<EvidenceStrength, number> = { WEAK: 0, MEDIUM: 1, STRONG: 2 };

/** Strongest of a set; `null` when the set is empty. */
export function strongestOf(evidences: Evidence[]): EvidenceStrength | null {
  let best: EvidenceStrength | null = null;
  for (const evidence of evidences) {
    const { strength } = evaluateStrength(evidence);
    if (!best || STRENGTH_ORDER[strength] > STRENGTH_ORDER[best]) {
      best = strength;
    }
  }
  return best;
}

/** Weakest of a set; used for claims, which are only as good as their weakest support. */
export function weakestOf(evidences: Evidence[]): EvidenceStrength | null {
  let worst: EvidenceStrength | null = null;
  for (const evidence of evidences) {
    const { strength } = evaluateStrength(evidence);
    if (!worst || STRENGTH_ORDER[strength] < STRENGTH_ORDER[worst]) {
      worst = strength;
    }
  }
  return worst;
}
