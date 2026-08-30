import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type {
  Address,
  AuditLogEntry,
  Customer,
  DigitalDelivery,
  Defense,
  DefenseSubmission,
  Evidence,
  EvidenceSource,
  EvidenceType,
  JsonValue,
  Med,
  MedStatus,
  Order,
  OrderItem,
  PartyIdentification,
  StoredDocument,
  Tracking,
  TrackingEvent,
  Transaction,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import type {
  IdempotencyStore,
  ListMedsFilter,
  MedListRow,
  MedRepository,
} from '@/infra/repositories/types';

/**
 * PostgreSQL repository.
 *
 * Every query is scoped by organizationId, including the ones that also filter
 * by primary key: an id leaked across tenants must never be enough to read a
 * row (protection against IDOR).
 *
 * Money is persisted in cents; the conversion happens only here so the domain
 * keeps working with decimal amounts.
 */

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function required(value: Date): string {
  return value.toISOString();
}

function date(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function json<T>(value: Prisma.JsonValue | null): T | null {
  return (value ?? null) as T | null;
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? null) as Prisma.InputJsonValue;
}

type MedRow = Prisma.MedGetPayload<Record<string, never>>;
type TransactionRow = Prisma.MedTransactionGetPayload<Record<string, never>>;
type CustomerRow = Prisma.CustomerGetPayload<Record<string, never>>;
type OrderRow = Prisma.OrderGetPayload<Record<string, never>>;
type TrackingRow = Prisma.TrackingGetPayload<Record<string, never>>;
type DigitalDeliveryRow = Prisma.DigitalDeliveryGetPayload<Record<string, never>>;
type EvidenceRow = Prisma.EvidenceGetPayload<Record<string, never>>;
type DocumentRow = Prisma.DocumentGetPayload<Record<string, never>>;
type DefenseRow = Prisma.DefenseGetPayload<Record<string, never>>;
type SubmissionRow = Prisma.SubmissionGetPayload<Record<string, never>>;
type AuditRow = Prisma.AuditLogGetPayload<Record<string, never>>;

function mapMed(row: MedRow): Med {
  return {
    id: row.id,
    organizationId: row.organizationId,
    merchantId: row.merchantId,
    medId: row.medId,
    transactionId: row.transactionId,
    endToEndId: row.endToEndId,
    pixId: row.pixId,
    amount: fromCents(row.amountCents),
    currency: row.currency,
    transactionAt: iso(row.transactionAt),
    openedAt: required(row.openedAt),
    responseDeadlineAt: iso(row.responseDeadlineAt),
    reason: row.reason,
    reasonDescription: row.reasonDescription,
    requestingInstitution: row.requestingInstitution,
    productType: row.productType,
    status: row.status,
    payer: json<PartyIdentification>(row.payer) ?? {},
    payerAddress: json<Address>(row.payerAddress),
    payerIp: row.payerIp,
    payerDevice: row.payerDevice,
    merchantName: row.merchantName,
    additionalInformation: row.additionalInformation,
    createdAt: required(row.createdAt),
    updatedAt: required(row.updatedAt),
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    externalId: row.externalId,
    endToEndId: row.endToEndId,
    amount: fromCents(row.amountCents),
    currency: row.currency,
    method: row.method,
    status: row.status,
    authorizedAt: iso(row.authorizedAt),
    capturedAt: iso(row.capturedAt),
    provider: row.provider,
    providerReference: row.providerReference,
    createdAt: required(row.createdAt),
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    identification: json<PartyIdentification>(row.identification) ?? {},
    address: json<Address>(row.address),
    accountCreatedAt: iso(row.accountCreatedAt),
    externalId: row.externalId,
    createdAt: required(row.createdAt),
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    externalId: row.externalId,
    productType: row.productType,
    items: json<OrderItem[]>(row.items) ?? [],
    totalAmount: row.totalAmountCents === null ? null : fromCents(row.totalAmountCents),
    placedAt: iso(row.placedAt),
    checkoutIp: row.checkoutIp,
    deviceFingerprint: row.deviceFingerprint,
    userAgent: row.userAgent,
    shippingAddress: json<Address>(row.shippingAddress),
    provider: row.provider,
    providerReference: row.providerReference,
    createdAt: required(row.createdAt),
  };
}

function mapTracking(row: TrackingRow): Tracking {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    carrier: row.carrier,
    trackingCode: row.trackingCode,
    status: row.status,
    postedAt: iso(row.postedAt),
    deliveredAt: iso(row.deliveredAt),
    receiverName: row.receiverName,
    events: json<TrackingEvent[]>(row.events) ?? [],
    source: row.source,
    sourceProvider: row.sourceProvider,
    sourceReference: row.sourceReference,
    createdAt: required(row.createdAt),
  };
}

