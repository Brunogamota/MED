import type {
  Customer,
  Evidence,
  EvidenceType,
  Med,
  Order,
  StoredDocument,
  Tracking,
  Transaction,
} from '@/domain/types';

/**
 * Everything known about a single MED. This is the input to every engine —
 * the engines never reach for I/O themselves, which keeps them pure and
 * exhaustively testable.
 */
export interface MedCase {
  med: Med;
  transaction: Transaction | null;
  customer: Customer | null;
  order: Order | null;
  tracking: Tracking | null;
  evidences: Evidence[];
  documents: StoredDocument[];
}

export function evidencesOfType(evidences: Evidence[], type: EvidenceType): Evidence[] {
  return evidences.filter((evidence) => evidence.type === type);
}

/** First usable evidence of a type: conflicting values never count as usable. */
export function firstUsableEvidence(
  evidences: Evidence[],
  type: EvidenceType,
): Evidence | null {
  return (
    evidences.find(
      (evidence) => evidence.type === type && evidence.verificationStatus !== 'CONFLICTING',
    ) ?? null
  );
}

export function evidenceIdsOfTypes(evidences: Evidence[], types: EvidenceType[]): string[] {
  const wanted = new Set(types);
  return evidences.filter((evidence) => wanted.has(evidence.type)).map((evidence) => evidence.id);
}

/** String value of an evidence record, or null when it is not a plain string. */
export function evidenceStringValue(evidence: Evidence | null): string | null {
  if (!evidence) return null;
  if (typeof evidence.value === 'string') return evidence.value;
  if (typeof evidence.value === 'number') return String(evidence.value);
  return evidence.displayValue ?? null;
}
