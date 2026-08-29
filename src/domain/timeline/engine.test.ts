import { describe, expect, it } from 'vitest';
import { buildTimeline } from '@/domain/timeline/engine';
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
