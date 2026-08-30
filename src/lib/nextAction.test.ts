import { describe, expect, it } from 'vitest';
import { nextAction } from '@/lib/nextAction';
import { assessEvidence } from '@/domain/evidence/engine';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { makeCompleteCase } from '@/test/fixtures';
import type { MedCase } from '@/domain/case';

function assessmentOf(medCase: MedCase) {
  const evidences = mergeEvidence(medCase.evidences, deriveEvidence(medCase));
  return assessEvidence({
    productType: medCase.med.productType ?? 'OTHER',
    reason: medCase.med.reason,
    evidences,
  });
}

describe('nextAction', () => {
  it('caso completo fica pronto para enviar', () => {
    const medCase = makeCompleteCase();
    const action = nextAction({
      med: medCase.med,
      assessment: assessmentOf(medCase),
      latestDefense: null,
      submissions: [],
      hoursRemaining: 72,
      lastEvidenceAt: null,
    });
    expect(action.kind).toBe('ready');
  });

  it('evidência obrigatória faltante vira lista com ação direta', () => {
    const medCase = makeCompleteCase();
    medCase.tracking = null;
    medCase.documents = [];
    const action = nextAction({
      med: medCase.med,
      assessment: assessmentOf(medCase),
      submissions: [],
      latestDefense: null,
      hoursRemaining: 72,
      lastEvidenceAt: null,
    });
    expect(action.kind).toBe('missing');
    if (action.kind === 'missing') {
      expect(action.requiredCount).toBeGreaterThan(0);
      expect(action.items[0]?.href).toContain(`/meds/${medCase.med.id}`);
    }
  });

  it('menos de 24h com evidência faltante é prazo crítico', () => {
    const medCase = makeCompleteCase();
    medCase.tracking = null;
    medCase.documents = [];
    const action = nextAction({
      med: medCase.med,
      assessment: assessmentOf(medCase),
      submissions: [],
      latestDefense: null,
      hoursRemaining: 6,
      lastEvidenceAt: null,
    });
    expect(action.kind).toBe('critical');
  });

  it('prazo vencido domina qualquer outro estado', () => {
    const medCase = makeCompleteCase();
    const action = nextAction({
      med: medCase.med,
      assessment: assessmentOf(medCase),
      submissions: [],
      latestDefense: null,
      hoursRemaining: -2,
      lastEvidenceAt: null,
    });
    expect(action.kind).toBe('expired');
  });

  it('caso enviado mostra o que esperar', () => {
    const medCase = makeCompleteCase();
    medCase.med = { ...medCase.med, status: 'SUBMITTED' };
    const action = nextAction({
      med: medCase.med,
      assessment: assessmentOf(medCase),
      submissions: [],
      latestDefense: null,
      hoursRemaining: 12,
      lastEvidenceAt: null,
    });
    expect(action.kind).toBe('submitted');
  });
});
