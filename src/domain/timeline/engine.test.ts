import { describe, expect, it } from 'vitest';
import { buildTimeline } from '@/domain/timeline/engine';
import { deriveEvidence } from '@/domain/evidence/derive';
import {
  makeCompleteCase,
  makeEmptyCase,
  makeEvidence,
  makeTracking,
} from '@/test/fixtures';

describe('buildTimeline', () => {
  it('orders events chronologically', () => {
    const events = buildTimeline(makeCompleteCase());
    const times = events.map((event) => Date.parse(event.occurredAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('emits nothing for data that has no timestamp', () => {
    const medCase = makeEmptyCase();
    medCase.med = { ...medCase.med, responseDeadlineAt: null };

    const events = buildTimeline(medCase);
    // Only the MED opening and the transaction date are timestamped here.
    expect(events.map((event) => event.type).sort()).toEqual([
      'med.opened',
      'transaction.created',
    ]);
  });

  it('keeps the source and reference of every tracking event', () => {
    const events = buildTimeline(makeCompleteCase());
    const delivered = events.filter((event) => event.type === 'shipment.delivered');

    expect(delivered.length).toBeGreaterThan(0);
    for (const event of delivered) {
      expect(event.source).toBe('TRACKING_PROVIDER');
      expect(event.sourceReference).toBe('AA123456789BR');
    }
  });

  it('does not invent a delivery event when the parcel is still in transit', () => {
    const medCase = makeCompleteCase();
    medCase.tracking = makeTracking({
      status: 'IN_TRANSIT',
      deliveredAt: null,
      receiverName: null,
      events: [
        {
          occurredAt: '2026-08-11T19:42:00.000Z',
          status: 'POSTED',
          description: 'Objeto postado',
          location: 'Sao Paulo/SP',
          source: 'TRACKING_PROVIDER',
          sourceReference: 'AA123456789BR',
        },
      ],
    });

    const events = buildTimeline(medCase);
    expect(events.some((event) => event.type === 'shipment.delivered')).toBe(false);
  });

  it('expands dated log entries carried by evidence', () => {
    const medCase = makeEmptyCase();
    medCase.evidences = [
      makeEvidence(
        'LOGIN_LOG',
        [
          { occurredAt: '2026-08-12T09:00:00.000Z', description: 'Login via app' },
          { occurredAt: 'not-a-date', description: 'ignorado' },
        ],
        { source: 'API', sourceReference: 'auth-log-1' },
      ),
    ];

    const events = buildTimeline(medCase);
    const logins = events.filter((event) => event.type === 'customer.login');
    expect(logins).toHaveLength(1);
    expect(logins[0]?.description).toBe('Login via app');
    expect(logins[0]?.evidenceIds).toEqual(['ev_login_log']);
  });
});

describe('deduplicacao', () => {
  it('nao repete a entrega quando ela chega pelo campo e pelo evento', () => {
    const medCase = makeCompleteCase();
    const events = buildTimeline(medCase);

    const delivered = events.filter((event) => event.type === 'shipment.delivered');
    const posted = events.filter((event) => event.type === 'shipment.posted');

    expect(delivered).toHaveLength(1);
    expect(posted).toHaveLength(1);
  });

  it('mantem a redacao da propria transportadora ao desduplicar', () => {
    const events = buildTimeline(makeCompleteCase());
    const delivered = events.find((event) => event.type === 'shipment.delivered');

    // Entre a descricao do provedor e a nossa parafrase, fica a do provedor:
    // e a que a instituicao espera ler e a que pode ser conferida na origem.
    expect(delivered?.description).toBe('Objeto entregue ao destinatario - Sao Paulo/SP');
    expect(delivered?.source).toBe('TRACKING_PROVIDER');
  });

  it('prefere o evento do provedor ao marco digitado a mao no mesmo instante', () => {
    const medCase = makeCompleteCase();
    const events = buildTimeline({
      ...medCase,
      tracking: makeTracking({
        events: [
          {
            occurredAt: '2026-08-14T16:17:00.000Z',
            status: 'DELIVERED',
            description: 'Objeto entregue ao destinatario',
            location: null,
            source: 'TRACKING_PROVIDER',
            sourceReference: 'AA123456789BR',
          },
          {
            occurredAt: '2026-08-14T16:17:00.000Z',
            status: 'DELIVERED',
            description: 'Pedido entregue',
            location: null,
            source: 'MANUAL',
            sourceReference: null,
          },
        ],
      }),
    });

    const delivered = events.filter((event) => event.type === 'shipment.delivered');
    expect(delivered).toHaveLength(1);
    expect(delivered[0]?.source).toBe('TRACKING_PROVIDER');
  });

  it('preserva as evidencias das duas versoes do mesmo fato', () => {
    // Como no fluxo real: a timeline e montada sobre as evidencias ja derivadas
    // dos registros estruturados.
    const medCase = makeCompleteCase();
    const withEvidence = { ...medCase, evidences: deriveEvidence(medCase) };

    const events = buildTimeline(withEvidence);
    const delivered = events.find((event) => event.type === 'shipment.delivered');

    expect(delivered?.evidenceIds.length).toBeGreaterThan(0);
    // O id aparece uma unica vez, mesmo tendo vindo das duas versoes.
    expect(new Set(delivered?.evidenceIds).size).toBe(delivered?.evidenceIds.length);
  });
});
