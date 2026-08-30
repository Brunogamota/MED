import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { __setRepositoryForTests } from '@/infra/container';
import { ForbiddenError } from '@/infra/auth/rbac';
import { NotFoundError, ValidationError } from '@/services/errors';
import { resetConfigCache } from '@/lib/env';
import type { AuthContext } from '@/infra/auth/context';
import {
  addEvidence,
  createMed,
  generateDefenseForMed,
  getCase,
  getEvidencePack,
  listAudit,
  listDefenses,
  listMeds,
  upsertCustomer,
  upsertOrder,
  upsertTracking,
  upsertTransaction,
  addDocument,
  uploadDocument,
  getDocumentDownloadPath,
  readVerifiedDocument,
  deriveStatus,
} from '@/services/medService';
import type { CreateMedInput } from '@/domain/schemas';

const orgA: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'test:a' };
const orgB: AuthContext = { organizationId: 'org_b', role: 'OWNER', actor: 'test:b' };
const viewerA: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'test:viewer' };

function medInput(overrides: Partial<CreateMedInput> = {}): CreateMedInput {
  return {
    medId: 'MED-1',
    amount: 349.9,
    currency: 'BRL',
    openedAt: '2026-08-20T12:00:00.000Z',
    transactionAt: '2026-08-10T17:32:00.000Z',
    responseDeadlineAt: '2026-09-05T12:00:00.000Z',
    reason: 'PRODUCT_NOT_RECEIVED',
    endToEndId: 'E12345678202608101432abcdef01',
    productType: 'PHYSICAL',
    payer: { document: '12345678909', name: 'Maria Souza', email: 'maria@example.com' },
    ...overrides,
  } as CreateMedInput;
}

async function seedDeliveredCase(auth: AuthContext) {
  const med = await createMed(auth, medInput());

  await upsertCustomer(auth, med.id, {
    identification: {
      document: '12345678909',
      name: 'Maria Souza',
      email: 'maria@example.com',
    },
    accountCreatedAt: '2025-01-01T00:00:00.000Z',
  });

  await upsertTransaction(auth, med.id, {
    amount: 349.9,
    currency: 'BRL',
    method: 'PIX',
    status: 'APPROVED',
    authorizedAt: '2026-08-10T17:32:10.000Z',
    provider: 'pagarme',
    providerReference: 'ch_1',
    endToEndId: 'E12345678202608101432abcdef01',
  });

  await upsertOrder(auth, med.id, {
    productType: 'PHYSICAL',
    items: [{ name: 'Tenis', quantity: 1, unitAmount: 349.9 }],
    placedAt: '2026-08-10T17:32:00.000Z',
    checkoutIp: '200.150.10.25',
    deviceFingerprint: 'df_1',
    provider: 'shopify',
    providerReference: 'order_1',
    shippingAddress: {
      street: 'Rua das Flores',
      number: '100',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001000',
    },
  });

  await upsertTracking(auth, med.id, {
    trackingCode: 'AA123456789BR',
    carrier: 'Correios',
    status: 'DELIVERED',
    postedAt: '2026-08-11T19:42:00.000Z',
    deliveredAt: '2026-08-14T16:17:00.000Z',
    receiverName: 'Maria Souza',
    source: 'TRACKING_PROVIDER',
    sourceReference: 'AA123456789BR',
    events: [
      {
        occurredAt: '2026-08-14T16:17:00.000Z',
        status: 'DELIVERED',
        description: 'Objeto entregue ao destinatario',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'AA123456789BR',
      },
    ],
  });

  await addDocument(auth, med.id, {
    kind: 'INVOICE',
    filename: 'nfe-1.pdf',
    contentType: 'application/pdf',
    byteSize: 1024,
    storageKey: 'test/nfe-1.pdf',
    source: 'MERCHANT',
    sourceReference: 'NFe 1',
  });

  return med;
}

beforeEach(() => {
  __setRepositoryForTests(new InMemoryMedRepository());
});

