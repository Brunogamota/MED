import type { DeliveryChannel, MedReason, ShipmentStatus } from '@/domain/types';

/**
 * Rotulos em portugues, compartilhados por UI e PDF para que o operador e a
 * instituicao vejam exatamente a mesma palavra para o mesmo estado.
 */

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  CREATED: 'Pedido criado',
  IN_PRODUCTION: 'Em producao',
  POSTED: 'Postado',
  IN_TRANSIT: 'Em transito',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  NOT_DELIVERED: 'Nao entregue',
  RETURNED: 'Devolvido',
  UNKNOWN: 'Nao informado',
};

/** Ordem em que os status aparecem para o operador, seguindo o fluxo real. */
export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  'IN_PRODUCTION',
  'POSTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'NOT_DELIVERED',
  'RETURNED',
];

export const DELIVERY_CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  PLATFORM: 'Area de membros / plataforma',
  OTHER: 'Outro canal',
};

export const MED_REASON_LABEL: Record<MedReason, string> = {
  UNRECOGNIZED_TRANSACTION: 'Nao reconhece a transacao',
  PRODUCT_NOT_RECEIVED: 'Produto ou servico nao recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'Diferente do anunciado',
  FRAUD_SCAM: 'Suspeita de golpe',
  FRAUD_COERCION: 'Transacao sob coacao',
  FRAUD_ACCOUNT_TAKEOVER: 'Suspeita de invasao de conta',
  DUPLICATE_CHARGE: 'Cobranca em duplicidade',
  OPERATIONAL_ERROR: 'Erro operacional',
  OTHER: 'Outro motivo',
};

/** Tipos de produto entregues fisicamente. */
export const PHYSICAL_PRODUCT_TYPES = ['PHYSICAL', 'MARKETPLACE'] as const;
