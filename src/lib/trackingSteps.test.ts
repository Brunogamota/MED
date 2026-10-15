import { describe, expect, it } from 'vitest';
import { trackingSteps } from '@/lib/trackingSteps';
import type { TrackingEvent } from '@/domain/types';

function event(overrides: Partial<TrackingEvent>): TrackingEvent {
  return {
    occurredAt: '2026-10-01T13:00:00.000Z',
    status: 'CREATED',
    description: 'Pedido recebido',
    source: 'MERCHANT',
    ...overrides,
  };
}

describe('trackingSteps', () => {
  it('sem marco, sem etapa — nada é inventado', () => {
    expect(trackingSteps(null)).toEqual([]);
    expect(trackingSteps([])).toEqual([]);
  });

  it('descarta marco sem data válida', () => {
    const steps = trackingSteps([event({ occurredAt: 'ontem' }), event({})]);
    expect(steps).toHaveLength(1);
  });

  it('ordena do mais antigo ao mais recente e usa o texto registrado', () => {
    const steps = trackingSteps([
      event({ occurredAt: '2026-10-03T13:00:00.000Z', status: 'POSTED', description: 'Objeto postado' }),
      event({ occurredAt: '2026-10-01T13:00:00.000Z' }),
    ]);
    expect(steps.map((step) => step.title)).toEqual(['Pedido recebido', 'Objeto postado']);
    expect(steps[0]?.dateLabel).toBe('01/10/2026, 10:00');
  });

  it('o último marco fica em andamento até a entrega', () => {
    const emRota = trackingSteps([
      event({}),
      event({ occurredAt: '2026-10-02T13:00:00.000Z', status: 'IN_TRANSIT', description: 'Em trânsito' }),
    ]);
    expect(emRota.map((step) => step.state)).toEqual(['completed', 'current']);

    const entregue = trackingSteps([
      event({}),
      event({ occurredAt: '2026-10-04T13:00:00.000Z', status: 'DELIVERED', description: 'Entregue' }),
    ]);
    expect(entregue.map((step) => step.state)).toEqual(['completed', 'completed']);
  });

  it('marca devolução e falha de entrega como problema', () => {
    const steps = trackingSteps([event({ status: 'NOT_DELIVERED', description: '' })]);
    expect(steps[0]?.state).toBe('issue');
    expect(steps[0]?.title).toBe('Não entregue');
  });

  it('não repete o mesmo marco registrado duas vezes', () => {
    expect(trackingSteps([event({}), event({})])).toHaveLength(1);
  });
});
