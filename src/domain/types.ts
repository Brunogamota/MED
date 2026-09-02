/**
 * Core domain types for the MED defense platform.
 *
 * Design rule that governs this whole file:
 *   NO CLAIM WITHOUT EVIDENCE. NO EVIDENCE WITHOUT PROVENANCE.
 *
 * Every factual attribute that could end up in a defense document is modelled
 * as an `Evidence` record carrying its own provenance. Optional fields are
 * genuinely optional: absent data stays absent and is reported as MISSING,
 * never defaulted, inferred or invented.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** ISO-8601 timestamp string. Kept as a string so the domain stays serialisable. */
export type IsoDateTime = string;

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export type OrganizationId = string;
export type MerchantId = string;

export const ROLES = ['OWNER', 'ANALYST', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// MED
// ---------------------------------------------------------------------------

export const MED_STATUSES = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
] as const;
export type MedStatus = (typeof MED_STATUSES)[number];

/**
 * Reason declared by the requesting institution when opening the MED
 * (Mecanismo Especial de Devolucao). Drives which evidence is required.
 */
export const MED_REASONS = [
  'UNRECOGNIZED_TRANSACTION',
  'PRODUCT_NOT_RECEIVED',
  'PRODUCT_NOT_AS_DESCRIBED',
  'FRAUD_SCAM',
  'FRAUD_COERCION',
  'FRAUD_ACCOUNT_TAKEOVER',
  'DUPLICATE_CHARGE',
  'OPERATIONAL_ERROR',
  'OTHER',
] as const;
export type MedReason = (typeof MED_REASONS)[number];

