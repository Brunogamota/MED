import type {
  Customer,
  Evidence,
  EvidenceSource,
  EvidenceType,
  Med,
  Order,
  StoredDocument,
  Tracking,
  Transaction,
  VerificationStatus,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';

const ORG = 'org_test';
const MED_PK = 'med_pk_1';

export function makeMed(overrides: Partial<Med> = {}): Med {
  return {
    id: MED_PK,
    organizationId: ORG,
    merchantId: 'merchant_1',
    medId: 'MED-2026-0001',
    transactionId: 'TX-991',
    endToEndId: 'E12345678202608101432abcdef01',
    pixId: null,
    amount: 349.9,
    currency: 'BRL',
    transactionAt: '2026-08-10T17:32:00.000Z',
    openedAt: '2026-08-20T12:00:00.000Z',
    responseDeadlineAt: '2026-09-05T12:00:00.000Z',
    reason: 'PRODUCT_NOT_RECEIVED',
    reasonDescription: null,
    requestingInstitution: 'Banco Exemplo S.A.',
    productType: 'PHYSICAL',
    status: 'RECEIVED',
    payer: {
      document: '12345678909',
      name: 'Maria Souza',
      email: 'maria@example.com',
      phone: '11988887777',
    },
    payerAddress: null,
    payerIp: null,
    payerDevice: null,
    merchantName: 'Loja Exemplo',
    additionalInformation: null,
    createdAt: '2026-08-20T12:00:05.000Z',
    updatedAt: '2026-08-20T12:00:05.000Z',
    ...overrides,
  };
}

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx_1',
    organizationId: ORG,
    medId: MED_PK,
    externalId: 'TX-991',
    endToEndId: 'E12345678202608101432abcdef01',
    amount: 349.9,
    currency: 'BRL',
    method: 'PIX',
    status: 'APPROVED',
    authorizedAt: '2026-08-10T17:32:10.000Z',
    capturedAt: '2026-08-10T17:32:10.000Z',
    provider: 'pagarme',
    providerReference: 'ch_abc123456',
    createdAt: '2026-08-10T17:32:00.000Z',
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cus_1',
    organizationId: ORG,
    medId: MED_PK,
    identification: {
      document: '12345678909',
      name: 'Maria Souza',
      email: 'maria@example.com',
      phone: '11988887777',
    },
    address: {
      street: 'Rua das Flores',
      number: '100',
      district: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001000',
      country: 'BR',
    },
    accountCreatedAt: '2025-02-11T10:00:00.000Z',
    externalId: 'shopify_cus_55',
    createdAt: '2026-08-20T12:05:00.000Z',
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_1',
    organizationId: ORG,
    medId: MED_PK,
    externalId: 'PED-88231',
    productType: 'PHYSICAL',
    items: [{ name: 'Tenis Runner X', sku: 'TRX-42', quantity: 1, unitAmount: 349.9 }],
    totalAmount: 349.9,
    placedAt: '2026-08-10T17:32:00.000Z',
    checkoutIp: '200.150.10.25',
    deviceFingerprint: 'df_9f8e7d6c5b4a',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)',
    shippingAddress: {
      street: 'Rua das Flores',
      number: '100',
      district: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001000',
      country: 'BR',
    },
    provider: 'shopify',
    providerReference: 'gid://shopify/Order/88231',
    createdAt: '2026-08-20T12:05:00.000Z',
    ...overrides,
  };
}

export function makeTracking(overrides: Partial<Tracking> = {}): Tracking {
  return {
    id: 'trk_1',
    organizationId: ORG,
    medId: MED_PK,
    carrier: 'Correios',
    trackingCode: 'AA123456789BR',
    status: 'DELIVERED',
    postedAt: '2026-08-11T19:42:00.000Z',
    deliveredAt: '2026-08-14T16:17:00.000Z',
    receiverName: 'Maria Souza',
    events: [
      {
        occurredAt: '2026-08-11T19:42:00.000Z',
        status: 'POSTED',
        description: 'Objeto postado',
        location: 'Sao Paulo/SP',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'AA123456789BR',
      },
      {
        occurredAt: '2026-08-14T16:17:00.000Z',
        status: 'DELIVERED',
        description: 'Objeto entregue ao destinatario',
        location: 'Sao Paulo/SP',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'AA123456789BR',
      },
    ],
    source: 'TRACKING_PROVIDER',
    sourceProvider: 'correios',
    sourceReference: 'AA123456789BR',
    createdAt: '2026-08-20T12:10:00.000Z',
    ...overrides,
  };
}

export function makeDocument(overrides: Partial<StoredDocument> = {}): StoredDocument {
  return {
    id: 'doc_1',
    organizationId: ORG,
    medId: MED_PK,
    kind: 'INVOICE',
    filename: 'nfe-88231.pdf',
    contentType: 'application/pdf',
    byteSize: 12345,
    storageKey: 'org_test/med_pk_1/doc_1',
    checksumSha256: null,
    source: 'MERCHANT',
    sourceReference: 'NFe 000.088.231',
    uploadedAt: '2026-08-20T12:20:00.000Z',
    uploadedBy: 'analyst@example.com',
    ...overrides,
  };
}

export function makeEvidence(
  type: EvidenceType,
  value: Evidence['value'],
  overrides: Partial<Evidence> = {},
): Evidence {
  const source: EvidenceSource = overrides.source ?? 'MANUAL';
  const verificationStatus: VerificationStatus = overrides.verificationStatus ?? 'UNVERIFIED';
  return {
    id: `ev_${type.toLowerCase()}`,
    organizationId: ORG,
    medId: MED_PK,
    type,
    value,
    displayValue: typeof value === 'string' ? value : null,
    source,
    sourceProvider: null,
    sourceReference: null,
    receivedAt: '2026-08-20T12:30:00.000Z',
    verifiedAt: null,
    verificationStatus,
    documentId: null,
    metadata: {},
    createdAt: '2026-08-20T12:30:00.000Z',
    createdBy: 'analyst@example.com',
    ...overrides,
  };
}

/** A well-documented physical-goods case: delivered, invoiced, identity matched. */
export function makeCompleteCase(): MedCase {
  return {
    med: makeMed(),
    transaction: makeTransaction(),
    customer: makeCustomer(),
    order: makeOrder(),
    tracking: makeTracking(),
    digitalDelivery: null,
    evidences: [],
    documents: [makeDocument()],
  };
}

/** A bare MED with nothing collected yet. */
export function makeEmptyCase(): MedCase {
  return {
    med: makeMed(),
    transaction: null,
    customer: null,
    order: null,
    tracking: null,
    digitalDelivery: null,
    evidences: [],
    documents: [],
  };
}
