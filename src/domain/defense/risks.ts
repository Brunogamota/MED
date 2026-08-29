import type { RiskFlag } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { evidenceIdsOfTypes } from '@/domain/case';
import type { EvidenceAssessment } from '@/domain/evidence/engine';
import { daysUntil, formatAmount, parseIso } from '@/lib/format';

/**
 * Operational risk flags.
 *
 * These are warnings for the analyst, derived from data the case already has.
 * They never suppress a claim and they never invent one — they point at things
 * a reviewer at the requesting institution is likely to notice.
 */

const PHYSICAL_TYPES = new Set(['PHYSICAL', 'MARKETPLACE']);

function digitsOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export interface DetectRisksInput {
  medCase: MedCase;
  assessment: EvidenceAssessment;
  now?: Date;
}

export function detectRisks(input: DetectRisksInput): RiskFlag[] {
  const { medCase, assessment } = input;
  const now = input.now ?? new Date();
  const { med, customer, order, tracking, transaction, evidences } = medCase;
  const flags: RiskFlag[] = [];

  const conflicting = evidences.filter(
    (evidence) => evidence.verificationStatus === 'CONFLICTING',
  );
  if (conflicting.length > 0) {
    flags.push({
      code: 'CONFLICTING_EVIDENCE',
      severity: 'HIGH',
      message: `${conflicting.length} evidencia(s) marcada(s) como conflitante(s) nao serao utilizadas na defesa.`,
      evidenceIds: conflicting.map((evidence) => evidence.id),
    });
  }

  const productType = assessment.productType;
  if (PHYSICAL_TYPES.has(productType)) {
    const deliveryConfirmed = assessment.items.some(
      (item) => item.type === 'DELIVERY_CONFIRMATION' && item.status === 'AVAILABLE',
    );
    if (!deliveryConfirmed) {
      flags.push({
        code: 'NO_DELIVERY_PROOF',
        severity: med.reason === 'PRODUCT_NOT_RECEIVED' ? 'HIGH' : 'MEDIUM',
        message:
          'Nao ha confirmacao de entrega registrada. Para produto fisico esta e a evidencia central da defesa.',
        evidenceIds: [],
      });
    }
  }

  const deliveredAt = parseIso(tracking?.deliveredAt ?? null);
  const openedAt = parseIso(med.openedAt);
  if (deliveredAt && openedAt && deliveredAt.getTime() > openedAt.getTime()) {
    flags.push({
      code: 'DELIVERY_AFTER_MED_OPENED',
      severity: 'MEDIUM',
      message:
        'A entrega foi registrada depois da abertura do MED. Confirme a cronologia antes de enviar a defesa.',
      evidenceIds: evidenceIdsOfTypes(evidences, ['DELIVERED_AT', 'DELIVERY_CONFIRMATION']),
    });
  }

  const shippingPostalCode = digitsOnly(order?.shippingAddress?.postalCode);
  const customerPostalCode = digitsOnly(customer?.address?.postalCode ?? med.payerAddress?.postalCode);
  if (shippingPostalCode && customerPostalCode && shippingPostalCode !== customerPostalCode) {
    flags.push({
      code: 'ADDRESS_MISMATCH',
      severity: 'MEDIUM',
      message:
        'O CEP de entrega difere do CEP cadastrado do cliente. Explique a divergencia na defesa.',
      evidenceIds: evidenceIdsOfTypes(evidences, ['SHIPPING_ADDRESS', 'CUSTOMER_ADDRESS']),
    });
  }

  const payerDocument = digitsOnly(med.payer.document);
  const customerDocument = digitsOnly(customer?.identification.document);
  if (payerDocument && customerDocument && payerDocument !== customerDocument) {
    flags.push({
      code: 'PAYER_DOCUMENT_MISMATCH',
      severity: 'HIGH',
      message:
        'O documento do pagador informado no MED difere do documento cadastrado no pedido.',
      evidenceIds: evidenceIdsOfTypes(evidences, ['CUSTOMER_DOCUMENT', 'PAYER_DOCUMENT_MATCH']),
    });
  }

  const payerEmail = med.payer.email?.trim().toLowerCase();
  const customerEmail = customer?.identification.email?.trim().toLowerCase();
  if (payerEmail && customerEmail && payerEmail !== customerEmail) {
    flags.push({
      code: 'PAYER_EMAIL_MISMATCH',
      severity: 'MEDIUM',
      message: 'O e-mail do pagador informado no MED difere do e-mail cadastrado no pedido.',
      evidenceIds: evidenceIdsOfTypes(evidences, ['CUSTOMER_EMAIL', 'PAYER_EMAIL_MATCH']),
    });
  }

  if (transaction && Math.abs(transaction.amount - med.amount) > 0.009) {
    flags.push({
      code: 'AMOUNT_MISMATCH',
      severity: 'MEDIUM',
      message: `O valor da transacao (${formatAmount(transaction.amount, transaction.currency)}) difere do valor contestado (${formatAmount(med.amount, med.currency)}).`,
      evidenceIds: evidenceIdsOfTypes(evidences, ['TRANSACTION_RECEIPT']),
    });
  }

  const hasCategory = (category: 'TECHNICAL' | 'IDENTITY') =>
    assessment.items.some((item) => item.category === category && item.status === 'AVAILABLE');

  if (!hasCategory('TECHNICAL')) {
    flags.push({
      code: 'NO_TECHNICAL_EVIDENCE',
      severity: 'MEDIUM',
      message: 'Nenhum dado tecnico da sessao de compra foi coletado (IP, device, logs).',
      evidenceIds: [],
    });
  }

  if (!hasCategory('IDENTITY')) {
    flags.push({
      code: 'NO_IDENTITY_EVIDENCE',
      severity: 'HIGH',
      message: 'Nenhuma evidencia de identidade do comprador foi coletada.',
      evidenceIds: [],
    });
  }

  const weakRequired = assessment.items.filter(
    (item) => item.necessity === 'REQUIRED' && item.status === 'AVAILABLE' && item.strength === 'WEAK',
  );
  if (weakRequired.length > 0) {
    flags.push({
      code: 'UNVERIFIED_CRITICAL_EVIDENCE',
      severity: 'MEDIUM',
      message: `Evidencias obrigatorias com forca baixa: ${weakRequired.map((item) => item.label).join(', ')}.`,
      evidenceIds: weakRequired.flatMap((item) => item.evidenceIds),
    });
  }

  const remaining = daysUntil(med.responseDeadlineAt, now);
  if (remaining !== null) {
    if (remaining < 0) {
      flags.push({
        code: 'DEADLINE_PASSED',
        severity: 'HIGH',
        message: 'O prazo de resposta informado no MED ja passou.',
        evidenceIds: [],
      });
    } else if (remaining <= 2) {
      flags.push({
        code: 'DEADLINE_NEAR',
        severity: 'HIGH',
        message: `Faltam ${remaining} dia(s) para o prazo de resposta.`,
        evidenceIds: [],
      });
    }
  }

  return flags;
}