export const PRODUCT_TYPES = [
  'PHYSICAL',
  'DIGITAL',
  'SERVICE',
  'SUBSCRIPTION',
  'TICKET',
  'INFOPRODUCT',
  'MARKETPLACE',
  'SAAS',
  'OTHER',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface PartyIdentification {
  /** CPF or CNPJ, digits only. Masked at every presentation boundary. */
  document?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Address {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface Med {
  id: string;
  organizationId: OrganizationId;
  merchantId?: MerchantId | null;

  /** Identifier assigned by the requesting institution. */
  medId: string;
  transactionId?: string | null;
  endToEndId?: string | null;
  pixId?: string | null;

  amount: number;
  currency: string;

  transactionAt?: IsoDateTime | null;
  openedAt: IsoDateTime;
  responseDeadlineAt?: IsoDateTime | null;

  reason: MedReason;
  reasonDescription?: string | null;
  requestingInstitution?: string | null;

  productType?: ProductType | null;
  status: MedStatus;

  payer: PartyIdentification;
  payerAddress?: Address | null;
  /** Technical data captured for the payer at transaction time, when available. */
  payerIp?: string | null;
  payerDevice?: string | null;

  merchantName?: string | null;
  additionalInformation?: string | null;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Transaction / Order / Customer
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  externalId?: string | null;
  endToEndId?: string | null;
  amount: number;
  currency: string;
  method?: string | null;
  status?: string | null;
  authorizedAt?: IsoDateTime | null;
  capturedAt?: IsoDateTime | null;
  provider?: string | null;
  providerReference?: string | null;
  createdAt: IsoDateTime;
}

export interface Customer {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  identification: PartyIdentification;
  address?: Address | null;
  accountCreatedAt?: IsoDateTime | null;
  externalId?: string | null;
  createdAt: IsoDateTime;
}

export interface OrderItem {
  name: string;
  sku?: string | null;
  quantity: number;
  unitAmount?: number | null;
}

export interface Order {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  externalId?: string | null;
  productType: ProductType;
  items: OrderItem[];
  totalAmount?: number | null;
  placedAt?: IsoDateTime | null;
  checkoutIp?: string | null;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
  shippingAddress?: Address | null;
  provider?: string | null;
  providerReference?: string | null;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export const SHIPMENT_STATUSES = [
  'CREATED',
  /** Pedido em separacao/producao, antes de existir envio. */
  'IN_PRODUCTION',
  'POSTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  /** Tentativa de entrega sem sucesso ou entrega nao concluida. */
  'NOT_DELIVERED',
  'RETURNED',
  'UNKNOWN',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export interface TrackingEvent {
  occurredAt: IsoDateTime;
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  /** Where this specific event came from. Never synthesised. */
  source: EvidenceSource;
  sourceReference?: string | null;
}

export interface Tracking {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  carrier?: string | null;
  /** Ausente enquanto o pedido esta em producao e ainda nao foi postado. */
  trackingCode?: string | null;
  status: ShipmentStatus;
  postedAt?: IsoDateTime | null;
  deliveredAt?: IsoDateTime | null;
  receiverName?: string | null;
  events: TrackingEvent[];
  source: EvidenceSource;
  sourceProvider?: string | null;
  sourceReference?: string | null;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Entrega digital
// ---------------------------------------------------------------------------

export const DELIVERY_CHANNELS = ['EMAIL', 'WHATSAPP', 'SMS', 'PLATFORM', 'OTHER'] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

/**
 * Entrega de produto digital, servico ou assinatura.
 *
 * O equivalente do rastreio para o que nao e transportado: por onde o acesso
 * foi enviado, para quem, quando, e — quando existir — quando foi usado.
 * Espelha `Tracking` de proposito, para que os dois caminhos de entrega tenham
 * a mesma estrutura de procedencia.
 */
export interface DigitalDelivery {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  channel: DeliveryChannel;
  /** Destino do envio: e-mail, telefone ou identificador na plataforma. */
  sentTo?: string | null;
  sentAt?: IsoDateTime | null;
  /** Plataforma ou area de membros em que o produto foi liberado. */
  platform?: string | null;
  /** Primeiro acesso registrado, quando o sistema do cliente informa. */
  firstAccessAt?: IsoDateTime | null;
  accessCount?: number | null;
  source: EvidenceSource;
  sourceProvider?: string | null;
  sourceReference?: string | null;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const EVIDENCE_SOURCES = [
  'MANUAL',
  'API',
  'WEBHOOK',
  'SHOPIFY',
  'TRACKING_PROVIDER',
  'PAYMENT_PROVIDER',
  'ANTIFRAUD',
  'ERP',
  'MERCHANT',
  /** Derived by this system from other evidence; always carries its inputs. */
  'SYSTEM_DERIVED',
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'CONFLICTING',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Result of asking the Evidence Engine "do we have this?". */
export const REQUIREMENT_STATUSES = ['AVAILABLE', 'MISSING', 'PENDING', 'CONFLICTING'] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const EVIDENCE_STRENGTHS = ['STRONG', 'MEDIUM', 'WEAK'] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const EVIDENCE_CATEGORIES = [
  'IDENTITY',
  'TRANSACTION',
  'DELIVERY',
  'TECHNICAL',
  'DOCUMENTATION',
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export const EVIDENCE_TYPES = [
  // Identity
  'CUSTOMER_NAME',
  'CUSTOMER_DOCUMENT',
  'CUSTOMER_EMAIL',
  'CUSTOMER_PHONE',
  'CUSTOMER_ADDRESS',
  'PAYER_NAME_MATCH',
  'PAYER_DOCUMENT_MATCH',
  'PAYER_EMAIL_MATCH',
  'ACCOUNT_CREATED_AT',
  // Transaction
  'TRANSACTION_RECEIPT',
  'END_TO_END_ID',
  'PAYMENT_AUTHORIZATION',
  'ORDER_RECORD',
  'ORDER_PLACED_AT',
  // Technical
  'CHECKOUT_IP',
  'DEVICE_FINGERPRINT',
  'USER_AGENT',
  'SESSION_LOG',
  'ANTIFRAUD_SCORE',
  'TERMS_ACCEPTANCE',
  // Delivery (physical goods)
  'SHIPPING_ADDRESS',
  'CARRIER',
  'TRACKING_CODE',
  'POSTED_AT',
  'TRACKING_EVENTS',
  'DELIVERY_CONFIRMATION',
  'DELIVERED_AT',
  'RECEIVER_NAME',
  'DELIVERY_RECEIPT_SIGNED',
  // Digital delivery
  'ACCESS_DELIVERY_CHANNEL',
  'ACCESS_SENT_TO',
  'ACCESS_SENT_AT',
  'FIRST_ACCESS_AT',
  'ACCESS_LOG',
  'ACCESS_COUNT',
  'CONTENT_CONSUMPTION',
  'DOWNLOAD_LOG',
  'LOGIN_LOG',
  'PASSWORD_CHANGE',
  // Services
  'SERVICE_DESCRIPTION',
  'SERVICE_CONTRACT',
  'SERVICE_ACCEPTANCE',
  'SERVICE_EXECUTION',
  'SERVICE_PROFESSIONAL',
  'SERVICE_SCHEDULE',
  'SERVICE_USAGE_PROOF',
  // Comunicacao reconstruida (comprovante do que foi enviado ao cliente)
  'DELIVERY_COMMUNICATION',
  // Documents / misc
  'INVOICE',
  'COMMUNICATION_HISTORY',
  'REFUND_POLICY',
  'OTHER_DOCUMENT',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export interface Evidence {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  type: EvidenceType;
  /** The factual value. Never populated with a placeholder or guess. */
  value: JsonValue;
  /** Human-readable rendering of `value`, used verbatim in documents. */
  displayValue?: string | null;

  source: EvidenceSource;
  sourceProvider?: string | null;
  sourceReference?: string | null;

  receivedAt: IsoDateTime;
  verifiedAt?: IsoDateTime | null;
  verificationStatus: VerificationStatus;

  documentId?: string | null;
  metadata: Record<string, JsonValue>;

  createdAt: IsoDateTime;
  createdBy?: string | null;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const DOCUMENT_KINDS = [
  'INVOICE',
  'DELIVERY_RECEIPT',
  'TRANSACTION_RECEIPT',
  'CONTRACT',
  'SCREENSHOT',
  'LOG_EXPORT',
  'DEFENSE_REPORT',
  'OTHER',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface StoredDocument {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  kind: DocumentKind;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  checksumSha256?: string | null;
  source: EvidenceSource;
  sourceReference?: string | null;
  uploadedAt: IsoDateTime;
  uploadedBy?: string | null;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const TIMELINE_EVENT_TYPES = [
  'med.opened',
  'med.deadline',
  'transaction.created',
  'payment.approved',
  'order.created',
  'order.in_production',
  'invoice.created',
  'shipment.created',
  'shipment.posted',
  'shipment.in_transit',
  'shipment.out_for_delivery',
  'shipment.delivered',
  'shipment.not_delivered',
  'shipment.returned',
  'access.sent',
  'customer.account_created',
  'customer.first_access',
  'customer.login',
  'customer.download',
  'customer.password_change',
  'service.accepted',
  'service.executed',
  'document.uploaded',
  'other',
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface TimelineEvent {
  type: TimelineEventType;
  occurredAt: IsoDateTime;
  description: string;
  source: EvidenceSource;
  sourceReference?: string | null;
  /** Evidence records that support this event existing. */
  evidenceIds: string[];
  metadata?: Record<string, JsonValue>;
}

// ---------------------------------------------------------------------------
// Claims / Defense
// ---------------------------------------------------------------------------

export interface Claim {
  /** Stable template identifier, e.g. `delivery.delivered`. */
  id: string;
  category: EvidenceCategory;
  /** Factual sentence. Only rendered from evidence that exists. */
  statement: string;
  evidenceIds: string[];
  strength: EvidenceStrength;
}

export interface MissingEvidence {
  type: EvidenceType;
  category: EvidenceCategory;
  necessity: Necessity;
  status: Exclude<RequirementStatus, 'AVAILABLE'>;
  label: string;
  /** Why the defense wants it, in operational terms. */
  rationale: string;
}

export const NECESSITIES = ['REQUIRED', 'RECOMMENDED', 'OPTIONAL'] as const;
export type Necessity = (typeof NECESSITIES)[number];

export const RISK_FLAGS = [
  'NO_DELIVERY_PROOF',
  'DELIVERY_AFTER_MED_OPENED',
  'ADDRESS_MISMATCH',
  'PAYER_DOCUMENT_MISMATCH',
  'PAYER_EMAIL_MISMATCH',
  'CONFLICTING_EVIDENCE',
  'NO_TECHNICAL_EVIDENCE',
  'NO_IDENTITY_EVIDENCE',
  'DEADLINE_NEAR',
  'DEADLINE_PASSED',
  'AMOUNT_MISMATCH',
  'UNVERIFIED_CRITICAL_EVIDENCE',
] as const;
export type RiskFlagCode = (typeof RISK_FLAGS)[number];

export interface RiskFlag {
  code: RiskFlagCode;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  evidenceIds: string[];
}

export interface DefenseScoreComponent {
  category: EvidenceCategory;
  earned: number;
  max: number;
}

export interface DefenseScore {
  total: number;
  max: number;
  components: DefenseScoreComponent[];
}

export interface Defense {
  id: string;
  organizationId: OrganizationId;
  medId: string;
  version: number;
  summary: string;
  claims: Claim[];
  evidenceIds: string[];
  missingEvidences: MissingEvidence[];
  riskFlags: RiskFlag[];
  score: DefenseScore;
  narrative: DefenseNarrative;
  generatedAt: IsoDateTime;
  generatedBy?: string | null;
}

export const NARRATIVE_RENDERERS = ['DETERMINISTIC_TEMPLATE', 'LLM_GUARDED'] as const;
export type NarrativeRenderer = (typeof NARRATIVE_RENDERERS)[number];

export interface DefenseNarrative {
  renderer: NarrativeRenderer;
  language: string;
  body: string;
  /** Set when an LLM draft was rejected by the fact guard and the template was used. */
  guardRejections?: string[];
}

// ---------------------------------------------------------------------------
// Evidence Pack / Submission
// ---------------------------------------------------------------------------

export interface EvidencePack {
  packVersion: string;
  generatedAt: IsoDateTime;
  med: Med;
  transaction: Transaction | null;
  order: Order | null;
  customer: Customer | null;
  tracking: Tracking | null;
  digitalDelivery: DigitalDelivery | null;
  evidences: Evidence[];
  documents: StoredDocument[];
  timeline: TimelineEvent[];
  defense: Defense;
}

export const SUBMISSION_STATUSES = [
  'DRAFT',
  'READY',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'FAILED',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface DefenseSubmission {
  id: string;
  organizationId: OrganizationId;
  defenseId: string;
  medId: string;
  provider: string;
  status: SubmissionStatus;
  payload: JsonValue;
  documentIds: string[];
  submittedAt?: IsoDateTime | null;
  providerReference?: string | null;
  providerResponse?: JsonValue | null;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const AUDIT_ACTIONS = [
  'MED_CREATED',
  'MED_UPDATED',
  'MED_DELETED',
  'MED_STATUS_CHANGED',
  'ORDER_UPSERTED',
  'CUSTOMER_UPSERTED',
  'TRANSACTION_UPSERTED',
  'TRACKING_UPSERTED',
  'EVIDENCE_ADDED',
  'EVIDENCE_UPDATED',
  'DOCUMENT_UPLOADED',
  'DEFENSE_GENERATED',
  'PACK_EXPORTED',
  'SUBMISSION_CREATED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogEntry {
  id: string;
  organizationId: OrganizationId;
  medId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor: string;
  actorRole?: Role | null;
  source: EvidenceSource;
  previousValue?: JsonValue | null;
  newValue?: JsonValue | null;
  occurredAt: IsoDateTime;
}
