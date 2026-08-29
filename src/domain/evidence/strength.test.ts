import { describe, expect, it } from 'vitest';
import { evaluateStrength, sourceTrustOf } from '@/domain/evidence/strength';
import { makeEvidence } from '@/test/fixtures';

describe('evaluateStrength', () => {
  it('treats conflicting evidence as weak regardless of source', () => {
    const evidence = makeEvidence('TRACKING_EVENTS', 'x', {
      source: 'TRACKING_PROVIDER',
      sourceReference: 'AA123456789BR',
      verificationStatus: 'CONFLICTING',
    });
    const result = evaluateStrength(evidence);
    expect(result.strength).toBe('WEAK');
    expect(result.appliedRules).toEqual(['R0_CONFLICTING']);
  });

  it('upgrades verified third-party evidence', () => {
    const evidence = makeEvidence('DELIVERED_AT', '2026-08-14T16:17:00.000Z', {
      source: 'TRACKING_PROVIDER',
      sourceReference: 'AA123456789BR',
      verificationStatus: 'VERIFIED',
    });
    expect(evaluateStrength(evidence).strength).toBe('STRONG');
  });

  it('downgrades manually typed evidence', () => {
    const manual = makeEvidence('DELIVERY_CONFIRMATION', 'entregue', { source: 'MANUAL' });
    // base STRONG -> R2 self-reported -> MEDIUM -> R3 unverified -> WEAK
    expect(evaluateStrength(manual).strength).toBe('WEAK');
  });

  it('downgrades machine evidence with no source reference', () => {
    const withReference = makeEvidence('TRACKING_EVENTS', 'x', {
      source: 'TRACKING_PROVIDER',
      sourceReference: 'AA123456789BR',
    });
    const withoutReference = makeEvidence('TRACKING_EVENTS', 'x', {
      source: 'TRACKING_PROVIDER',
      sourceReference: null,
    });
    expect(evaluateStrength(withReference).strength).toBe('STRONG');
    expect(evaluateStrength(withoutReference).strength).toBe('MEDIUM');
    expect(evaluateStrength(withoutReference).appliedRules).toContain('R4_NO_SOURCE_REFERENCE');
  });

  it('classifies source trust explicitly', () => {
    expect(sourceTrustOf('TRACKING_PROVIDER')).toBe('THIRD_PARTY_VERIFIABLE');
    expect(sourceTrustOf('MANUAL')).toBe('SELF_REPORTED');
    expect(sourceTrustOf('SHOPIFY')).toBe('PROVIDER');
  });
});
