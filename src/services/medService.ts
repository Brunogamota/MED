import type {
  Customer,
  Defense,
  DefenseSubmission,
  Evidence,
  Med,
  MedStatus,
  Order,
  StoredDocument,
  Tracking,
  Transaction,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import type { AuthContext } from '@/infra/auth/context';
import { assertCan } from '@/infra/auth/rbac';
import { getRepository, type Repository } from '@/infra/container';
import type { ListMedsFilter, MedListRow } from '@/infra/repositories/types';
import { recordAudit } from '@/services/audit';
import { ConflictError, NotFoundError } from '@/services/errors';
import { newId } from '@/lib/ids';
import { toJson } from '@/lib/json';
import type {
  CreateDocumentInput,
  CreateEvidenceInput,
  CreateMedInput,
  CreateSubmissionInput,
  UpdateMedInput,
  UpsertCustomerInput,
  UpsertOrderInput,
  UpsertTrackingInput,
  UpsertTransactionInput,
} from '@/domain/schemas';
import { generateDefense, resolveProductType } from '@/domain/defense/engine';
import { assessEvidence } from '@/domain/evidence/engine';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { buildEvidencePack } from '@/domain/pack/builder';
import { renderNarrativeWithLlm } from '@/domain/llm/narrator';
import type { EvidencePack } from '@/domain/types';

/**
 * Application services.
 *
 * These orchestrate persistence, authorisation and the pure domain engines.
 * All business rules about evidence live in the domain; this layer decides what
 * gets written, what gets audited and what the resulting MED status is.
 */

async function loadCaseOrThrow(
  repository: Repository,
  auth: AuthContext,
  medId: string,
): Promise<MedCase> {
  const medCase = await repository.loadCase(auth.organizationId, medId);
  if (!medCase) throw new NotFoundError(`MED ${medId} nao encontrado`);
  return medCase;
}

/** Statuses the system will not overwrite automatically. */
const TERMINAL_STATUSES: MedStatus[] = ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

/**
 * Derives the collection status from the evidence actually present. Never moves
 * a MED out of a terminal state and never claims readiness the evidence does
 * not support.
 */
export function deriveStatus(medCase: MedCase, hasDefense: boolean): MedStatus {
  if (TERMINAL_STATUSES.includes(medCase.med.status)) return medCase.med.status;

  const evidences = mergeEvidence(medCase.evidences, deriveEvidence(medCase));
  const assessment = assessEvidence({
    productType: resolveProductType(medCase),
    reason: medCase.med.reason,
    evidences,
  });

  const missingRequired = assessment.missingEvidences.some(
    (missing) => missing.necessity === 'REQUIRED',
  );

  if (hasDefense) return missingRequired ? 'DEFENSE_GENERATED' : 'READY_TO_SUBMIT';
  if (missingRequired) return 'MISSING_EVIDENCE';
  return 'READY_TO_GENERATE';
}

async function refreshStatus(
  repository: Repository,
  auth: AuthContext,
  medId: string,
): Promise<void> {
  const medCase = await loadCaseOrThrow(repository, auth, medId);
  const latestDefense = await repository.getLatestDefense(auth.organizationId, medId);
  const next = deriveStatus(medCase, latestDefense !== null);
  if (next === medCase.med.status) return;

  await repository.updateMed(auth.organizationId, medId, { status: next });
  await recordAudit(repository, auth, {
    action: 'MED_STATUS_CHANGED',
    entityType: 'Med',
    entityId: medId,
    medId,
    previousValue: medCase.med.status,
    newValue: next,
  });
}

export async function createMed(auth: AuthContext, input: CreateMedInput): Promise<Med> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();

  // Idempotent by the institution's own MED identifier: replaying a webhook
  // returns the existing case instead of creating a duplicate.
  const existing = await repository.findMedByExternalId(auth.organizationId, input.medId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const med: Med = {
    id: newId('med'),
    organizationId: auth.organizationId,
    merchantId: input.merchantId ?? null,
    medId: input.medId,
    transactionId: input.transactionId ?? null,
    endToEndId: input.endToEndId ?? null,
    pixId: input.pixId ?? null,
    amount: input.amount,
    currency: input.currency,
    transactionAt: input.transactionAt ?? null,
    openedAt: input.openedAt,
    responseDeadlineAt: input.responseDeadlineAt ?? null,
    reason: input.reason,
    reasonDescription: input.reasonDescription ?? null,
    requestingInstitution: input.requestingInstitution ?? null,
    productType: input.productType ?? null,
    status: 'RECEIVED',
    payer: input.payer,
    payerAddress: input.payerAddress ?? null,
    payerIp: input.payerIp ?? null,
    payerDevice: input.payerDevice ?? null,
    merchantName: input.merchantName ?? null,
    additionalInformation: input.additionalInformation ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const created = await repository.createMed(med);
  await recordAudit(repository, auth, {
    action: 'MED_CREATED',
    entityType: 'Med',
    entityId: created.id,
    medId: created.id,
    newValue: created.medId,
  });
  await refreshStatus(repository, auth, created.id);
  return (await repository.getMed(auth.organizationId, created.id)) ?? created;
}

export async function listMeds(
  auth: AuthContext,
  filter: ListMedsFilter,
): Promise<MedListRow[]> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  return repository.listMeds(auth.organizationId, filter);
}

export async function getCase(auth: AuthContext, medId: string): Promise<MedCase> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  return loadCaseOrThrow(repository, auth, medId);
}

