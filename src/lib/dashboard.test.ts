import { describe, expect, it } from 'vitest';
import { buildDashboardMetrics, buildIntakeSeries, scorePercent } from '@/lib/dashboard';
import type { MedListRow } from '@/infra/repositories/types';
import type { Med, MedStatus } from '@/domain/types';

const NOW = new Date('2026-09-02T12:00:00.000Z');

function row(overrides: {
  status?: MedStatus;
  amount?: number;
  openedAt?: string;
  responseDeadlineAt?: string | null;
  score?: { total: number; max: number };
}): MedListRow {
  const med = {
    id: 'med_1',
    organizationId: 'org_a',
    medId: 'MED-1',
    amount: overrides.amount ?? 100,
    currency: 'BRL',
    openedAt: overrides.openedAt ?? '2026-09-01T10:00:00.000Z',
    responseDeadlineAt: overrides.responseDeadlineAt ?? null,
    status: overrides.status ?? 'RECEIVED',
    payer: {},
  } as unknown as Med;

  return {
    med,
    latestDefense: overrides.score
      ? { id: 'def_1', version: 1, score: overrides.score, generatedAt: NOW.toISOString() }
      : null,
    evidenceCount: 0,
  } as MedListRow;
}

describe('buildDashboardMetrics', () => {
  it('conta abertos e soma o valor em disputa', () => {
    const metrics = buildDashboardMetrics(
      [row({ amount: 100 }), row({ amount: 250 }), row({ status: 'SUBMITTED', amount: 900 })],
      NOW,
    );

    expect(metrics.open).toBe(2);
    expect(metrics.openAmount).toBe(350);
    expect(metrics.submitted).toBe(1);
  });

  it('sem defesa gerada, o score medio e ausente — nao zero', () => {
    expect(buildDashboardMetrics([row({})], NOW).averageScore).toBeNull();
  });

  it('marca urgencia so abaixo de 24h', () => {
    const doze = new Date(NOW.getTime() + 12 * 60 * 60 * 1000).toISOString();
    const trintaESeis = new Date(NOW.getTime() + 36 * 60 * 60 * 1000).toISOString();

    expect(buildDashboardMetrics([row({ responseDeadlineAt: trintaESeis })], NOW).hasUrgent).toBe(
      false,
    );
    expect(buildDashboardMetrics([row({ responseDeadlineAt: doze })], NOW).hasUrgent).toBe(true);
    expect(buildDashboardMetrics([row({ responseDeadlineAt: trintaESeis })], NOW).dueSoon).toBe(1);
  });

  it('prazo vencido nao entra em "vencendo"', () => {
    const ontem = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(buildDashboardMetrics([row({ responseDeadlineAt: ontem })], NOW).dueSoon).toBe(0);
  });
});

describe('scorePercent', () => {
  it('converte o score em percentual da completude possivel', () => {
    expect(scorePercent(row({ score: { total: 30, max: 40 } }))).toBe(75);
  });

  it('sem defesa, nao ha percentual', () => {
    expect(scorePercent(row({}))).toBeNull();
  });
});

describe('buildIntakeSeries', () => {
  it('cobre a janela inteira, inclusive os dias sem MED', () => {
    const series = buildIntakeSeries([row({ openedAt: '2026-09-01T10:00:00.000Z' })], NOW, 3);

    expect(series.map((day) => day.date)).toEqual(['2026-08-31', '2026-09-01', '2026-09-02']);
    expect(series.map((day) => day.received)).toEqual([0, 1, 0]);
  });

  it('soma o valor do dia e ignora o que caiu fora da janela', () => {
    const series = buildIntakeSeries(
      [
        row({ openedAt: '2026-09-01T08:00:00.000Z', amount: 100 }),
        row({ openedAt: '2026-09-01T20:00:00.000Z', amount: 250 }),
        row({ openedAt: '2026-01-01T10:00:00.000Z', amount: 999 }),
      ],
      NOW,
      3,
    );

    const first = series.find((day) => day.date === '2026-09-01');
    expect(first).toEqual({ date: '2026-09-01', received: 2, amount: 350 });
    expect(series.reduce((sum, day) => sum + day.amount, 0)).toBe(350);
  });
});
