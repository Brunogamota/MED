import type {
  AuditAction,
  DeliveryChannel,
  DocumentKind,
  EvidenceCategory,
  EvidenceSource,
  EvidenceStrength,
  MedReason,
  MedStatus,
  Necessity,
  NarrativeRenderer,
  ProductType,
  RequirementStatus,
  ShipmentStatus,
  SubmissionStatus,
  VerificationStatus,
} from '@/domain/types';

/**
 * Dicionario unico de rotulos em portugues.
 *
 * Regra da interface: nenhum enum bruto chega ao usuario. O valor tecnico
 * pode viver em tooltip ou em coluna mono do audit log; o rotulo principal
 * vem daqui, com acentuacao correta. UI e PDF leem deste arquivo para que o
 * operador e a instituicao vejam exatamente a mesma palavra.
 */

export const MED_STATUS_LABEL: Record<MedStatus, string> = {
  RECEIVED: 'Recebido',
  COLLECTING_DATA: 'Coletando dados',
  MISSING_EVIDENCE: 'Aguardando evidência',
  READY_TO_GENERATE: 'Pronto para gerar',
  DEFENSE_GENERATED: 'Defesa gerada',
  READY_TO_SUBMIT: 'Pronto para envio',
  SUBMITTED: 'Enviado',
  ACCEPTED: 'Aceito',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Prazo vencido',
};

/** Cor do ponto de status (6px). Cor nunca e o unico portador: o texto acompanha. */
export const MED_STATUS_TONE: Record<MedStatus, 'neutral' | 'accent' | 'warning' | 'danger' | 'info'> = {
  RECEIVED: 'neutral',
  COLLECTING_DATA: 'info',
  MISSING_EVIDENCE: 'warning',
  READY_TO_GENERATE: 'info',
  DEFENSE_GENERATED: 'accent',
  READY_TO_SUBMIT: 'accent',
  SUBMITTED: 'accent',
  ACCEPTED: 'accent',
  REJECTED: 'danger',
  EXPIRED: 'danger',
};

export const MED_REASON_LABEL: Record<MedReason, string> = {
  UNRECOGNIZED_TRANSACTION: 'Transação não reconhecida',
  PRODUCT_NOT_RECEIVED: 'Produto não recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'Diferente do anunciado',
  FRAUD_SCAM: 'Suspeita de golpe',
  FRAUD_COERCION: 'Transação sob coação',
  FRAUD_ACCOUNT_TAKEOVER: 'Invasão de conta',
  DUPLICATE_CHARGE: 'Cobrança em duplicidade',
  OPERATIONAL_ERROR: 'Erro operacional',
  OTHER: 'Outro motivo',
};

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  PHYSICAL: 'Produto físico',
  DIGITAL: 'Produto digital',
  SERVICE: 'Serviço',
  SUBSCRIPTION: 'Assinatura',
  TICKET: 'Ingresso',
  INFOPRODUCT: 'Infoproduto',
  MARKETPLACE: 'Marketplace',
  SAAS: 'SaaS',
  OTHER: 'Outro',
};

export const EVIDENCE_SOURCE_LABEL: Record<EvidenceSource, string> = {
  MANUAL: 'Manual',
  API: 'API',
  WEBHOOK: 'Webhook',
  SHOPIFY: 'Shopify',
  TRACKING_PROVIDER: 'Transportadora',
  PAYMENT_PROVIDER: 'Provedor de pagamento',
  ANTIFRAUD: 'Antifraude',
  ERP: 'ERP',
  MERCHANT: 'Loja',
  SYSTEM_DERIVED: 'Derivado pelo sistema',
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Não verificada',
  PENDING: 'Pendente',
  VERIFIED: 'Verificada',
  CONFLICTING: 'Conflitante',
};

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  AVAILABLE: 'Disponível',
  MISSING: 'Faltante',
  PENDING: 'Pendente',
  CONFLICTING: 'Conflitante',
};

export const STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  STRONG: 'Forte',
  MEDIUM: 'Média',
  WEAK: 'Fraca',
};

export const NECESSITY_LABEL: Record<Necessity, string> = {
  REQUIRED: 'Obrigatória',
  RECOMMENDED: 'Recomendada',
  OPTIONAL: 'Opcional',
};

export const CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  IDENTITY: 'Identidade',
  TRANSACTION: 'Transação',
  DELIVERY: 'Entrega',
  TECHNICAL: 'Dados técnicos',
  DOCUMENTATION: 'Documentação',
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  CREATED: 'Pedido criado',
  IN_PRODUCTION: 'Em produção',
  POSTED: 'Postado',
  IN_TRANSIT: 'Em trânsito',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  NOT_DELIVERED: 'Não entregue',
  RETURNED: 'Devolvido',
  UNKNOWN: 'Não informado',
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
  PLATFORM: 'Área de membros',
  OTHER: 'Outro canal',
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  INVOICE: 'Nota fiscal',
  DELIVERY_RECEIPT: 'Comprovante de entrega',
  TRANSACTION_RECEIPT: 'Comprovante da transação',
  CONTRACT: 'Contrato',
  SCREENSHOT: 'Captura de tela',
  LOG_EXPORT: 'Exportação de logs',
  DEFENSE_REPORT: 'Relatório de defesa',
  OTHER: 'Outro documento',
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  DRAFT: 'Rascunho',
  READY: 'Pronto',
  SUBMITTED: 'Enviado',
  ACCEPTED: 'Aceito',
  REJECTED: 'Rejeitado',
  FAILED: 'Falhou',
};

export const RENDERER_LABEL: Record<NarrativeRenderer, string> = {
  DETERMINISTIC_TEMPLATE: 'Modelo determinístico',
  LLM_GUARDED: 'IA com guarda de fatos',
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  MED_CREATED: 'MED criado',
  MED_UPDATED: 'MED atualizado',
  MED_STATUS_CHANGED: 'Status alterado',
  ORDER_UPSERTED: 'Pedido registrado',
  CUSTOMER_UPSERTED: 'Cliente registrado',
  TRANSACTION_UPSERTED: 'Transação registrada',
  TRACKING_UPSERTED: 'Entrega registrada',
  EVIDENCE_ADDED: 'Evidência adicionada',
  EVIDENCE_UPDATED: 'Evidência atualizada',
  DOCUMENT_UPLOADED: 'Documento anexado',
  DEFENSE_GENERATED: 'Defesa gerada',
  PACK_EXPORTED: 'Pacote exportado',
  SUBMISSION_CREATED: 'Envio preparado',
};

export const SEVERITY_LABEL: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
};

/** Tipos de produto entregues fisicamente. */
export const PHYSICAL_PRODUCT_TYPES = ['PHYSICAL', 'MARKETPLACE'] as const;

/** Prazo: a pressao real do produto. Faixas de urgencia usadas em toda tela. */
export function deadlineTone(daysRemaining: number | null): 'neutral' | 'warning' | 'danger' {
  if (daysRemaining === null) return 'neutral';
  if (daysRemaining < 0) return 'danger';
  if (daysRemaining <= 3) return 'warning';
  return 'neutral';
}

export function deadlineText(daysRemaining: number | null): string {
  if (daysRemaining === null) return '—';
  if (daysRemaining < 0) return 'vencido';
  if (daysRemaining === 0) return 'vence hoje';
  if (daysRemaining === 1) return 'prazo em 1 dia';
  return `prazo em ${daysRemaining} dias`;
}