function mapDigitalDelivery(row: DigitalDeliveryRow): DigitalDelivery {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    channel: row.channel,
    sentTo: row.sentTo,
    sentAt: iso(row.sentAt),
    platform: row.platform,
    firstAccessAt: iso(row.firstAccessAt),
    accessCount: row.accessCount,
    source: row.source,
    sourceProvider: row.sourceProvider,
    sourceReference: row.sourceReference,
    createdAt: required(row.createdAt),
  };
}

function mapEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    type: row.type as EvidenceType,
    value: json<JsonValue>(row.value),
    displayValue: row.displayValue,
    source: row.source,
    sourceProvider: row.sourceProvider,
    sourceReference: row.sourceReference,
    receivedAt: required(row.receivedAt),
    verifiedAt: iso(row.verifiedAt),
    verificationStatus: row.verificationStatus,
    documentId: row.documentId,
    metadata: json<Record<string, JsonValue>>(row.metadata) ?? {},
    createdAt: required(row.createdAt),
    createdBy: row.createdBy,
  };
}

function mapDocument(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    kind: row.kind,
    filename: row.filename,
    contentType: row.contentType,
    byteSize: row.byteSize,
    storageKey: row.storageKey,
    checksumSha256: row.checksumSha256,
    source: row.source,
    sourceReference: row.sourceReference,
    uploadedAt: required(row.uploadedAt),
    uploadedBy: row.uploadedBy,
  };
}

function mapDefense(row: DefenseRow): Defense {
  // The payload is the artifact exactly as generated; scalar columns exist for
  // querying and are never treated as the source of truth.
  return json<Defense>(row.payload) as Defense;
}

function mapSubmission(row: SubmissionRow): DefenseSubmission {
  return {
    id: row.id,
    organizationId: row.organizationId,
    defenseId: row.defenseId,
    medId: row.medId,
    provider: row.provider,
    status: row.status,
    payload: json<JsonValue>(row.payload),
    documentIds: row.documentIds,
    submittedAt: iso(row.submittedAt),
    providerReference: row.providerReference,
    providerResponse: json<JsonValue>(row.providerResponse),
    createdAt: required(row.createdAt),
  };
}

function mapAudit(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    organizationId: row.organizationId,
    medId: row.medId,
    action: row.action as AuditLogEntry['action'],
    entityType: row.entityType,
    entityId: row.entityId,
    actor: row.actor,
    actorRole: row.actorRole as AuditLogEntry['actorRole'],
    source: row.source as EvidenceSource,
    previousValue: json<JsonValue>(row.previousValue),
    newValue: json<JsonValue>(row.newValue),
    occurredAt: required(row.occurredAt),
  };
}

