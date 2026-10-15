import { describe, expect, it } from 'vitest';
import { buildBullsHome, weeklyVariation } from '@/lib/bullsHome';
import type { MedListRow } from '@/infra/repositories/types';
import type { Med, MedStatus } from '@/domain/types';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const hours = (h: number) => new Date(NOW.getTime() + h * 60 * 60 * 1000).toISOString();

let seq = 0;
function row(overrides: {
  status?: MedStatus;
  amount?: number;
  openedAt?: string;
  deadline?: string | null;
  name?: string;
  score?: { total: number; max: number };
}): MedListRow {
  seq += 1;
  const med = {
    id: `med_${seq}`,
    organizationId: 'org_a',
    medId: `MED-${seq}`,
    amount: overrides.amount ?? 100,
    currency: 'BRL',
    openedAt: overrides.openedAt ?? '2026-10-14T10:00:00.000Z',
    responseDeadlineAt: overrides.deadline ?? null,
    status: overrides.status ?? 'RECEIVED',
    payer: { name: overrides.name ?? null },
    productType: 'PHYSICAL',
  } as unknown as Med;
  return {
    med,
    latestDefense: overrides.score
      ? { id: `def_${seq}`, version: 1, score: overrides.score, generatedAt: NOW.toISOString() }
      : null,
    evidenceCount: 0,
  } as MedListRow;
}

describe('buildBullsHome', () => {
  it('conta cada bloco pela mesma regra da visão da fila', () => {
    const data = buildBullsHome(
      [
        row({ status: 'READY_TO_SUBMIT', amount: 200, deadline: hours(100) }),
        row({ status: 'MISSING_EVIDENCE', amount: 50, deadline: hours(10) }),
        row({ status: 'COLLECTING_DATA', deadline: hours(60) }),
        row({ status: 'SUBMITTED', amount: 999 }),
        row({ status: 'EXPIRED', amount: 999 }),
      ],
      NOW,
    );
    expect(data.open).toBe(3);
    expect(data.openAmountLabel).toBe('R$ 350,00');
    expect(data.ready).toBe(1);
    expect(data.readyShare).toBeCloseTo(1 / 3);
    expect(data.blocked).toBe(1);
    expect(data.dueSoon).toBe(2);
    expect(data.urgent).toBe(1);
    expect(data.submitted).toBe(1);
  });

  it('conta vazia: zeros e listas vazias, nada preenchido', () => {
    const data = buildBullsHome([], NOW);
    expect(data.open).toBe(0);
    expect(data.readyShare).toBeNull();
    expect(data.needsYou).toEqual([]);
    expect(data.queue).toEqual([]);
    expect(data.intake.series).toHaveLength(14);
    expect(data.intake.total).toBe(0);
    expect(data.intake.variation).toBeNull();
  });

  it('"precisam de você" traz prazo curto ou falta de evidência, o mais apertado primeiro', () => {
    const data = buildBullsHome(
      [
        row({ status: 'COLLECTING_DATA', deadline: hours(200), name: 'Folgado' }),
        row({ status: 'MISSING_EVIDENCE', deadline: hours(150), name: 'Sem prova' }),
        row({ status: 'COLLECTING_DATA', deadline: hours(5), name: 'Urgente' }),
        row({ status: 'SUBMITTED', deadline: hours(1), name: 'Já enviado' }),
      ],
      NOW,
    );
    expect(data.needsYou.map((item) => item.payerName)).toEqual(['Urgente', 'Sem prova']);
  });

  it('sem defesa, a força da evidência fica ausente — não zero', () => {
    const [semDefesa, comDefesa] = buildBullsHome(
      [row({ deadline: hours(10) }), row({ deadline: hours(20), score: { total: 40, max: 80 } })],
      NOW,
    ).queue;
    expect(semDefesa?.scorePercent).toBeNull();
    expect(comDefesa?.scorePercent).toBe(50);
  });

  it('entrada por dia usa a data real de abertura', () => {
    const data = buildBullsHome(
      [row({ openedAt: '2026-10-15T09:00:00.000Z' }), row({ openedAt: '2026-10-02T09:00:00.000Z' })],
      NOW,
    );
    expect(data.intake.series.at(-1)).toMatchObject({ date: '2026-10-15', received: 1 });
    expect(data.intake.series[0]).toMatchObject({ date: '2026-10-02', received: 1 });
    expect(data.intake.total).toBe(2);
  });
});

describe('weeklyVariation', () => {
  it('compara os últimos 7 dias com os 7 anteriores', () => {
    const series = Array.from({ length: 14 }, (_, index) => ({
      date: `d${index}`,
      received: index < 7 ? 1 : 2,
      amount: 0,
    }));
    expect(weeklyVariation(series)).toBe(1);
  });

  it('sem base na semana anterior não há variação', () => {
    const series = Array.from({ length: 14 }, (_, index) => ({
      date: `d${index}`,
      received: index < 7 ? 0 : 3,
      amount: 0,
    }));
    expect(weeklyVariation(series)).toBeNull();
  });
});
