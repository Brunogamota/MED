import { describe, expect, it } from 'vitest';
import { generateDefense } from '@/domain/defense/engine';
import { buildAllowedCorpus, guardNarrative } from '@/domain/llm/guard';
import { makeCompleteCase } from '@/test/fixtures';

const NOW = new Date('2026-08-25T12:00:00.000Z');

function buildCorpus() {
  const medCase = makeCompleteCase();
  const { defense, effectiveEvidences } = generateDefense({
    medCase,
    version: 1,
    defenseId: 'def_1',
    now: NOW,
  });
  return {
    defense,
    corpus: buildAllowedCorpus({
      med: medCase.med,
      defense,
      evidences: effectiveEvidences,
    }),
  };
}

describe('guardNarrative', () => {
  it('accepts a rewrite that only rephrases known facts', () => {
    const { defense, corpus } = buildCorpus();
    const rewrite = defense.claims.map((claim) => claim.statement).join(' ');
    expect(guardNarrative(rewrite, corpus)).toEqual({ ok: true, violations: [] });
  });

  it('accepts prose with no checkable facts', () => {
    const { corpus } = buildCorpus();
    const result = guardNarrative(
      'A operacao foi conduzida conforme os registros do estabelecimento.',
      corpus,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects an invented tracking code', () => {
    const { corpus } = buildCorpus();
    const result = guardNarrative(
      'O pedido foi enviado sob o codigo de rastreio ZZ999888777BR.',
      corpus,
    );
    expect(result.ok).toBe(false);
    expect(result.violations.map((violation) => violation.value)).toContain('ZZ999888777BR');
  });

  it('rejects an invented delivery date', () => {
    const { corpus } = buildCorpus();
    const result = guardNarrative('A entrega foi registrada em 01/01/2020.', corpus);
    expect(result.ok).toBe(false);
    expect(result.violations[0]?.kind).toBe('DATE');
  });

  it('rejects an invented e-mail and an invented IP', () => {
    const { corpus } = buildCorpus();
    const result = guardNarrative(
      'O acesso partiu do IP 10.0.0.1 e do e-mail outro@example.com.',
      corpus,
    );
    const kinds = result.violations.map((violation) => violation.kind);
    expect(kinds).toContain('IP');
    expect(kinds).toContain('EMAIL');
  });

  it('tolerates reformatting of a known document number', () => {
    const { corpus } = buildCorpus();
    const result = guardNarrative('Documento do pagador: 123.456.789-09.', corpus);
    expect(result.ok).toBe(true);
  });
});
