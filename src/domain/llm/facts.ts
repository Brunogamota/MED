/**
 * Fact extraction used by the LLM output guard.
 *
 * The guard works on the principle that every concrete, checkable token in a
 * generated text (a date, a value, a tracking code, a document number, an IP,
 * an e-mail) must already appear in the Defense JSON. Prose may be rewritten
 * freely; facts may not be added.
 *
 * This is a containment check, not a semantic one — it cannot catch a purely
 * qualitative invention such as "o cliente confirmou por telefone". That is why
 * the LLM is only ever given an already-complete Defense JSON to rewrite, and
 * why the deterministic renderer remains the default.
 */

export type FactKind =
  | 'DATE'
  | 'TIME'
  | 'MONEY'
  | 'DOCUMENT'
  | 'EMAIL'
  | 'IP'
  | 'CODE'
  | 'NUMBER';

export interface ExtractedFact {
  kind: FactKind;
  /** Value exactly as it appeared in the text. */
  raw: string;
  /** Comparison key, normalised per kind. */
  key: string;
}

const PATTERNS: { kind: FactKind; regex: RegExp }[] = [
  { kind: 'EMAIL', regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: 'IP', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { kind: 'DOCUMENT', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g },
  { kind: 'DATE', regex: /\b\d{2}\/\d{2}\/\d{4}\b/g },
  { kind: 'TIME', regex: /\b\d{2}:\d{2}\b/g },
  { kind: 'MONEY', regex: /R\$\s?\d[\d.]*,\d{2}/g },
  // Identifiers: mixed-case-insensitive alphanumeric runs of 8+ chars that
  // contain at least one digit (tracking codes, end-to-end ids, order refs).
  { kind: 'CODE', regex: /\b(?=[A-Za-z0-9._-]*\d)[A-Za-z0-9][A-Za-z0-9._-]{7,}\b/g },
  { kind: 'NUMBER', regex: /\b\d{4,}\b/g },
];

function normalize(kind: FactKind, raw: string): string {
  switch (kind) {
    case 'EMAIL':
      return raw.toLowerCase();
    case 'MONEY':
      return raw.replace(/[^\d,]/g, '');
    case 'CODE':
    case 'NUMBER':
      return raw.toLowerCase().replace(/[.\-_]/g, '');
    case 'DOCUMENT':
      return raw.replace(/\D/g, '');
    default:
      return raw;
  }
}

export function extractFacts(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  for (const { kind, regex } of PATTERNS) {
    // A fresh RegExp per call keeps `lastIndex` from leaking between texts.
    const matcher = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(text)) !== null) {
      const raw = match[0];
      facts.push({ kind, raw, key: normalize(kind, raw) });
    }
  }
  return facts;
}

/** Comparison keys of every fact present in a corpus of allowed text. */
export function factKeys(texts: string[]): Set<string> {
  const keys = new Set<string>();
  for (const text of texts) {
    for (const fact of extractFacts(text)) {
      keys.add(`${fact.kind}:${fact.key}`);
      // A document or code may legitimately be reformatted by the model
      // (dots and dashes added or removed), so also index the bare digits.
      const bare = fact.key.replace(/\D/g, '');
      if (bare.length >= 4) keys.add(`RAW:${bare}`);
    }
  }
  return keys;
}
