import { describe, expect, it } from 'vitest';
import { EVIDENCE_CATEGORIES, MED_REASONS, PRODUCT_TYPES } from '@/domain/types';
import {
  normalizeWeights,
  resolveCategoryWeights,
  resolveRequirements,
} from '@/domain/evidence/requirements';

describe('requirement weights', () => {
  it('always totals exactly 100 for every product type and reason', () => {
    for (const productType of PRODUCT_TYPES) {
      for (const reason of MED_REASONS) {
        const weights = resolveCategoryWeights(productType, reason);
        const total = EVIDENCE_CATEGORIES.reduce(
          (sum, category) => sum + weights[category],
          0,
        );
        expect(total).toBe(100);
      }
    }
  });

  it('normalises fractional weights deterministically', () => {
    const weights = normalizeWeights({
      IDENTITY: 1,
      TRANSACTION: 1,
      DELIVERY: 1,
      TECHNICAL: 1,
      DOCUMENTATION: 1,
    });
    const total = EVIDENCE_CATEGORIES.reduce((sum, c) => sum + weights[c], 0);
    expect(total).toBe(100);
  });
});

describe('resolveRequirements', () => {
  it('escalates delivery evidence when the MED is about non-delivery', () => {
    const base = resolveRequirements('PHYSICAL', 'OTHER');
    const escalated = resolveRequirements('PHYSICAL', 'PRODUCT_NOT_RECEIVED');

    expect(base.find((r) => r.type === 'DELIVERY_CONFIRMATION')?.necessity).toBe('RECOMMENDED');
    expect(escalated.find((r) => r.type === 'DELIVERY_CONFIRMATION')?.necessity).toBe('REQUIRED');
  });

  it('never demands evidence that does not belong to the product type', () => {
    const physical = resolveRequirements('PHYSICAL', 'PRODUCT_NOT_RECEIVED');
    expect(physical.some((r) => r.type === 'ACCESS_LOG')).toBe(false);

    const digital = resolveRequirements('DIGITAL', 'PRODUCT_NOT_RECEIVED');
    expect(digital.some((r) => r.type === 'TRACKING_EVENTS')).toBe(false);
    expect(digital.find((r) => r.type === 'ACCESS_LOG')?.necessity).toBe('REQUIRED');
  });

  it('never lists the same evidence type twice', () => {
    for (const productType of PRODUCT_TYPES) {
      for (const reason of MED_REASONS) {
        const types = resolveRequirements(productType, reason).map((r) => r.type);
        expect(new Set(types).size).toBe(types.length);
      }
    }
  });
});
