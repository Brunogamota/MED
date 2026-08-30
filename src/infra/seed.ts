import type { Repository } from '@/infra/container';
import { DEMO_ORGANIZATION_ID } from '@/lib/env';
import type { Med } from '@/domain/types';

/**
 * Demo data, loaded only in DEMO mode (no DATABASE_URL).
 *
 * These records are fictional and labelled as such — every MED id starts with
 * `DEMO-` and the payer names are obviously synthetic — só demo content can
 * never be mistaken for a real case. Nothing here is seeded when a database is
 * configured.
 */

const NOW = Date.now();
const days = (count: number) => new Date(NOW + count * 24 * 60 * 60 * 1000).toISOString();

function baseMed(overrides: Partial<Med> & Pick<Med, 'id' | 'medId'>): Med {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    merchantId: 'merchant_demo',
    transactionId: null,
    endToEndId: null,
    pixId: null,
    amount: 0,
    currency: 'BRL',
    transactionAt: null,
    openedAt: days(-5),
    responseDeadlineAt: days(5),
    reason: 'OTHER',
    reasonDescription: null,
    requestingInstitution: null,
    productType: null,
    status: 'RECEIVED',
    payer: {},
    payerAddress: null,
    payerIp: null,
    payerDevice: null,
    merchantName: 'Loja Demonstração',
    additionalInformation: null,
    createdAt: days(-5),
    updatedAt: days(-5),
    ...overrides,
  };
}

export async function seedDemoData(repository: Repository): Promise<void> {
  // Case 1 — physical goods, delivered, well documented.
  const delivered = baseMed({
    id: 'demo_med_delivered',
    medId: 'DEMO-2026-0001',
    transactionId: 'DEMO-TX-1001',
    endToEndId: 'E00000000202608101432demo0001',
    amount: 349.9,
    transactionAt: days(-19),
    openedAt: days(-5),
    responseDeadlineAt: days(4),
    reason: 'PRODUCT_NOT_RECEIVED',
    requestingInstitution: 'Banco Demonstração S.A.',
    productType: 'PHYSICAL',
    status: 'COLLECTING_DATA',
    payer: {
      document: '11122233344',
      name: 'Cliente Demonstração Um',
      email: 'cliente.um@exemplo.demo',
      phone: '11900000001',
    },
  });
  await repository.createMed(delivered);

  await repository.upsertTransaction({
    id: 'demo_tx_1',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: delivered.id,
    externalId: 'DEMO-TX-1001',
    endToEndId: delivered.endToEndId,
    amount: 349.9,
    currency: 'BRL',
    method: 'PIX',
    status: 'APPROVED',
    authorizedAt: days(-19),
    capturedAt: days(-19),
    provider: 'demo-psp',
    providerReference: 'demo_ch_1001',
    createdAt: days(-19),
  });

  await repository.upsertCustomer({
    id: 'demo_cus_1',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: delivered.id,
    identification: {
      document: '11122233344',
      name: 'Cliente Demonstração Um',
      email: 'cliente.um@exemplo.demo',
      phone: '11900000001',
    },
    address: {
      street: 'Rua Demonstração',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01001000',
      country: 'BR',
    },
    accountCreatedAt: days(-400),
    externalId: 'demo_shop_cus_1',
    createdAt: days(-5),
  });

  await repository.upsertOrder({
    id: 'demo_ord_1',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: delivered.id,
    externalId: 'DEMO-PED-1001',
    productType: 'PHYSICAL',
    items: [{ name: 'Produto Demonstração', sku: 'DEMO-SKU-1', quantity: 1, unitAmount: 349.9 }],
    totalAmount: 349.9,
    placedAt: days(-19),
    checkoutIp: '203.0.113.10',
    deviceFingerprint: 'demo_df_0001',
    userAgent: 'Mozilla/5.0 (demo)',
    shippingAddress: {
      street: 'Rua Demonstração',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01001000',
      country: 'BR',
    },
    provider: 'demo-commerce',
    providerReference: 'demo_order_1001',
    createdAt: days(-5),
  });

  await repository.upsertTracking({
    id: 'demo_trk_1',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: delivered.id,
    carrier: 'Transportadora Demonstração',
    trackingCode: 'DM123456789BR',
    status: 'DELIVERED',
    postedAt: days(-18),
    deliveredAt: days(-15),
    receiverName: 'Cliente Demonstração Um',
    events: [
      {
        occurredAt: days(-18),
        status: 'POSTED',
        description: 'Objeto postado',
        location: 'São Paulo/SP',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'DM123456789BR',
      },
      {
        occurredAt: days(-16),
        status: 'OUT_FOR_DELIVERY',
        description: 'Objeto saiu para entrega',
        location: 'São Paulo/SP',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'DM123456789BR',
      },
      {
        occurredAt: days(-15),
        status: 'DELIVERED',
        description: 'Objeto entregue ao destinatário',
        location: 'São Paulo/SP',
        source: 'TRACKING_PROVIDER',
        sourceReference: 'DM123456789BR',
      },
    ],
    source: 'TRACKING_PROVIDER',
    sourceProvider: 'demo-tracking',
    sourceReference: 'DM123456789BR',
    createdAt: days(-5),
  });

  await repository.addDocument({
    id: 'demo_doc_1',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: delivered.id,
    kind: 'INVOICE',
    filename: 'nota-fiscal-demo-1001.pdf',
    contentType: 'application/pdf',
    byteSize: 10240,
    storageKey: 'demo/nota-fiscal-demo-1001.pdf',
    checksumSha256: null,
    source: 'MERCHANT',
    sourceReference: 'NFe DEMO 1001',
    uploadedAt: days(-4),
    uploadedBy: 'demo',
  });

  // Case 2 — digital product, deliberately incomplete só the "missing
  // evidence" path is visible in the UI.
  const incomplete = baseMed({
    id: 'demo_med_incomplete',
    medId: 'DEMO-2026-0002',
    transactionId: 'DEMO-TX-1002',
    endToEndId: 'E00000000202608151201demo0002',
    amount: 89.9,
    transactionAt: days(-9),
    openedAt: days(-2),
    responseDeadlineAt: days(1),
    reason: 'UNRECOGNIZED_TRANSACTION',
    requestingInstitution: 'Banco Demonstração S.A.',
    productType: 'DIGITAL',
    status: 'MISSING_EVIDENCE',
    payer: {
      document: '55566677788',
      name: 'Cliente Demonstração Dois',
      email: 'cliente.dois@exemplo.demo',
    },
  });
  await repository.createMed(incomplete);

  await repository.upsertDigitalDelivery({
    id: 'demo_dld_2',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: incomplete.id,
    channel: 'EMAIL',
    sentTo: 'cliente.dois@exemplo.demo',
    sentAt: days(-9),
    platform: 'Área de membros Demonstração',
    firstAccessAt: null,
    accessCount: null,
    source: 'MERCHANT',
    sourceProvider: 'demo-plataforma',
    sourceReference: 'demo-msg-4471',
    createdAt: days(-2),
  });

  await repository.upsertCustomer({
    id: 'demo_cus_2',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: incomplete.id,
    identification: {
      document: '55566677788',
      name: 'Cliente Demonstração Dois',
      email: 'cliente.dois@exemplo.demo',
    },
    address: null,
    accountCreatedAt: days(-30),
    externalId: null,
    createdAt: days(-2),
  });
}