describe('tenant isolation', () => {
  it('hides a MED from another organization', async () => {
    const med = await createMed(orgA, medInput());

    await expect(getCase(orgB, med.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listMeds(orgB, {})).toEqual([]);
    expect((await listMeds(orgA, {})).map((row) => row.med.id)).toEqual([med.id]);
  });

  it('does not let another organization write to a MED it cannot see', async () => {
    const med = await createMed(orgA, medInput());

    await expect(
      upsertOrder(orgB, med.id, { productType: 'PHYSICAL', items: [] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('rbac', () => {
  it('lets a viewer read but not write', async () => {
    const med = await createMed(orgA, medInput());

    await expect(getCase(viewerA, med.id)).resolves.toBeDefined();
    await expect(createMed(viewerA, medInput({ medId: 'MED-2' }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(generateDefenseForMed(viewerA, med.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('createMed idempotency', () => {
  it('returns the existing MED when the same institution id is replayed', async () => {
    const first = await createMed(orgA, medInput());
    const second = await createMed(orgA, medInput({ amount: 999 }));

    expect(second.id).toBe(first.id);
    expect(second.amount).toBe(349.9);
    expect(await listMeds(orgA, {})).toHaveLength(1);
  });

  it('keeps the same institution id separate per organization', async () => {
    const a = await createMed(orgA, medInput());
    const b = await createMed(orgB, medInput());
    expect(a.id).not.toBe(b.id);
  });
});

describe('status lifecycle', () => {
  it('starts as MISSING_EVIDENCE while required evidence is absent', async () => {
    const med = await createMed(orgA, medInput());
    const { med: reloaded } = await getCase(orgA, med.id);
    expect(reloaded.status).toBe('MISSING_EVIDENCE');
  });

  it('a defesa nasce junto com o MED: v1 existe sem nenhum clique', async () => {
    const med = await createMed(orgA, medInput());
    const defenses = await listDefenses(orgA, med.id);
    expect(defenses).toHaveLength(1);
    expect(defenses[0]?.version).toBe(1);
  });

  it('reaches READY_TO_SUBMIT once the case is documented (defense already born)', async () => {
    const med = await seedDeliveredCase(orgA);

    // A minuta v1 nasceu na criação; com o caso documentado o status vai
    // direto a pronto-para-envio, sem passar por um botão de gerar.
    const documented = await getCase(orgA, med.id);
    expect(documented.med.status).toBe('READY_TO_SUBMIT');

    await generateDefenseForMed(orgA, med.id);
    const regenerated = await listDefenses(orgA, med.id);
    expect(regenerated).toHaveLength(2);
    expect((await getCase(orgA, med.id)).med.status).toBe('READY_TO_SUBMIT');
  });
});

describe('defense versioning', () => {
  it('appends immutable versions instead of overwriting', async () => {
    const med = await seedDeliveredCase(orgA);

    // v1 nasceu com o MED; regenerar acrescenta versões, nunca sobrescreve.
    const second = await generateDefenseForMed(orgA, med.id);
    const third = await generateDefenseForMed(orgA, med.id);

    expect(second.version).toBe(2);
    expect(third.version).toBe(3);
    expect(second.id).not.toBe(third.id);

    const all = await listDefenses(orgA, med.id);
    expect(all.map((defense) => defense.version)).toEqual([1, 2, 3]);
  });

  it('exports the evidence pack of the defense born with the MED', async () => {
    const med = await createMed(orgA, medInput());
    const pack = await getEvidencePack(orgA, med.id);
    expect(pack.defense.version).toBe(1);
  });
});

describe('audit trail', () => {
  it('records every write with actor, role and source', async () => {
    const med = await seedDeliveredCase(orgA);
    await addEvidence(orgA, med.id, {
      type: 'INVOICE',
      value: 'nfe-1.pdf',
      source: 'MERCHANT',
      verificationStatus: 'UNVERIFIED',
      metadata: {},
    });
    await generateDefenseForMed(orgA, med.id);

    const entries = await listAudit(orgA, med.id);
    const actions = entries.map((entry) => entry.action);

    expect(actions).toContain('MED_CREATED');
    expect(actions).toContain('ORDER_UPSERTED');
    expect(actions).toContain('TRACKING_UPSERTED');
    expect(actions).toContain('EVIDENCE_ADDED');
    expect(actions).toContain('DEFENSE_GENERATED');
    expect(actions).toContain('MED_STATUS_CHANGED');
    expect(entries.every((entry) => entry.actor === 'test:a')).toBe(true);
    expect(entries.every((entry) => entry.actorRole === 'OWNER')).toBe(true);
  });

  it('keeps the previous value when a record is replaced', async () => {
    const med = await createMed(orgA, medInput());
    await upsertOrder(orgA, med.id, { productType: 'PHYSICAL', items: [], externalId: 'ORD-1' });
    await upsertOrder(orgA, med.id, { productType: 'PHYSICAL', items: [], externalId: 'ORD-2' });

    const entries = (await listAudit(orgA, med.id)).filter(
      (entry) => entry.action === 'ORDER_UPSERTED',
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]?.previousValue).toBeNull();
    expect(entries[1]?.previousValue).not.toBeNull();
  });
});

describe('deadline expiry', () => {
  it('marks a case EXPIRED once the response window closes without submission', async () => {
    const med = await seedDeliveredCase(orgA);
    const medCase = await getCase(orgA, med.id);

    const beforeDeadline = deriveStatus(medCase, true, new Date('2026-09-04T12:00:00.000Z'));
    const afterDeadline = deriveStatus(medCase, true, new Date('2026-09-06T12:00:00.000Z'));

    expect(beforeDeadline).toBe('READY_TO_SUBMIT');
    expect(afterDeadline).toBe('EXPIRED');
  });

  it('does not expire a case that was already submitted', async () => {
    const med = await seedDeliveredCase(orgA);
    const medCase = await getCase(orgA, med.id);
    const submitted = { ...medCase, med: { ...medCase.med, status: 'SUBMITTED' as const } };

    expect(deriveStatus(submitted, true, new Date('2026-09-06T12:00:00.000Z'))).toBe('SUBMITTED');
  });
});

describe('documents', () => {
  // The signing secret is normally absent in tests; these cases need a real one
  // to exercise link issuing, so it is set and cleared explicitly.
  beforeEach(() => {
    process.env.DOCUMENT_URL_SIGNING_SECRET = 'test-signing-secret';
    resetConfigCache();
  });

  afterEach(() => {
    delete process.env.DOCUMENT_URL_SIGNING_SECRET;
    resetConfigCache();
  });

  it('stores an uploaded file with its checksum and serves it back', async () => {
    const med = await createMed(orgA, medInput());
    const bytes = new TextEncoder().encode('%PDF-1.4 conteudo de teste');

    const document = await uploadDocument(orgA, med.id, {
      kind: 'INVOICE',
      filename: 'nfe.pdf',
      contentType: 'application/pdf',
      bytes,
      source: 'MERCHANT',
      sourceReference: 'NFe 1',
    });

    expect(document.byteSize).toBe(bytes.byteLength);
    expect(document.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(document.storageKey).toContain(med.id);

    const read = await readVerifiedDocument('org_a', document.id);
    expect(new TextDecoder().decode(read.blob.bytes)).toBe('%PDF-1.4 conteudo de teste');
  });

  it('refuses an empty upload', async () => {
    const med = await createMed(orgA, medInput());
    await expect(
      uploadDocument(orgA, med.id, {
        kind: 'OTHER',
        filename: 'vazio.pdf',
        contentType: 'application/pdf',
        bytes: new Uint8Array(0),
        source: 'MERCHANT',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('issues a signed link scoped to the owning organization', async () => {
    const med = await createMed(orgA, medInput());
    const document = await uploadDocument(orgA, med.id, {
      kind: 'INVOICE',
      filename: 'nfe.pdf',
      contentType: 'application/pdf',
      bytes: new TextEncoder().encode('x'),
      source: 'MERCHANT',
    });

    const path = await getDocumentDownloadPath(orgA, document.id);
    expect(path).toContain(`/api/documents/${document.id}`);
    expect(path).toContain('org=org_a');
    expect(path).toContain('sig=');
  });

  it('never serves or links a document belonging to another organization', async () => {
    const med = await createMed(orgA, medInput());
    const document = await uploadDocument(orgA, med.id, {
      kind: 'INVOICE',
      filename: 'nfe.pdf',
      contentType: 'application/pdf',
      bytes: new TextEncoder().encode('x'),
      source: 'MERCHANT',
    });

    await expect(readVerifiedDocument('org_b', document.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getDocumentDownloadPath(orgB, document.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('issues no link at all when the signing secret is absent', async () => {
    delete process.env.DOCUMENT_URL_SIGNING_SECRET;
    resetConfigCache();

    const med = await createMed(orgA, medInput());
    const document = await addDocument(orgA, med.id, {
      kind: 'INVOICE',
      filename: 'nfe.pdf',
      contentType: 'application/pdf',
      byteSize: 10,
      storageKey: 'k',
      source: 'MERCHANT',
    });

    expect(await getDocumentDownloadPath(orgA, document.id)).toBeNull();
  });
});
