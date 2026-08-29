import { describe, expect, it } from 'vitest';
import { EVIDENCE_TYPES } from '@/domain/types';
import {
  getEvidenceDefinition,
  listEvidenceDefinitions,
  uncataloguedEvidenceTypes,
} from '@/domain/evidence/catalog';

describe('evidence catalog', () => {
  it('covers every evidence type', () => {
    expect(uncataloguedEvidenceTypes()).toEqual([]);
    expect(listEvidenceDefinitions()).toHaveLength(EVIDENCE_TYPES.length);
  });

  it('gives every type a category, label and rationale', () => {
    for (const type of EVIDENCE_TYPES) {
      const definition = getEvidenceDefinition(type);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.rationale.length).toBeGreaterThan(0);
    }
  });
});
