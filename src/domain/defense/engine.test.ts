import { describe, expect, it } from 'vitest';
import { generateDefense } from '@/domain/defense/engine';
import {
  makeCompleteCase,
  makeEmptyCase,
  makeEvidence,
  makeMed,
  makeTracking,
} from '@/test/fixtures';

const NOW = new Date('2026-08-25T12:00:00.000Z');

function generate(medCase: Parameters<typeof generateDefense>[0]['medCase']) {
  return generateDefense({ medCase, version: 1, defenseId: 'def_1', now: NOW });
}

describe('generateDefense', () => {
  it('claims nothing beyond what the MED itself brought when nothing was collected', () => {
    const { defense } = generate(makeEmptyCase());

    // The MED payload itself is a provenanced source, so its end-to-end id is
    // legitimate evidence. Nothing that would have to come from the merchant is
    // claimed.
    expect(defense.claims.map((claim) => claim.id)).toEqual(['transaction.executed']);
    expect(defense.claims[0]?.evidenceIds).toEqual(['derived:END_TO_END_ID:med_pk_1']);
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('NO_IDENTITY_EVIDENCE');
  });

  it('produces no claims at all when even the MED carries no usable data', () => {
    const medCase = makeEmptyCase();
    medCase.med = makeMed({ endToEndId: null, transactionId: null });

    const { defense } = generate(medCase);

    expect(defense.claims).toEqual([]);
    expect(defense.evidenceIds).toEqual([]);
    expect(defense.score.total).toBe(0);
    expect(defense.narrative.body).toContain('não há, na base do estabelecimento');
  });

  it('builds delivery claims from a delivered physical order', () => {
    const { defense } = generate(makeCompleteCase());
    const ids = defense.claims.map((claim) => claim.id);

    expect(ids).toContain('delivery.shipped');
    expect(ids).toContain('delivery.delivered');
    expect(ids).toContain('transaction.executed');
    expect(ids).toContain('identity.document_match');
    expect(defense.narrative.body).toContain('AA123456789BR');
  });

  it('never emits a claim without supporting evidence ids', () => {
    const { defense } = generate(makeCompleteCase());
    for (const claim of defense.claims) {
      expect(claim.evidenceIds.length).toBeGreaterThan(0);
      for (const evidenceId of claim.evidenceIds) {
        expect(defense.evidenceIds).toContain(evidenceId);
      }
    }
  });

  it('drops delivery claims when the parcel was never delivered', () => {
    const medCase = makeCompleteCase();
    medCase.tracking = makeTracking({ status: 'IN_TRANSIT', deliveredAt: null, receiverName: null });

    const { defense } = generate(medCase);
    const ids = defense.claims.map((claim) => claim.id);

    expect(ids).toContain('delivery.shipped');
    expect(ids).not.toContain('delivery.delivered');
    expect(defense.missingEvidences.map((m) => m.type)).toContain('DELIVERY_CONFIRMATION');
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('NO_DELIVERY_PROOF');
  });

  it('is deterministic for the same input', () => {
    const first = generate(makeCompleteCase()).defense;
    const second = generate(makeCompleteCase()).defense;
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('flags a payer document that does not match the order', () => {
    const medCase = makeCompleteCase();
    medCase.med = makeMed({ payer: { ...makeMed().payer, document: '98765432100' } });

    const { defense } = generate(medCase);
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('PAYER_DOCUMENT_MISMATCH');
    expect(defense.claims.map((claim) => claim.id)).not.toContain('identity.document_match');
  });

  it('ignores conflicting evidence when building claims', () => {
    const medCase = makeCompleteCase();
    medCase.evidences = [
      makeEvidence('INVOICE', 'nfe-88231.pdf', { verificationStatus: 'CONFLICTING' }),
    ];

    const { defense } = generate(medCase);
    expect(defense.claims.map((claim) => claim.id)).not.toContain('documentation.invoice');
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('CONFLICTING_EVIDENCE');
  });

  it('raises a deadline flag when the response window is closing', () => {
    const { defense } = generateDefense({
      medCase: makeCompleteCase(),
      version: 1,
      defenseId: 'def_1',
      now: new Date('2026-09-04T12:00:00.000Z'),
    });
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('DEADLINE_NEAR');
  });
});
