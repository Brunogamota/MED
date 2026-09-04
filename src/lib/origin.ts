import type { EvidenceSource } from '@/domain/types';
import type { MedCase } from '@/domain/case';

/**
 * Cadeia de origem de cada dado exibido (briefing 3.1/3.2).
 *
 * Todo valor na interface carrega de onde veio: instituição (webhook),
 * conector, derivação interna, digitação manual — ou está ausente. O
 * preenchimento manual é a exceção sinalizada como fragilidade, não o padrão.
 *
 * Este módulo é um adapter de apresentação: ele lê a proveniência que o
 * backend já grava (provider/source/sourceReference) e a traduz para as cinco
 * origens da interface. Ele nunca inventa origem: na dúvida, é manual.
 */

export type FieldOrigin =
  | { kind: 'institution' }
  | { kind: 'connector'; provider: string; at?: string | null }
  | { kind: 'derived'; from?: string | null }
  | { kind: 'manual'; by?: string | null; at?: string | null }
  | { kind: 'missing' };

export const ORIGIN_LABEL: Record<FieldOrigin['kind'], string> = {
  institution: 'Recebido da instituição',
  connector: 'Importado por conector',
  derived: 'Calculado pelo sistema',
  manual: 'Digitado à mão',
  missing: 'Não informado',
};

/** Cor do marcador de 4px. Verde = automático, âmbar = manual, vermelho = ausente. */
export const ORIGIN_TONE: Record<FieldOrigin['kind'], 'success' | 'neutral' | 'warning' | 'danger'> = {
  institution: 'success',
  connector: 'success',
  derived: 'neutral',
  manual: 'warning',
  missing: 'danger',
};

export function originTooltip(origin: FieldOrigin): string {
  switch (origin.kind) {
    case 'institution':
      return 'Recebido da instituição no MED';
    case 'connector':
      return origin.at
        ? `Importado de ${origin.provider} em ${origin.at}`
        : `Importado de ${origin.provider}`;
    case 'derived':
      return origin.from
        ? `Calculado a partir de ${origin.from}`
        : 'Calculado a partir dos dados do caso';
    case 'manual':
      return `Digitado${origin.by ? ` por ${origin.by}` : ''}${
        origin.at ? ` em ${origin.at}` : ''
      } — evidência mais frágil`;
    case 'missing':
      return 'Não informado — apontado como evidência faltante';
  }
}

/**
 * Origem de um valor: `missing` quando ausente, senão a origem do registro que
 * o carrega. Usada campo a campo nos pares rótulo-valor.
 */
export function valueOrigin(
  value: string | null | undefined,
  recordOrigin: FieldOrigin,
): FieldOrigin {
  if (value === null || value === undefined || value.length === 0) return { kind: 'missing' };
  return recordOrigin;
}

/** Origem do próprio MED: o que está no MED veio da instituição. */
export const MED_ORIGIN: FieldOrigin = { kind: 'institution' };

/** Origem de um registro de transação: conector do gateway, ou manual. */
export function transactionOrigin(medCase: MedCase): FieldOrigin {
  const transaction = medCase.transaction;
  if (!transaction) return { kind: 'missing' };
  if (transaction.provider) return { kind: 'connector', provider: transaction.provider };
  return { kind: 'manual' };
}

/** Origem do pedido: conector da plataforma de venda, ou manual. */
export function orderOrigin(medCase: MedCase): FieldOrigin {
  const order = medCase.order;
  if (!order) return { kind: 'missing' };
  if (order.provider) return { kind: 'connector', provider: order.provider };
  return { kind: 'manual' };
}

/** Origem do cliente: registro da loja com id externo conta como importado. */
export function customerOrigin(medCase: MedCase): FieldOrigin {
  const customer = medCase.customer;
  if (!customer) return { kind: 'missing' };
  if (customer.externalId) return { kind: 'connector', provider: 'Loja' };
  return { kind: 'manual' };
}

/** Origem da entrega física, a partir do source gravado. */
export function trackingOrigin(medCase: MedCase): FieldOrigin {
  const tracking = medCase.tracking;
  if (!tracking) return { kind: 'missing' };
  return evidenceSourceOrigin(tracking.source, tracking.sourceProvider ?? tracking.carrier);
}

/** Origem da entrega digital, a partir do source gravado. */
export function digitalDeliveryOrigin(medCase: MedCase): FieldOrigin {
  const delivery = medCase.digitalDelivery;
  if (!delivery) return { kind: 'missing' };
  return evidenceSourceOrigin(delivery.source, delivery.sourceProvider ?? delivery.platform);
}

/** Traducao EvidenceSource -> origem da interface (evidencias, timeline, audit). */
export function evidenceSourceOrigin(
  source: EvidenceSource,
  provider?: string | null,
): FieldOrigin {
  switch (source) {
    case 'WEBHOOK':
      return { kind: 'institution' };
    case 'SYSTEM_DERIVED':
      return { kind: 'derived' };
    case 'MANUAL':
      return { kind: 'manual' };
    case 'MERCHANT':
      return provider ? { kind: 'connector', provider } : { kind: 'manual' };
    case 'EMAIL':
    case 'API':
    case 'SHOPIFY':
    case 'TRACKING_PROVIDER':
    case 'PAYMENT_PROVIDER':
    case 'ANTIFRAUD':
    case 'ERP':
      return { kind: 'connector', provider: provider ?? sourceProviderName(source) };
  }
}

function sourceProviderName(source: EvidenceSource): string {
  switch (source) {
    case 'SHOPIFY':
      return 'Shopify';
    case 'TRACKING_PROVIDER':
      return 'transportadora';
    case 'PAYMENT_PROVIDER':
      return 'provedor de pagamento';
    case 'ANTIFRAUD':
      return 'antifraude';
    case 'ERP':
      return 'ERP';
    case 'EMAIL':
      return 'e-mail';
    default:
      return 'API';
  }
}
