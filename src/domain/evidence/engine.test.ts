import { describe, expect, it } from 'vitest';
import { assessEvidence } from '@/domain/evidence/engine';
import { makeEvidence } from '@/test/fixtures';

describe('assessEvidence', () => {
  it('reports every requirement as MISSING when nothing was collected', () => {
    const assessment = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [],
    });

    expect(assessment.items.every((item) => item.status === 'MISSING')).toBe(true);
    expect(assessment.availableTypes).toEqual([]);
    expect(assessment.score.total).toBe(0);
    expect(assessment.score.max).toBe(100);
    expect(assessment.missingEvidences.length).toBeGreaterThan(0);
  });

  it('marks a requirement AVAILABLE and scores it by strength', () => {
    const strong = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [
        makeEvidence('TRACKING_EVENTS', 'x', {
          source: 'TRACKING_PROVIDER',
          sourceReference: 'AA1',
          verificationStatus: 'VERIFIED',
        }),
      ],
    });
    const weak = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [makeEvidence('TRACKING_EVENTS', 'x', { source: 'MANUAL' })],
    });

    expect(strong.availableTypes).toContain('TRACKING_EVENTS');
    expect(strong.score.total).toBeGreaterThan(weak.score.total);
  });

  it('reports conflicting evidence as CONFLICTING and gives it no points', () => {
    const assessment = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [
        makeEvidence('DELIVERED_AT', '2026-08-14T16:17:00.000Z', {
          verificationStatus: 'CONFLICTING',
        }),
      ],
    });

    const item = assessment.items.find((entry) => entry.type === 'DELIVERED_AT');
    expect(item?.status).toBe('CONFLICTING');
    expect(assessment.availableTypes).not.toContain('DELIVERED_AT');
    expect(assessment.score.total).toBe(0);
  });

  it('keeps the score inside 0..100 and components consistent', () => {
    const assessment = assessEvidence({
      productType: 'DIGITAL',
      reason: 'UNRECOGNIZED_TRANSACTION',
      evidences: [
        makeEvidence('CUSTOMER_EMAIL', 'maria@example.com'),
        makeEvidence('ACCESS_LOG', [], { source: 'API', sourceReference: 'log-1' }),
      ],
    });

    expect(assessment.score.total).toBeGreaterThanOrEqual(0);
    expect(assessment.score.total).toBeLessThanOrEqual(100);
    const componentMax = assessment.score.components.reduce((sum, c) => sum + c.max, 0);
    expect(componentMax).toBe(assessment.score.max);
  });

  it('lists evidence outside the requirement set as supplementary', () => {
    const assessment = assessEvidence({
      productType: 'DIGITAL',
      reason: 'OTHER',
      evidences: [makeEvidence('TRACKING_CODE', 'AA123456789BR')],
    });
    expect(assessment.supplementaryEvidenceIds).toEqual(['ev_tracking_code']);
  });
});
