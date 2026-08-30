import { describe, expect, it } from 'vitest';
import {
  buildClientEmailView,
  draftCommunication,
  parseCommunicationReceipt,
  RECONSTRUCTION_STAMP,
} from '@/domain/communication/receipt';
import { assessEvidence } from '@/domain/evidence/engine';
import { makeCompleteCase, makeEvidence } from '@/test/fixtures';

describe('draftCommunication', () => {
  it('pré-preenche destinatário a partir do caso; remetente é sempre o gateway', () => {
    const draft = draftCommunication(makeCompleteCase(), 'DELIVERY_CONFIRMATION');
    // O remetente é sempre o gateway que efetivamente envia — não a loja.
    expect(draft.from).toBe('IronPay');
    expect(draft.to).toBe('maria@example.com');
    expect(draft.reference).toBe('AA123456789BR');
  });

  it('deixa destinatário vazio quando o caso não tem e-mail', () => {
    const medCase = makeCompleteCase();
    medCase.customer = null;
    medCase.digitalDelivery = null;
    medCase.med = { ...medCase.med, payer: { ...medCase.med.payer, email: null } };
    const draft = draftCommunication(medCase, 'ACCESS_DELIVERY');
    expect(draft.to).toBe('');
  });
});

describe('buildClientEmailView', () => {
  it('sempre carrega o selo de reconstrução', () => {
    const view = buildClientEmailView({
      template: 'GENERIC',
      from: 'Loja',
      to: 'c@e.com',
      subject: 'Oi',
      sentAt: null,
      body: 'linha 1\n\nlinha 2',
    });
    expect(view.stamp).toBe(RECONSTRUCTION_STAMP);
    expect(view.paragraphs).toEqual(['linha 1', 'linha 2']);
  });
});

describe('parseCommunicationReceipt', () => {
  it('rejeita valor que não é uma reconstrução válida', () => {
    expect(parseCommunicationReceipt('x')).toBeNull();
    expect(parseCommunicationReceipt({ template: 'NADA' })).toBeNull();
  });
});

describe('o comprovante não distorce a avaliação de evidências', () => {
  it('fica como suplementar: não entra nos requisitos nem infla o score', () => {
    const semComprovante = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [],
    });
    const comComprovante = assessEvidence({
      productType: 'PHYSICAL',
      reason: 'PRODUCT_NOT_RECEIVED',
      evidences: [makeEvidence('DELIVERY_COMMUNICATION', { template: 'GENERIC' })],
    });

    expect(comComprovante.score.total).toBe(semComprovante.score.total);
    expect(comComprovante.supplementaryEvidenceIds).toContain('ev_delivery_communication');
    expect(comComprovante.availableTypes).not.toContain('DELIVERY_COMMUNICATION');
  });
});
