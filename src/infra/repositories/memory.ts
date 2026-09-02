import type {
  AuditLogEntry,
  Customer,
  DigitalDelivery,
  Defense,
  DefenseSubmission,
  Evidence,
  Med,
  Order,
  StoredDocument,
  Tracking,
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
 * In-memory repository.
 *
 * Used for tests and for DEMO mode — the app boots and is fully explorable
 * before a database is provisioned. On Vercel this state lives inside a single
 * serverless instance and disappears on cold start; that limitation is
 * documented in `.env.example` and surfaced in the UI. Production sets
 * DATABASE_URL and gets the Prisma repository instead.
 */
export class InMemoryMedRepository implements MedRepository, IdempotencyStore {
  private readonly meds = new Map<string, Med>();
  private readonly transactions = new Map<string, Transaction>();
  private readonly customers = new Map<string, Customer>();
  private readonly orders = new Map<string, Order>();
  private readonly trackings = new Map<string, Tracking>();
  private readonly digitalDeliveries = new Map<string, DigitalDelivery>();
  private readonly evidences = new Map<string, Evidence[]>();
  private readonly documents = new Map<string, StoredDocument[]>();
  private readonly defenses = new Map<string, Defense[]>();
  private readonly submissions = new Map<string, DefenseSubmission[]>();
  private readonly audits = new Map<string, AuditLogEntry[]>();
  private readonly idempotency = new Map<string, string>();

  private scoped(organizationId: string, medId: string): string {
    return `${organizationId}:${medId}`;
  }

  private owned<T extends { organizationId: string }>(
    entity: T | undefined,
    organizationId: string,
  ): T | null {
    if (!entity) return null;
    return entity.organizationId === organizationId ? entity : null;
  }

  async createMed(med: Med): Promise<Med> {
    this.meds.set(med.id, med);
    return med;
  }

  async getMed(organizationId: string, id: string): Promise<Med | null> {
    return this.owned(this.meds.get(id), organizationId);
  }

  async findMedByExternalId(organizationId: string, medId: string): Promise<Med | null> {
    for (const med of this.meds.values()) {
      if (med.organizationId === organizationId && med.medId === medId) return med;
    }
    return null;
  }

  async listMeds(organizationId: string, filter: ListMedsFilter): Promise<MedListRow[]> {
    const search = filter.search?.trim().toLowerCase();
    const rows: MedListRow[] = [];

    for (const med of this.meds.values()) {
      if (med.organizationId !== organizationId) continue;
      if (filter.status && med.status !== filter.status) continue;
      if (search) {
        const haystack = [
          med.medId,
          med.payer.name,
          med.payer.document,
          med.payer.email,
          med.endToEndId,
        ]
          .filter((value): value is string => typeof value === 'string')
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) continue;
      }
      const defenses = this.defenses.get(this.scoped(organizationId, med.id)) ?? [];
      const latest = defenses[defenses.length - 1] ?? null;
      rows.push({
        med,
        latestDefense: latest
          ? {
              id: latest.id,
              version: latest.version,
              score: latest.score,
              generatedAt: latest.generatedAt,
            }
          : null,
        evidenceCount: (this.evidences.get(this.scoped(organizationId, med.id)) ?? []).length,
      });
    }

    rows.sort((a, b) => Date.parse(b.med.openedAt) - Date.parse(a.med.openedAt));
    return rows.slice(0, filter.limit ?? 50);
  }

  async updateMed(organizationId: string, id: string, patch: Partial<Med>): Promise<Med> {
    const current = await this.getMed(organizationId, id);
    if (!current) throw new Error(`MED ${id} not found`);
    const updated: Med = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.meds.set(id, updated);
    return updated;
  }

  async deleteMed(organizationId: string, id: string): Promise<boolean> {
    const current = await this.getMed(organizationId, id);
    if (!current) return false;

    // O Prisma apaga o que pende do MED por cascata; aqui a limpeza e manual,
    // e esquecer um mapa deixaria evidencia orfa aparecendo num MED futuro que
    // reaproveitasse o id.
    const key = this.scoped(organizationId, id);
    this.meds.delete(id);
    this.transactions.delete(key);
    this.customers.delete(key);
    this.orders.delete(key);
    this.trackings.delete(key);
    this.digitalDeliveries.delete(key);
    this.evidences.delete(key);
    this.documents.delete(key);
    this.defenses.delete(key);
    this.submissions.delete(key);
    // A auditoria do proprio caso vai junto, como no banco. O registro de que
    // ele foi apagado e gravado sem `medId`, e por isso sobrevive.
    this.audits.delete(key);
    return true;
  }

  async upsertTransaction(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(this.scoped(transaction.organizationId, transaction.medId), transaction);
    return transaction;
  }

  async upsertCustomer(customer: Customer): Promise<Customer> {
    this.customers.set(this.scoped(customer.organizationId, customer.medId), customer);
    return customer;
  }

  async upsertOrder(order: Order): Promise<Order> {
    this.orders.set(this.scoped(order.organizationId, order.medId), order);
    return order;
  }

  async upsertTracking(tracking: Tracking): Promise<Tracking> {
    this.trackings.set(this.scoped(tracking.organizationId, tracking.medId), tracking);
    return tracking;
  }

  async upsertDigitalDelivery(delivery: DigitalDelivery): Promise<DigitalDelivery> {
    this.digitalDeliveries.set(this.scoped(delivery.organizationId, delivery.medId), delivery);
    return delivery;
  }

  private appendTo<T>(map: Map<string, T[]>, key: string, value: T): T {
    const list = map.get(key);
    if (list) {
      list.push(value);
    } else {
      map.set(key, [value]);
    }
    return value;
  }

  async addEvidence(evidence: Evidence): Promise<Evidence> {
    return this.appendTo(
      this.evidences,
      this.scoped(evidence.organizationId, evidence.medId),
      evidence,
    );
  }

  async listEvidence(organizationId: string, medId: string): Promise<Evidence[]> {
    return [...(this.evidences.get(this.scoped(organizationId, medId)) ?? [])];
  }

  async addDocument(document: StoredDocument): Promise<StoredDocument> {
    return this.appendTo(
      this.documents,
      this.scoped(document.organizationId, document.medId),
      document,
    );
  }

  async listDocuments(organizationId: string, medId: string): Promise<StoredDocument[]> {
    return [...(this.documents.get(this.scoped(organizationId, medId)) ?? [])];
  }

  async getDocument(organizationId: string, documentId: string): Promise<StoredDocument | null> {
    for (const list of this.documents.values()) {
      for (const document of list) {
        if (document.id === documentId && document.organizationId === organizationId) {
          return document;
        }
      }
    }
    return null;
  }

  async saveDefense(defense: Defense): Promise<Defense> {
    return this.appendTo(
      this.defenses,
      this.scoped(defense.organizationId, defense.medId),
      defense,
    );
  }

  async listDefenses(organizationId: string, medId: string): Promise<Defense[]> {
    return [...(this.defenses.get(this.scoped(organizationId, medId)) ?? [])];
  }

  async getLatestDefense(organizationId: string, medId: string): Promise<Defense | null> {
    const list = await this.listDefenses(organizationId, medId);
    return list[list.length - 1] ?? null;
  }

  async getDefense(organizationId: string, defenseId: string): Promise<Defense | null> {
    for (const list of this.defenses.values()) {
      for (const defense of list) {
        if (defense.id === defenseId && defense.organizationId === organizationId) return defense;
      }
    }
    return null;
  }

  async createSubmission(submission: DefenseSubmission): Promise<DefenseSubmission> {
    return this.appendTo(
      this.submissions,
      this.scoped(submission.organizationId, submission.medId),
      submission,
    );
  }

  async listSubmissions(organizationId: string, medId: string): Promise<DefenseSubmission[]> {
    return [...(this.submissions.get(this.scoped(organizationId, medId)) ?? [])];
  }

  async appendAudit(entry: AuditLogEntry): Promise<AuditLogEntry> {
    return this.appendTo(this.audits, this.scoped(entry.organizationId, entry.medId ?? '-'), entry);
  }

  async listAudit(organizationId: string, medId: string): Promise<AuditLogEntry[]> {
    return [...(this.audits.get(this.scoped(organizationId, medId)) ?? [])];
  }

  async loadCase(organizationId: string, medId: string): Promise<MedCase | null> {
    const med = await this.getMed(organizationId, medId);
    if (!med) return null;
    const key = this.scoped(organizationId, medId);
    return {
      med,
      transaction: this.transactions.get(key) ?? null,
      customer: this.customers.get(key) ?? null,
      order: this.orders.get(key) ?? null,
      tracking: this.trackings.get(key) ?? null,
      digitalDelivery: this.digitalDeliveries.get(key) ?? null,
      evidences: await this.listEvidence(organizationId, medId),
      documents: await this.listDocuments(organizationId, medId),
    };
  }

  async get(organizationId: string, scope: string, key: string): Promise<string | null> {
    return this.idempotency.get(`${organizationId}:${scope}:${key}`) ?? null;
  }

  async set(
    organizationId: string,
    scope: string,
    key: string,
    resultId: string,
  ): Promise<void> {
    this.idempotency.set(`${organizationId}:${scope}:${key}`, resultId);
  }
}
