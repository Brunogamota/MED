import type {
  Evidence,
  EvidenceSource,
  EvidenceType,
  IsoDateTime,
  JsonValue,
  VerificationStatus,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { formatAddress } from '@/lib/format';

/**
 * Derived evidence.
 *
 * The structured records a case already holds (transaction, order, customer,
 * tracking, documents) contain facts that the Evidence Engine needs to see as
 * evidence. Projecting them is not invention: the value is copied verbatim and
 * keeps the provenance of the record it came from, with `metadata.derivedFrom`
 * naming the exact origin so the chain stays auditable.
 *
 * Comparison results (payer vs. buyer) are the one case where this system is
 * itself the source; those are marked SYSTEM_DERIVED and carry both inputs.
 *
 * Nothing is emitted when the underlying value is absent.
 */

type Draft = {
  type: EvidenceType;
  value: JsonValue;
  displayValue?: string | null;
  source: EvidenceSource;
  sourceProvider?: string | null;
  sourceReference?: string | null;
  receivedAt: IsoDateTime;
  metadata: Record<string, JsonValue>;
};

/**
 * Machine-sourced data that carries a reference back to its system of record is
 * treated as VERIFIED: it can be re-fetched and re-checked at any time. Manual
 * entries and referenceless payloads stay UNVERIFIED until someone confirms them.
 */
function verificationFor(source: EvidenceSource, reference: string | null | undefined): VerificationStatus {
  if (source === 'MANUAL') return 'UNVERIFIED';
  return reference ? 'VERIFIED' : 'UNVERIFIED';
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function deriveEvidence(medCase: MedCase, now: Date = new Date()): Evidence[] {
  const { med, transaction, customer, order, tracking, digitalDelivery, documents } = medCase;
  const drafts: Draft[] = [];
  const receivedAt = now.toISOString();

  const add = (draft: Draft | null) => {
    if (draft) drafts.push(draft);
  };

  // --- Transaction ---------------------------------------------------------
  if (transaction) {
    const source: EvidenceSource = transaction.provider ? 'PAYMENT_PROVIDER' : 'MANUAL';
    const reference = transaction.providerReference ?? transaction.externalId ?? null;
    const base = {
      source,
      sourceProvider: transaction.provider ?? null,
      sourceReference: reference,
      receivedAt: transaction.createdAt,
      metadata: { derivedFrom: `transaction:${transaction.id}` } as Record<string, JsonValue>,
    };
    const endToEnd = transaction.endToEndId ?? med.endToEndId;
    if (endToEnd) add({ ...base, type: 'END_TO_END_ID', value: endToEnd });
    if (reference) add({ ...base, type: 'TRANSACTION_RECEIPT', value: reference });
    if (transaction.authorizedAt) {
      add({
        ...base,
        type: 'PAYMENT_AUTHORIZATION',
        value: reference ?? transaction.id,
        displayValue: reference ?? transaction.id,
      });
    }
  } else if (med.endToEndId) {
    add({
      type: 'END_TO_END_ID',
      value: med.endToEndId,
      source: 'WEBHOOK',
      sourceProvider: med.requestingInstitution ?? null,
      sourceReference: med.medId,
      receivedAt: med.createdAt,
      metadata: { derivedFrom: `med:${med.id}` },
    });
  }

  // --- Order ---------------------------------------------------------------
  if (order) {
    const source: EvidenceSource = order.provider ? 'API' : 'MANUAL';
    const reference = order.providerReference ?? order.externalId ?? null;
    const base = {
      source,
      sourceProvider: order.provider ?? null,
      sourceReference: reference,
      receivedAt: order.createdAt,
      metadata: { derivedFrom: `order:${order.id}` } as Record<string, JsonValue>,
    };
    add({ ...base, type: 'ORDER_RECORD', value: reference ?? order.id });
    if (order.placedAt) add({ ...base, type: 'ORDER_PLACED_AT', value: order.placedAt });
    if (order.checkoutIp) add({ ...base, type: 'CHECKOUT_IP', value: order.checkoutIp });
    if (order.deviceFingerprint) {
      add({ ...base, type: 'DEVICE_FINGERPRINT', value: order.deviceFingerprint });
    }
    if (order.userAgent) add({ ...base, type: 'USER_AGENT', value: order.userAgent });
    const shipping = formatAddress(order.shippingAddress);
    if (shipping) {
      add({
        ...base,
        type: 'SHIPPING_ADDRESS',
        value: order.shippingAddress as unknown as JsonValue,
        displayValue: shipping,
      });
    }
  }

  // --- Customer ------------------------------------------------------------
  if (customer) {
    const base = {
      source: 'MERCHANT' as EvidenceSource,
      sourceProvider: null,
      sourceReference: customer.externalId ?? null,
      receivedAt: customer.createdAt,
      metadata: { derivedFrom: `customer:${customer.id}` } as Record<string, JsonValue>,
    };
    const identification = customer.identification;
    if (identification.name) add({ ...base, type: 'CUSTOMER_NAME', value: identification.name });
    if (identification.document) {
      add({ ...base, type: 'CUSTOMER_DOCUMENT', value: identification.document });
    }
    if (identification.email) add({ ...base, type: 'CUSTOMER_EMAIL', value: identification.email });
    if (identification.phone) add({ ...base, type: 'CUSTOMER_PHONE', value: identification.phone });
    if (customer.accountCreatedAt) {
      add({ ...base, type: 'ACCOUNT_CREATED_AT', value: customer.accountCreatedAt });
    }
    const address = formatAddress(customer.address);
    if (address) {
      add({
        ...base,
        type: 'CUSTOMER_ADDRESS',
        value: customer.address as unknown as JsonValue,
        displayValue: address,
      });
    }
  }

  // --- Tracking ------------------------------------------------------------
  if (tracking) {
    const base = {
      source: tracking.source,
      sourceProvider: tracking.sourceProvider ?? tracking.carrier ?? null,
      sourceReference: tracking.sourceReference ?? tracking.trackingCode ?? null,
      receivedAt: tracking.createdAt,
      metadata: { derivedFrom: `tracking:${tracking.id}` } as Record<string, JsonValue>,
    };
    if (tracking.trackingCode) {
      add({ ...base, type: 'TRACKING_CODE', value: tracking.trackingCode });
    }
    if (tracking.carrier) add({ ...base, type: 'CARRIER', value: tracking.carrier });
    if (tracking.postedAt) add({ ...base, type: 'POSTED_AT', value: tracking.postedAt });
    if (tracking.events.length > 0) {
      add({
        ...base,
        type: 'TRACKING_EVENTS',
        value: tracking.events as unknown as JsonValue,
        displayValue: `${tracking.events.length} evento(s) de rastreamento`,
      });
    }
    // Confirmacao de entrega so existe quando o status e entregue E ha data.
    // Status sem data nao vira comprovacao de entrega.
    if (tracking.status === 'DELIVERED' && tracking.deliveredAt) {
      add({
        ...base,
        type: 'DELIVERY_CONFIRMATION',
        value: tracking.trackingCode ?? tracking.id,
        displayValue: tracking.trackingCode
          ? `Entrega confirmada pelo rastreio ${tracking.trackingCode}`
          : 'Entrega confirmada pelo registro de expedicao',
      });
      add({ ...base, type: 'DELIVERED_AT', value: tracking.deliveredAt });
    }
    if (tracking.receiverName) {
      add({ ...base, type: 'RECEIVER_NAME', value: tracking.receiverName });
    }
  }

  // --- Entrega digital -----------------------------------------------------
  if (digitalDelivery) {
    const base = {
      source: digitalDelivery.source,
      sourceProvider: digitalDelivery.sourceProvider ?? digitalDelivery.platform ?? null,
      sourceReference: digitalDelivery.sourceReference ?? null,
      receivedAt: digitalDelivery.createdAt,
      metadata: { derivedFrom: `digitalDelivery:${digitalDelivery.id}` } as Record<string, JsonValue>,
    };
    add({ ...base, type: 'ACCESS_DELIVERY_CHANNEL', value: digitalDelivery.channel });
    if (digitalDelivery.sentTo) {
      add({ ...base, type: 'ACCESS_SENT_TO', value: digitalDelivery.sentTo });
    }
    if (digitalDelivery.sentAt) {
      add({ ...base, type: 'ACCESS_SENT_AT', value: digitalDelivery.sentAt });
    }
    if (digitalDelivery.firstAccessAt) {
      add({ ...base, type: 'FIRST_ACCESS_AT', value: digitalDelivery.firstAccessAt });
    }
    if (typeof digitalDelivery.accessCount === 'number') {
      add({
        ...base,
        type: 'ACCESS_COUNT',
        value: digitalDelivery.accessCount,
        displayValue: String(digitalDelivery.accessCount),
      });
    }
  }

  // --- Documents -----------------------------------------------------------
  for (const document of documents) {
    if (document.kind === 'INVOICE') {
      add({
        type: 'INVOICE',
        value: document.filename,
        displayValue: document.filename,
        source: document.source,
        sourceReference: document.sourceReference ?? document.id,
        receivedAt: document.uploadedAt,
        metadata: { derivedFrom: `document:${document.id}` },
      });
    }
    if (document.kind === 'DELIVERY_RECEIPT') {
      add({
        type: 'DELIVERY_RECEIPT_SIGNED',
        value: document.filename,
        displayValue: document.filename,
        source: document.source,
        sourceReference: document.sourceReference ?? document.id,
        receivedAt: document.uploadedAt,
        metadata: { derivedFrom: `document:${document.id}` },
      });
    }
    if (document.kind === 'CONTRACT') {
      add({
        type: 'SERVICE_CONTRACT',
        value: document.filename,
        displayValue: document.filename,
        source: document.source,
        sourceReference: document.sourceReference ?? document.id,
        receivedAt: document.uploadedAt,
        metadata: { derivedFrom: `document:${document.id}` },
      });
    }
  }

  // --- Comparisons (this system is the source) -----------------------------
  const payerDocument = digitsOnly(med.payer.document);
  const buyerDocument = digitsOnly(customer?.identification.document);
  if (payerDocument && buyerDocument && payerDocument === buyerDocument) {
    add({
      type: 'PAYER_DOCUMENT_MATCH',
      value: true,
      displayValue: 'Documento do pagador confere com o do pedido',
      source: 'SYSTEM_DERIVED',
      sourceReference: `med:${med.id}|customer:${customer?.id ?? ''}`,
      receivedAt,
      metadata: {
        comparison: 'document',
        medPayerDocument: med.payer.document ?? null,
        orderCustomerDocument: customer?.identification.document ?? null,
      },
    });
  }

  const payerEmail = med.payer.email?.trim().toLowerCase();
  const buyerEmail = customer?.identification.email?.trim().toLowerCase();
  if (payerEmail && buyerEmail && payerEmail === buyerEmail) {
    add({
      type: 'PAYER_EMAIL_MATCH',
      value: true,
      displayValue: 'E-mail do pagador confere com o do pedido',
      source: 'SYSTEM_DERIVED',
      sourceReference: `med:${med.id}|customer:${customer?.id ?? ''}`,
      receivedAt,
      metadata: { comparison: 'email' },
    });
  }

  const payerName = med.payer.name ? normalizeName(med.payer.name) : null;
  const buyerName = customer?.identification.name
    ? normalizeName(customer.identification.name)
    : null;
  if (payerName && buyerName && payerName === buyerName) {
    add({
      type: 'PAYER_NAME_MATCH',
      value: true,
      displayValue: 'Nome do pagador confere com o do pedido',
      source: 'SYSTEM_DERIVED',
      sourceReference: `med:${med.id}|customer:${customer?.id ?? ''}`,
      receivedAt,
      metadata: { comparison: 'name' },
    });
  }

  return drafts.map((draft) => ({
    id: `derived:${draft.type}:${med.id}`,
    organizationId: med.organizationId,
    medId: med.id,
    type: draft.type,
    value: draft.value,
    displayValue: draft.displayValue ?? (typeof draft.value === 'string' ? draft.value : null),
    source: draft.source,
    sourceProvider: draft.sourceProvider ?? null,
    sourceReference: draft.sourceReference ?? null,
    receivedAt: draft.receivedAt,
    verifiedAt: null,
    verificationStatus: verificationFor(draft.source, draft.sourceReference),
    documentId: null,
    metadata: draft.metadata,
    createdAt: receivedAt,
    createdBy: 'system:derive',
  }));
}

/**
 * Explicitly recorded evidence always wins over a derived projection of the
 * same fact, so an analyst correction is never silently overwritten.
 */
export function mergeEvidence(stored: Evidence[], derived: Evidence[]): Evidence[] {
  const storedTypes = new Set(stored.map((evidence) => evidence.type));
  return [...stored, ...derived.filter((evidence) => !storedTypes.has(evidence.type))];
}
