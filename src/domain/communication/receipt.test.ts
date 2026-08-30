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
    expect(draft.toName).toBe('Maria Souza');
    expect(draft.reference).toBe('AA123456789BR');
  });

  it('sem cliente cadastrado, usa o nome do pagador do MED', () => {
    const medCase = makeCompleteCase();
    medCase.customer = null;
    const draft = draftCommunication(medCase, 'DELIVERY_CONFIRMATION');
    expect(draft.toName).toBe(medCase.med.payer.name);
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

describe('botão da mensagem', () => {
  const receiptWith = (
    template: Parameters<typeof buildClientEmailView>[0]['template'],
    reference: string | null,
  ) =>
    buildClientEmailView({
      template,
      from: 'IronPay',
      to: 'c@e.com',
      subject: 'Assunto',
      sentAt: null,
      body: 'corpo',
      reference,
    });

  it('entrega de acesso vira botão "Acessar agora", com ou sem URL', () => {
    const comLink = receiptWith('ACCESS_DELIVERY', 'https://membros.exemplo.com/x');
    expect(comLink.action).toEqual({
      kind: 'BUTTON',
      label: 'Acessar agora',
      valueLabel: 'Link de acesso',
      value: 'https://membros.exemplo.com/x',
      href: 'https://membros.exemplo.com/x',
    });

    // Sem URL o botão continua aparecendo — era o botão que o cliente via —,
    // mas não é clicável: não temos o destino para inventar.
    const semLink = receiptWith('ACCESS_DELIVERY', 'Área de membros');
    expect(semLink.action?.kind).toBe('BUTTON');
    expect(semLink.action).toMatchObject({ label: 'Acessar agora', href: null });
  });

  it('cada modelo tem seu próprio call-to-action', () => {
    expect(receiptWith('DELIVERY_CONFIRMATION', 'AA123BR').action).toMatchObject({
      label: 'Rastrear pedido',
      valueLabel: 'Código de rastreio',
    });
    expect(receiptWith('PURCHASE_CONFIRMATION', 'PED-1').action).toMatchObject({
      label: 'Ver pedido',
      valueLabel: 'Número do pedido',
    });
  });

  it('mensagem genérica só vira botão quando há link de verdade', () => {
    expect(receiptWith('GENERIC', 'https://x.com').action).toMatchObject({
      kind: 'BUTTON',
      label: 'Abrir link',
    });
    expect(receiptWith('GENERIC', 'texto solto').action?.kind).toBe('NOTE');
  });

  it('sem referência, não há botão — botão sem destino não representa nada', () => {
    expect(receiptWith('ACCESS_DELIVERY', null).action).toBeNull();
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