export async function updateMed(
  auth: AuthContext,
  medId: string,
  input: UpdateMedInput,
): Promise<Med> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();
  const current = await repository.getMed(auth.organizationId, medId);
  if (!current) throw new NotFoundError(`MED ${medId} nao encontrado`);

  const updated = await repository.updateMed(auth.organizationId, medId, input);
  await recordAudit(repository, auth, {
    action: 'MED_UPDATED',
    entityType: 'Med',
    entityId: medId,
    medId,
    previousValue: toJson({ productType: current.productType, status: current.status }),
    newValue: toJson({ productType: updated.productType, status: updated.status }),
  });
  await refreshStatus(repository, auth, medId);
  return (await repository.getMed(auth.organizationId, medId)) ?? updated;
}

export async function upsertTransaction(
  auth: AuthContext,
  medId: string,
  input: UpsertTransactionInput,
): Promise<Transaction> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const transaction: Transaction = {
    id: medCase.transaction?.id ?? newId('tx'),
    organizationId: auth.organizationId,
    medId,
    externalId: input.externalId ?? null,
    endToEndId: input.endToEndId ?? null,
    amount: input.amount,
    currency: input.currency,
    method: input.method ?? null,
    status: input.status ?? null,
    authorizedAt: input.authorizedAt ?? null,
    capturedAt: input.capturedAt ?? null,
    provider: input.provider ?? null,
    providerReference: input.providerReference ?? null,
    createdAt: medCase.transaction?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertTransaction(transaction);
  await recordAudit(repository, auth, {
    action: 'TRANSACTION_UPSERTED',
    entityType: 'Transaction',
    entityId: saved.id,
    medId,
    source: input.provider ? 'API' : 'MANUAL',
    previousValue: toJson(medCase.transaction),
    newValue: toJson(saved),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function upsertCustomer(
  auth: AuthContext,
  medId: string,
  input: UpsertCustomerInput,
): Promise<Customer> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const customer: Customer = {
    id: medCase.customer?.id ?? newId('cus'),
    organizationId: auth.organizationId,
    medId,
    identification: input.identification,
    address: input.address ?? null,
    accountCreatedAt: input.accountCreatedAt ?? null,
    externalId: input.externalId ?? null,
    createdAt: medCase.customer?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertCustomer(customer);
  await recordAudit(repository, auth, {
    action: 'CUSTOMER_UPSERTED',
    entityType: 'Customer',
    entityId: saved.id,
    medId,
    previousValue: toJson(medCase.customer),
    newValue: toJson(saved),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function upsertOrder(
  auth: AuthContext,
  medId: string,
  input: UpsertOrderInput,
): Promise<Order> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const order: Order = {
    id: medCase.order?.id ?? newId('ord'),
    organizationId: auth.organizationId,
    medId,
    externalId: input.externalId ?? null,
    productType: input.productType,
    items: input.items,
    totalAmount: input.totalAmount ?? null,
    placedAt: input.placedAt ?? null,
    checkoutIp: input.checkoutIp ?? null,
    deviceFingerprint: input.deviceFingerprint ?? null,
    userAgent: input.userAgent ?? null,
    shippingAddress: input.shippingAddress ?? null,
    provider: input.provider ?? null,
    providerReference: input.providerReference ?? null,
    createdAt: medCase.order?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertOrder(order);
  await recordAudit(repository, auth, {
    action: 'ORDER_UPSERTED',
    entityType: 'Order',
    entityId: saved.id,
    medId,
    source: input.provider ? 'API' : 'MANUAL',
    previousValue: toJson(medCase.order),
    newValue: toJson(saved),
  });

  // The product type declared on the order drives the evidence matrix, so the
  // MED adopts it when it has none of its own.
  if (!medCase.med.productType) {
    await repository.updateMed(auth.organizationId, medId, { productType: input.productType });
  }
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function upsertTracking(
  auth: AuthContext,
  medId: string,
  input: UpsertTrackingInput,
): Promise<Tracking> {
  assertCan(auth.role, 'med:write');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const tracking: Tracking = {
    id: medCase.tracking?.id ?? newId('trk'),
    organizationId: auth.organizationId,
    medId,
    carrier: input.carrier ?? null,
    trackingCode: input.trackingCode,
    status: input.status,
    postedAt: input.postedAt ?? null,
    deliveredAt: input.deliveredAt ?? null,
    receiverName: input.receiverName ?? null,
    events: input.events.map((event) => ({
      occurredAt: event.occurredAt,
      status: event.status,
      description: event.description,
      location: event.location ?? null,
      source: event.source,
      sourceReference: event.sourceReference ?? null,
    })),
    source: input.source,
    sourceProvider: input.sourceProvider ?? null,
    sourceReference: input.sourceReference ?? null,
    createdAt: medCase.tracking?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertTracking(tracking);
  await recordAudit(repository, auth, {
    action: 'TRACKING_UPSERTED',
    entityType: 'Tracking',
    entityId: saved.id,
    medId,
    source: input.source,
    previousValue: toJson(medCase.tracking),
    newValue: toJson(saved),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function addEvidence(
  auth: AuthContext,
  medId: string,
  input: CreateEvidenceInput,
): Promise<Evidence> {
  assertCan(auth.role, 'evidence:write');
  const repository = await getRepository();
  await loadCaseOrThrow(repository, auth, medId);

  const now = new Date().toISOString();
  const evidence: Evidence = {
    id: newId('ev'),
    organizationId: auth.organizationId,
    medId,
    type: input.type,
    value: input.value as Evidence['value'],
    displayValue: input.displayValue ?? (typeof input.value === 'string' ? input.value : null),
    source: input.source,
    sourceProvider: input.sourceProvider ?? null,
    sourceReference: input.sourceReference ?? null,
    receivedAt: input.receivedAt ?? now,
    verifiedAt: input.verificationStatus === 'VERIFIED' ? now : null,
    verificationStatus: input.verificationStatus,
    documentId: input.documentId ?? null,
    metadata: input.metadata as Evidence['metadata'],
    createdAt: now,
    createdBy: auth.actor,
  };

  const saved = await repository.addEvidence(evidence);
  await recordAudit(repository, auth, {
    action: 'EVIDENCE_ADDED',
    entityType: 'Evidence',
    entityId: saved.id,
    medId,
    source: saved.source,
    newValue: toJson({ type: saved.type, source: saved.source, reference: saved.sourceReference }),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function addDocument(
  auth: AuthContext,
  medId: string,
  input: CreateDocumentInput,
): Promise<StoredDocument> {
  assertCan(auth.role, 'evidence:write');
  const repository = await getRepository();
  await loadCaseOrThrow(repository, auth, medId);

  const document: StoredDocument = {
    id: newId('doc'),
    organizationId: auth.organizationId,
    medId,
    kind: input.kind,
    filename: input.filename,
    contentType: input.contentType,
    byteSize: input.byteSize,
    storageKey: input.storageKey,
    checksumSha256: input.checksumSha256 ?? null,
    source: input.source,
    sourceReference: input.sourceReference ?? null,
    uploadedAt: new Date().toISOString(),
    uploadedBy: auth.actor,
  };

  const saved = await repository.addDocument(document);
  await recordAudit(repository, auth, {
    action: 'DOCUMENT_UPLOADED',
    entityType: 'Document',
    entityId: saved.id,
    medId,
    source: saved.source,
    newValue: toJson({ kind: saved.kind, filename: saved.filename }),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export interface GenerateDefenseOptions {
  useLlm?: boolean;
}

export async function generateDefenseForMed(
  auth: AuthContext,
  medId: string,
  options: GenerateDefenseOptions = {},
): Promise<Defense> {
  assertCan(auth.role, 'defense:generate');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const previous = await repository.listDefenses(auth.organizationId, medId);
  const version = previous.length + 1;

  const first = generateDefense({
    medCase,
    version,
    defenseId: newId('def'),
    generatedBy: auth.actor,
  });

  // The LLM only ever rewrites the text of an already-complete Defense JSON,
  // and its output is discarded unless it passes the fact guard.
  const narrative = options.useLlm
    ? await renderNarrativeWithLlm({
        med: medCase.med,
        defense: first.defense,
        evidences: first.effectiveEvidences,
        fallback: first.defense.narrative,
      })
    : first.defense.narrative;

  const defense: Defense = { ...first.defense, narrative };
  const saved = await repository.saveDefense(defense);

  await recordAudit(repository, auth, {
    action: 'DEFENSE_GENERATED',
    entityType: 'Defense',
    entityId: saved.id,
    medId,
    source: 'SYSTEM_DERIVED',
    newValue: toJson({
      version: saved.version,
      score: saved.score.total,
      claims: saved.claims.length,
      renderer: saved.narrative.renderer,
    }),
  });
  await refreshStatus(repository, auth, medId);
  return saved;
}

export async function getEvidencePack(
  auth: AuthContext,
  medId: string,
): Promise<EvidencePack> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);
  const defense = await repository.getLatestDefense(auth.organizationId, medId);
  if (!defense) {
    throw new ConflictError('Gere a defesa antes de exportar o Evidence Pack');
  }
  return buildEvidencePack(medCase, defense);
}

export async function listDefenses(auth: AuthContext, medId: string): Promise<Defense[]> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  return repository.listDefenses(auth.organizationId, medId);
}

export async function getLatestDefense(
  auth: AuthContext,
  medId: string,
): Promise<Defense | null> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  return repository.getLatestDefense(auth.organizationId, medId);
}

export async function createSubmission(
  auth: AuthContext,
  medId: string,
  input: CreateSubmissionInput,
): Promise<DefenseSubmission> {
  assertCan(auth.role, 'submission:create');
  const repository = await getRepository();
  const medCase = await loadCaseOrThrow(repository, auth, medId);

  const defense = input.defenseId
    ? await repository.getDefense(auth.organizationId, input.defenseId)
    : await repository.getLatestDefense(auth.organizationId, medId);
  if (!defense) throw new ConflictError('Nenhuma defesa gerada para este MED');

  const { getSubmissionAdapter } = await import('@/infra/adapters/submission');
  const adapter = getSubmissionAdapter(input.provider);
  const pack = buildEvidencePack(medCase, defense);

  const submission: DefenseSubmission = {
    id: newId('sub'),
    organizationId: auth.organizationId,
    defenseId: defense.id,
    medId,
    provider: adapter.provider,
    status: 'READY',
    payload: adapter.buildPayload(pack),
    documentIds: medCase.documents.map((document) => document.id),
    submittedAt: null,
    providerReference: null,
    providerResponse: null,
    createdAt: new Date().toISOString(),
  };

  const saved = await repository.createSubmission(submission);
  await recordAudit(repository, auth, {
    action: 'SUBMISSION_CREATED',
    entityType: 'Submission',
    entityId: saved.id,
    medId,
    newValue: toJson({ provider: saved.provider, defenseId: saved.defenseId }),
  });
  return saved;
}

export async function listSubmissions(
  auth: AuthContext,
  medId: string,
): Promise<DefenseSubmission[]> {
  assertCan(auth.role, 'med:read');
  const repository = await getRepository();
  return repository.listSubmissions(auth.organizationId, medId);
}

export async function listAudit(auth: AuthContext, medId: string) {
  assertCan(auth.role, 'audit:read');
  const repository = await getRepository();
  return repository.listAudit(auth.organizationId, medId);
}
