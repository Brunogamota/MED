import { describe, expect, it } from 'vitest';
import { queueBand, sortByUrgency } from '@/lib/urgency';
import type { MedListRow } from '@/infra/repositories/types';
import { makeCompleteCase } from '@/test/fixtures';

const NOW = new Date('2026-08-20T12:00:00.000Z');

function rowWith(
  overrides: Partial<MedListRow['med']>,
  score: { total: number; max: number } | null = null,
): MedListRow {
  const base = makeCompleteCase().med;
  return {
    med: { ...base, ...overrides },
    latestDefense: score
      ? { id: 'def', version: 1, score: { ...score, components: [] }, generatedAt: NOW.toISOString() }
      : null,
    evidenceCount: 0,
  };
}

describe('queueBand', () => {
  it('mapeia horas para as faixas do briefing', () => {
    expect(queueBand(null)).toBe('later');
    expect(queueBand(-1)).toBe('expired');
    expect(queueBand(6)).toBe('today');
    expect(queueBand(36)).toBe('soon');
    expect(queueBand(100)).toBe('week');
    expect(queueBand(24 * 10)).toBe('later');
  });
});

describe('sortByUrgency', () => {
  it('prazo curto vence valor alto: 6h/score 71 vem antes de 3 dias/valor alto', () => {
    const inSixHours = rowWith(
      {
        id: 'a',
        responseDeadlineAt: new Date(NOW.getTime() + 6 * 3600_000).toISOString(),
        amount: 100,
      },
      { total: 71, max: 100 },
    );
    const inThreeDays = rowWith(
      {
        id: 'b',
        responseDeadlineAt: new Date(NOW.getTime() + 72 * 3600_000).toISOString(),
        amount: 50_000,
      },
      { total: 90, max: 100 },
    );
    const sorted = sortByUrgency([inThreeDays, inSixHours], NOW);
    expect(sorted.map((row) => row.med.id)).toEqual(['a', 'b']);
  });

  it('na mesma janela, o valor maior desempata', () => {
    const deadline = new Date(NOW.getTime() + 10 * 3600_000).toISOString();
    const cheap = rowWith({ id: 'cheap', responseDeadlineAt: deadline, amount: 50 }, { total: 70, max: 100 });
    const expensive = rowWith(
      { id: 'expensive', responseDeadlineAt: deadline, amount: 5_000 },
      { total: 70, max: 100 },
    );
    const sorted = sortByUrgency([cheap, expensive], NOW);
    expect(sorted[0]?.med.id).toBe('expensive');
  });

  it('sem prazo vai para o fim, vencidos por último', () => {
    const noDeadline = rowWith({ id: 'none', responseDeadlineAt: null });
    const expired = rowWith({
      id: 'expired',
      responseDeadlineAt: new Date(NOW.getTime() - 3600_000).toISOString(),
    });
    const urgent = rowWith({
      id: 'urgent',
      responseDeadlineAt: new Date(NOW.getTime() + 3600_000).toISOString(),
    });
    const sorted = sortByUrgency([noDeadline, expired, urgent], NOW);
    expect(sorted.map((row) => row.med.id)).toEqual(['urgent', 'none', 'expired']);
  });
});
