import type { Defense, Evidence, Med } from '@/domain/types';
import { extractFacts, factKeys } from '@/domain/llm/facts';
import { formatAmount, formatDate, formatDateTime } from '@/lib/format';

/**
 * Guard for LLM-generated defense text.
 *
 * Contract: the model may rewrite, reorder and improve the prose of a defense,
 * but every checkable fact in its output must already exist in the Defense JSON
 * that was handed to it. Anything else is dropped and the deterministic
 * rendering is used instead.
 */

export interface GuardViolation {
  kind: string;
  value: string;
  message: string;
}

export interface GuardResult {
  ok: boolean;
  violations: GuardViolation[];
}

export interface BuildAllowedCorpusInput {
  med: Med;
  defense: Defense;
  evidences: Evidence[];
}

/** Every text the model was allowed to draw facts from. */
export function buildAllowedCorpus(input: BuildAllowedCorpusInput): string[] {
  const { med, defense, evidences } = input;
  const texts: string[] = [
    defense.summary,
    ...defense.claims.map((claim) => claim.statement),
    med.medId,
    med.transactionId ?? '',
    med.endToEndId ?? '',
    med.pixId ?? '',
    med.payer.document ?? '',
    med.payer.email ?? '',
    med.payer.phone ?? '',
    med.payerIp ?? '',
    med.merchantName ?? '',
    med.requestingInstitution ?? '',
    formatAmount(med.amount, med.currency),
    formatDate(med.transactionAt) ?? '',
    formatDateTime(med.transactionAt) ?? '',
    formatDate(med.openedAt) ?? '',
    formatDateTime(med.openedAt) ?? '',
    formatDate(med.responseDeadlineAt) ?? '',
  ];

  for (const evidence of evidences) {
    if (evidence.displayValue) texts.push(evidence.displayValue);
    if (typeof evidence.value === 'string') {
      texts.push(evidence.value);
      const asDate = formatDate(evidence.value);
      if (asDate) texts.push(asDate);
      const asDateTime = formatDateTime(evidence.value);
      if (asDateTime) texts.push(asDateTime);
    }
    if (typeof evidence.value === 'number') texts.push(String(evidence.value));
    if (evidence.sourceReference) texts.push(evidence.sourceReference);
  }

  return texts.filter((text) => text.length > 0);
}

export function guardNarrative(candidate: string, allowedTexts: string[]): GuardResult {
  const allowed = factKeys(allowedTexts);
  const violations: GuardViolation[] = [];

  for (const fact of extractFacts(candidate)) {
    const primary = `${fact.kind}:${fact.key}`;
    if (allowed.has(primary)) continue;
    const bare = fact.key.replace(/\D/g, '');
    if (bare.length >= 4 && allowed.has(`RAW:${bare}`)) continue;
    violations.push({
      kind: fact.kind,
      value: fact.raw,
      message: `"${fact.raw}" nao consta no Defense JSON e nao pode ser afirmado.`,
    });
  }

  return { ok: violations.length === 0, violations };
}