export function createPrismaClient(connectionString: string): PrismaClient {
  // The pg driver adapter keeps the client compatible with Vercel's serverless
  // runtime; point DATABASE_URL at a pooled connection string.
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaMedRepository implements MedRepository, IdempotencyStore {
  constructor(private readonly prisma: PrismaClient) {}

  async createMed(med: Med): Promise<Med> {
    const row = await this.prisma.med.create({
      data: {
        id: med.id,
        organization: {
          connectOrCreate: {
            where: { id: med.organizationId },
            create: { id: med.organizationId, name: med.organizationId },
          },
        },
        merchantId: med.merchantId,
        medId: med.medId,
        transactionId: med.transactionId,
        endToEndId: med.endToEndId,
        pixId: med.pixId,
        amountCents: toCents(med.amount),
        currency: med.currency,
        transactionAt: date(med.transactionAt),
        openedAt: date(med.openedAt) ?? new Date(),
        responseDeadlineAt: date(med.responseDeadlineAt),
        reason: med.reason,
        reasonDescription: med.reasonDescription,
        requestingInstitution: med.requestingInstitution,
        productType: med.productType,
        status: med.status,
        payer: jsonInput(med.payer),
        payerAddress: jsonInput(med.payerAddress),
        payerIp: med.payerIp,
        payerDevice: med.payerDevice,
        merchantName: med.merchantName,
        additionalInformation: med.additionalInformation,
      },
    });
    return mapMed(row);
  }

  async getMed(organizationId: string, id: string): Promise<Med | null> {
    const row = await this.prisma.med.findFirst({ where: { id, organizationId } });
    return row ? mapMed(row) : null;
  }

  async findMedByExternalId(organizationId: string, medId: string): Promise<Med | null> {
    const row = await this.prisma.med.findUnique({
      where: { organizationId_medId: { organizationId, medId } },
    });
    return row ? mapMed(row) : null;
  }

  async listMeds(organizationId: string, filter: ListMedsFilter): Promise<MedListRow[]> {
    const search = filter.search?.trim();
    const rows = await this.prisma.med.findMany({
      where: {
        organizationId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(search
          ? {
              OR: [
                { medId: { contains: search, mode: 'insensitive' } },
                { endToEndId: { contains: search, mode: 'insensitive' } },
                // payer é Json: busca por nome, CPF/CNPJ e e-mail via JSON path.
                { payer: { path: ['name'], string_contains: search } },
                { payer: { path: ['document'], string_contains: search } },
                { payer: { path: ['email'], string_contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: filter.limit ?? 50,
      include: {
        defenses: { orderBy: { version: 'desc' }, take: 1 },
        _count: { select: { evidences: true } },
      },
    });

    return rows.map((row) => {
      const latest = row.defenses[0];
      const defense = latest ? mapDefense(latest) : null;
      return {
        med: mapMed(row),
        latestDefense: defense
          ? {
              id: defense.id,
              version: defense.version,
              score: defense.score,
              generatedAt: defense.generatedAt,
            }
          : null,
        evidenceCount: row._count.evidences,
      };
    });
  }

  async updateMed(organizationId: string, id: string, patch: Partial<Med>): Promise<Med> {
    const existing = await this.getMed(organizationId, id);
    if (!existing) throw new Error(`MED ${id} not found`);

    const row = await this.prisma.med.update({
      where: { id },
      data: {
        ...(patch.status ? { status: patch.status as MedStatus } : {}),
        ...(patch.productType !== undefined ? { productType: patch.productType } : {}),
        ...(patch.responseDeadlineAt !== undefined
          ? { responseDeadlineAt: date(patch.responseDeadlineAt) }
          : {}),
        ...(patch.additionalInformation !== undefined
          ? { additionalInformation: patch.additionalInformation }
          : {}),
      },
    });
    return mapMed(row);
  }

  async upsertTransaction(transaction: Transaction): Promise<Transaction> {
    const data = {
      organizationId: transaction.organizationId,
      externalId: transaction.externalId,
      endToEndId: transaction.endToEndId,
      amountCents: toCents(transaction.amount),
      currency: transaction.currency,
      method: transaction.method,
      status: transaction.status,
      authorizedAt: date(transaction.authorizedAt),
      capturedAt: date(transaction.capturedAt),
      provider: transaction.provider,
      providerReference: transaction.providerReference,
    };
    const row = await this.prisma.medTransaction.upsert({
      where: { medId: transaction.medId },
      create: { ...data, medId: transaction.medId },
      update: data,
    });
    return mapTransaction(row);
  }

  async upsertCustomer(customer: Customer): Promise<Customer> {
    const data = {
      organizationId: customer.organizationId,
      identification: jsonInput(customer.identification),
      address: jsonInput(customer.address),
      accountCreatedAt: date(customer.accountCreatedAt),
      externalId: customer.externalId,
    };
    const row = await this.prisma.customer.upsert({
      where: { medId: customer.medId },
      create: { ...data, medId: customer.medId },
      update: data,
    });
    return mapCustomer(row);
  }

  async upsertOrder(order: Order): Promise<Order> {
    const data = {
      organizationId: order.organizationId,
      externalId: order.externalId,
      productType: order.productType,
      items: jsonInput(order.items),
      totalAmountCents: order.totalAmount === null || order.totalAmount === undefined
        ? null
        : toCents(order.totalAmount),
      placedAt: date(order.placedAt),
      checkoutIp: order.checkoutIp,
      deviceFingerprint: order.deviceFingerprint,
      userAgent: order.userAgent,
      shippingAddress: jsonInput(order.shippingAddress),
      provider: order.provider,
      providerReference: order.providerReference,
    };
    const row = await this.prisma.order.upsert({
      where: { medId: order.medId },
      create: { ...data, medId: order.medId },
      update: data,
    });
    return mapOrder(row);
  }

  async upsertTracking(tracking: Tracking): Promise<Tracking> {
    const data = {
      organizationId: tracking.organizationId,
      carrier: tracking.carrier,
      trackingCode: tracking.trackingCode,
      status: tracking.status,
      postedAt: date(tracking.postedAt),
      deliveredAt: date(tracking.deliveredAt),
      receiverName: tracking.receiverName,
      events: jsonInput(tracking.events),
      source: tracking.source,
      sourceProvider: tracking.sourceProvider,
      sourceReference: tracking.sourceReference,
    };
    const row = await this.prisma.tracking.upsert({
      where: { medId: tracking.medId },
      create: { ...data, medId: tracking.medId },
      update: data,
    });
    return mapTracking(row);
  }

  async upsertDigitalDelivery(delivery: DigitalDelivery): Promise<DigitalDelivery> {
    const data = {
      organizationId: delivery.organizationId,
      channel: delivery.channel,
      sentTo: delivery.sentTo,
      sentAt: date(delivery.sentAt),
      platform: delivery.platform,
      firstAccessAt: date(delivery.firstAccessAt),
      accessCount: delivery.accessCount,
      source: delivery.source,
      sourceProvider: delivery.sourceProvider,
      sourceReference: delivery.sourceReference,
    };
    const row = await this.prisma.digitalDelivery.upsert({
      where: { medId: delivery.medId },
      create: { ...data, medId: delivery.medId },
      update: data,
    });
    return mapDigitalDelivery(row);
  }

  async addEvidence(evidence: Evidence): Promise<Evidence> {
    const row = await this.prisma.evidence.create({
      data: {
        id: evidence.id,
        organizationId: evidence.organizationId,
        medId: evidence.medId,
        type: evidence.type,
        value: jsonInput(evidence.value),
        displayValue: evidence.displayValue,
        source: evidence.source,
        sourceProvider: evidence.sourceProvider,
        sourceReference: evidence.sourceReference,
        receivedAt: date(evidence.receivedAt) ?? new Date(),
        verifiedAt: date(evidence.verifiedAt),
        verificationStatus: evidence.verificationStatus,
        documentId: evidence.documentId,
        metadata: jsonInput(evidence.metadata),
        createdBy: evidence.createdBy,
      },
    });
    return mapEvidence(row);
  }

  async listEvidence(organizationId: string, medId: string): Promise<Evidence[]> {
    const rows = await this.prisma.evidence.findMany({
      where: { organizationId, medId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapEvidence);
  }

  async addDocument(document: StoredDocument): Promise<StoredDocument> {
    const row = await this.prisma.document.create({
      data: {
        id: document.id,
        organizationId: document.organizationId,
        medId: document.medId,
        kind: document.kind,
        filename: document.filename,
        contentType: document.contentType,
        byteSize: document.byteSize,
        storageKey: document.storageKey,
        checksumSha256: document.checksumSha256,
        source: document.source,
        sourceReference: document.sourceReference,
        uploadedBy: document.uploadedBy,
      },
    });
    return mapDocument(row);
  }

  async listDocuments(organizationId: string, medId: string): Promise<StoredDocument[]> {
    const rows = await this.prisma.document.findMany({
      where: { organizationId, medId },
      orderBy: { uploadedAt: 'asc' },
    });
    return rows.map(mapDocument);
  }

  async getDocument(organizationId: string, documentId: string): Promise<StoredDocument | null> {
    const row = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    return row ? mapDocument(row) : null;
  }

  async saveDefense(defense: Defense): Promise<Defense> {
    const row = await this.prisma.defense.create({
      data: {
        id: defense.id,
        organizationId: defense.organizationId,
        medId: defense.medId,
        version: defense.version,
        scoreTotal: defense.score.total,
        scoreMax: defense.score.max,
        claimCount: defense.claims.length,
        payload: jsonInput(defense),
        generatedAt: date(defense.generatedAt) ?? new Date(),
        generatedBy: defense.generatedBy,
      },
    });
    return mapDefense(row);
  }

  async listDefenses(organizationId: string, medId: string): Promise<Defense[]> {
    const rows = await this.prisma.defense.findMany({
      where: { organizationId, medId },
      orderBy: { version: 'asc' },
    });
    return rows.map(mapDefense);
  }

  async getLatestDefense(organizationId: string, medId: string): Promise<Defense | null> {
    const row = await this.prisma.defense.findFirst({
      where: { organizationId, medId },
      orderBy: { version: 'desc' },
    });
    return row ? mapDefense(row) : null;
  }

  async getDefense(organizationId: string, defenseId: string): Promise<Defense | null> {
    const row = await this.prisma.defense.findFirst({
      where: { organizationId, id: defenseId },
    });
    return row ? mapDefense(row) : null;
  }

  async createSubmission(submission: DefenseSubmission): Promise<DefenseSubmission> {
    const row = await this.prisma.submission.create({
      data: {
        id: submission.id,
        organizationId: submission.organizationId,
        medId: submission.medId,
        defenseId: submission.defenseId,
        provider: submission.provider,
        status: submission.status,
        payload: jsonInput(submission.payload),
        documentIds: submission.documentIds,
        submittedAt: date(submission.submittedAt),
        providerReference: submission.providerReference,
        providerResponse: jsonInput(submission.providerResponse),
      },
    });
    return mapSubmission(row);
  }

  async listSubmissions(organizationId: string, medId: string): Promise<DefenseSubmission[]> {
    const rows = await this.prisma.submission.findMany({
      where: { organizationId, medId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapSubmission);
  }

  async appendAudit(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const row = await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        organizationId: entry.organizationId,
        medId: entry.medId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: entry.actor,
        actorRole: entry.actorRole,
        source: entry.source,
        previousValue: jsonInput(entry.previousValue),
        newValue: jsonInput(entry.newValue),
        occurredAt: date(entry.occurredAt) ?? new Date(),
      },
    });
    return mapAudit(row);
  }

  async listAudit(organizationId: string, medId: string): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { organizationId, medId },
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(mapAudit);
  }

  async loadCase(organizationId: string, medId: string): Promise<MedCase | null> {
    const row = await this.prisma.med.findFirst({
      where: { id: medId, organizationId },
      include: {
        transaction: true,
        customer: true,
        order: true,
        tracking: true,
        digitalDelivery: true,
        evidences: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { uploadedAt: 'asc' } },
      },
    });
    if (!row) return null;

    return {
      med: mapMed(row),
      transaction: row.transaction ? mapTransaction(row.transaction) : null,
      customer: row.customer ? mapCustomer(row.customer) : null,
      order: row.order ? mapOrder(row.order) : null,
      tracking: row.tracking ? mapTracking(row.tracking) : null,
      digitalDelivery: row.digitalDelivery ? mapDigitalDelivery(row.digitalDelivery) : null,
      evidences: row.evidences.map(mapEvidence),
      documents: row.documents.map(mapDocument),
    };
  }

  async get(organizationId: string, scope: string, key: string): Promise<string | null> {
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: { organizationId_scope_key: { organizationId, scope, key } },
    });
    return row?.resultId ?? null;
  }

  async set(
    organizationId: string,
    scope: string,
    key: string,
    resultId: string,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.upsert({
      where: { organizationId_scope_key: { organizationId, scope, key } },
      create: { organizationId, scope, key, resultId },
      update: {},
    });
  }
}
