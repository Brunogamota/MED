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
  ProductType,
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
  /** Abertura a partir de (inclusive), em ISO. */
  openedFrom?: string;
  /** Abertura ate (inclusive), em ISO. */
  openedTo?: string;
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
  /**
   * Apaga o MED e tudo que pende dele. Devolve `false` quando o id nao existe
   * nesta organizacao — nunca apaga por id sozinho, sem o dono.
   */
  deleteMed(organizationId: string, id: string): Promise<boolean>;

  upsertTransaction(transaction: Transaction): Promise<Transaction>;
  upsertCustomer(customer: Customer): Promise<Customer>;
  upsertOrder(order: Order): Promise<Order>;
  upsertTracking(tracking: Tracking): Promise<Tracking>;
  upsertDigitalDelivery(delivery: DigitalDelivery): Promise<DigitalDelivery>;

  addEvidence(evidence: Evidence): Promise<Evidence>;
  listEvidence(organizationId: string, medId: string): Promise<Evidence[]>;
  /** Remove uma evidencia da organizacao. `false` quando ela nao existe la. */
  deleteEvidence(organizationId: string, evidenceId: string): Promise<boolean>;

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
  /** Vários casos de uma vez — para lote, sem uma ida ao banco por caso. */
  loadCases(organizationId: string, medIds: string[]): Promise<MedCase[]>;
}

/**
 * Idempotency store for writes and webhooks. Keyed by
 * (organization, scope, key) so two tenants never collide.
 */
export interface IdempotencyStore {
  get(organizationId: string, scope: string, key: string): Promise<string | null>;
  set(organizationId: string, scope: string, key: string, resultId: string): Promise<void>;
}

/**
 * Credencial de um conector, por organizacao.
 *
 * `secret` trafega **cifrado** por esta porta. A cifra fica na camada de
 * servico, e nao aqui: assim nenhum adapter — nem um futuro, nem um de teste —
 * pode gravar o valor claro por engano.
 */
export interface IntegrationCredentialRecord {
  organizationId: string;
  provider: string;
  /** Envelope de `src/lib/secretBox.ts`. Nunca o valor em claro. */
  secret: string;
  /** Qual conta esta ligada, para a tela dizer. E endereco, nao credencial. */
  accountLabel: string | null;
  connectedAt: string;
}

export interface IntegrationCredentialRepository {
  getCredential(
    organizationId: string,
    provider: string,
  ): Promise<IntegrationCredentialRecord | null>;
  saveCredential(record: IntegrationCredentialRecord): Promise<IntegrationCredentialRecord>;
  deleteCredential(organizationId: string, provider: string): Promise<boolean>;
}

/** Contador de tentativas de login falhas, por origem. */
export interface LoginAttemptRecord {
  key: string;
  count: number;
  windowStartedAt: string;
}

export interface LoginThrottleRepository {
  getLoginAttempt(key: string): Promise<LoginAttemptRecord | null>;
  saveLoginAttempt(record: LoginAttemptRecord): Promise<void>;
  clearLoginAttempt(key: string): Promise<void>;
}

/**
 * Conta: uma organizacao com nome e visual proprios.
 *
 * E a mesma organizacao que isola os dados de cada consulta — trocar de conta
 * e trocar o `organizationId` de tudo. `skin` diz qual ambiente visual a conta
 * usa; o catalogo de ambientes esta em `src/config/skins.ts`.
 */
export interface AccountRecord {
  id: string;
  name: string;
  skin: string | null;
  createdAt: string;
}

export interface AccountRepository {
  listAccounts(): Promise<AccountRecord[]>;
  saveAccount(account: { id: string; name: string; skin: string | null }): Promise<AccountRecord>;
}

/**
 * Escritas de uma importação em lote, gravadas de uma vez.
 *
 * Gravar MED a MED eram ~8 idas ao banco por caso — centenas de casos
 * levavam minutos. O lote junta tudo e o adapter grava em poucas consultas.
 * Cada item continua com sua origem e sua trilha de auditoria.
 */
export interface ImportBatch {
  /** Pedidos novos (o caso não tinha pedido). */
  orders: Order[];
  /** Acompanhamento completo de cada caso tocado — substitui o anterior. */
  trackings: Tracking[];
  evidences: Evidence[];
  /** Só reconstruções de comunicação — evidência de origem externa não sai. */
  removeEvidenceIds: string[];
  audits: AuditLogEntry[];
  medUpdates: { medId: string; status?: MedStatus; productType?: ProductType }[];
}

export interface ImportBatchRepository {
  applyImportBatch(organizationId: string, batch: ImportBatch): Promise<void>;
}

/** Um comprovante gerado, com o mínimo do caso para listar. */
export interface GeneratedReceiptRow {
  evidence: Evidence;
  med: { id: string; medId: string; payerName: string | null };
}

export interface ReceiptListRepository {
  /** Comprovantes (reconstruções de comunicação) da organização, mais novos primeiro. */
  listGeneratedReceipts(
    organizationId: string,
    page: { limit: number; offset: number },
  ): Promise<{ total: number; rows: GeneratedReceiptRow[] }>;
}
