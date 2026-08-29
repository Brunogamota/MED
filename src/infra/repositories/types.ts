import type {
  AuditLogEntry,
  Customer,
  DigitalDelivery,
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

/**
 * Persistence port.
 *
 * Every method takes an `organizationId` as its first argument and every
 * implementation must filter on it. Tenant isolation is enforced here, in the
 * backend, never by trusting a filter sent from the client.
 */

export interface ListMedsFilter {
  status?: MedStatus;
  search?: string;
  limit?: number;
}

export interface MedListRow {
  med: Med;
  latestDefense: Pick<Defense, 'id' | 'version' | 'score' | 'generatedAt'> | null;
  evidenceCount: number;
}

export interface MedRepository {
  createMed(med: Med): Promise<Med>;
  getMed(organizationId: string, id: string): Promise<Med | null>;
  findMedByExternalId(organizationId: string, medId: string): Promise<Med | null>;
  listMeds(organizationId: string, filter: ListMedsFilter): Promise<MedListRow[]>;
  updateMed(organizationId: string, id: string, patch: Partial<Med>): Promise<Med>;

  upsertTransaction(transaction: Transaction): Promise<Transaction>;
  upsertCustomer(customer: Customer): Promise<Customer>;
  upsertOrder(order: Order): Promise<Order>;
  upsertTracking(tracking: Tracking): Promise<Tracking>;
  upsertDigitalDelivery(delivery: DigitalDelivery): Promise<DigitalDelivery>;

  addEvidence(evidence: Evidence): Promise<Evidence>;
  listEvidence(organizationId: string, medId: string): Promise<Evidence[]>;

  addDocument(document: StoredDocument): Promise<StoredDocument>;
  listDocuments(organizationId: string, medId: string): Promise<StoredDocument[]>;
  getDocument(organizationId: string, documentId: string): Promise<StoredDocument | null>;

  saveDefense(defense: Defense): Promise<Defense>;
  listDefenses(organizationId: string, medId: string): Promise<Defense[]>;
  getLatestDefense(organizationId: string, medId: string): Promise<Defense | null>;
  getDefense(organizationId: string, defenseId: string): Promise<Defense | null>;

  createSubmission(submission: DefenseSubmission): Promise<DefenseSubmission>;
  listSubmissions(organizationId: string, medId: string): Promise<DefenseSubmission[]>;

  appendAudit(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listAudit(organizationId: string, medId: string): Promise<AuditLogEntry[]>;

  loadCase(organizationId: string, medId: string): Promise<MedCase | null>;
}

/**
 * Idempotency store for writes and webhooks. Keyed by
 * (organization, scope, key) so two tenants never collide.
 */
export interface IdempotencyStore {
  get(organizationId: string, scope: string, key: string): Promise<string | null>;
  set(organizationId: string, scope: string, key: string, resultId: string): Promise<void>;
}
