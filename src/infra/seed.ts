import { createHash } from 'node:crypto';
import type { Repository } from '@/infra/container';
import { DEMO_ORGANIZATION_ID } from '@/lib/env';
import type { Med } from '@/domain/types';
import { generateDefense } from '@/domain/defense/engine';

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

  // -------------------------------------------------------------------------
  // Caso 3 — vitrine: produto físico entregue com TODA a defesa preenchida.
  // Serve para avaliar o PDF completo. Continua obviamente fictício (DEMO-*).
  // -------------------------------------------------------------------------
  const showcase = baseMed({
    id: 'demo_med_showcase',
    medId: 'DEMO-2026-0100',
    transactionId: 'DEMO-TX-2100',
    endToEndId: 'E00000000202608051455demo0100',
    amount: 1899.9,
    transactionAt: days(-24),
    openedAt: days(-6),
    responseDeadlineAt: days(6),
    reason: 'PRODUCT_NOT_RECEIVED',
    reasonDescription: 'Cliente alega que o pedido não chegou ao endereço informado.',
    requestingInstitution: 'Banco Demonstração S.A.',
    productType: 'PHYSICAL',
    status: 'READY_TO_SUBMIT',
    payer: {
      document: '39053344705',
      name: 'Cliente Demonstração Três',
      email: 'cliente.tres@exemplo.demo',
      phone: '11900000003',
    },
    payerAddress: {
      street: 'Avenida Demonstração',
      number: '2500',
      complement: 'Apto 71',
      district: 'Jardim Modelo',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04567000',
      country: 'BR',
    },
    payerIp: '198.51.100.42',
    payerDevice: 'demo_df_0100',
  });
  await repository.createMed(showcase);

  const showcaseTransaction = {
    id: 'demo_tx_100',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: showcase.id,
    externalId: 'DEMO-TX-2100',
    endToEndId: showcase.endToEndId ?? null,
    amount: 1899.9,
    currency: 'BRL',
    method: 'PIX',
    status: 'APPROVED',
    authorizedAt: days(-24),
    capturedAt: days(-24),
    provider: 'demo-psp',
    providerReference: 'demo_ch_2100',
    createdAt: days(-24),
  };
  await repository.upsertTransaction(showcaseTransaction);

  const showcaseCustomer = {
    id: 'demo_cus_100',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: showcase.id,
    identification: {
      document: '39053344705',
      name: 'Cliente Demonstração Três',
      email: 'cliente.tres@exemplo.demo',
      phone: '11900000003',
    },
    address: {
      street: 'Avenida Demonstração',
      number: '2500',
      complement: 'Apto 71',
      district: 'Jardim Modelo',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04567000',
      country: 'BR',
    },
    accountCreatedAt: days(-540),
    externalId: 'demo_shop_cus_100',
    createdAt: days(-6),
  };
  await repository.upsertCustomer(showcaseCustomer);

  const showcaseOrder = {
    id: 'demo_ord_100',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: showcase.id,
    externalId: 'DEMO-PED-2100',
    productType: 'PHYSICAL' as const,
    items: [
      { name: 'Notebook Demonstração 15"', sku: 'DEMO-NB-15', quantity: 1, unitAmount: 1799.9 },
      { name: 'Mochila Demonstração', sku: 'DEMO-MOCH-01', quantity: 1, unitAmount: 100 },
    ],
    totalAmount: 1899.9,
    placedAt: days(-24),
    checkoutIp: '198.51.100.42',
    deviceFingerprint: 'demo_df_0100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) demo',
    shippingAddress: {
      street: 'Avenida Demonstração',
      number: '2500',
      complement: 'Apto 71',
      district: 'Jardim Modelo',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04567000',
      country: 'BR',
    },
    provider: 'demo-commerce',
    providerReference: 'demo_order_2100',
    createdAt: days(-6),
  };
  await repository.upsertOrder(showcaseOrder);

  const showcaseTracking = {
    id: 'demo_trk_100',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: showcase.id,
    carrier: 'Transportadora Demonstração',
    trackingCode: 'DM987654321BR',
    status: 'DELIVERED' as const,
    postedAt: days(-23),
    deliveredAt: days(-20),
    receiverName: 'Cliente Demonstração Três',
    events: [
      { occurredAt: days(-23), status: 'POSTED' as const, description: 'Objeto postado', location: 'São Paulo/SP', source: 'TRACKING_PROVIDER' as const, sourceReference: 'DM987654321BR' },
      { occurredAt: days(-22), status: 'IN_TRANSIT' as const, description: 'Objeto em trânsito para a unidade de destino', location: 'CD Cajamar/SP', source: 'TRACKING_PROVIDER' as const, sourceReference: 'DM987654321BR' },
      { occurredAt: days(-21), status: 'OUT_FOR_DELIVERY' as const, description: 'Objeto saiu para entrega ao destinatário', location: 'São Paulo/SP', source: 'TRACKING_PROVIDER' as const, sourceReference: 'DM987654321BR' },
      { occurredAt: days(-20), status: 'DELIVERED' as const, description: 'Objeto entregue ao destinatário', location: 'São Paulo/SP', source: 'TRACKING_PROVIDER' as const, sourceReference: 'DM987654321BR' },
    ],
    source: 'TRACKING_PROVIDER' as const,
    sourceProvider: 'demo-tracking',
    sourceReference: 'DM987654321BR',
    createdAt: days(-6),
  };
  await repository.upsertTracking(showcaseTracking);

  const demoChecksum = (name: string) => createHash('sha256').update(`demo:${name}`).digest('hex');
  const showcaseDocuments = [
    { id: 'demo_doc_100', kind: 'INVOICE' as const, filename: 'nfe-2100.pdf', sourceReference: 'NFe DEMO 002.100', uploadedAt: days(-5) },
    { id: 'demo_doc_101', kind: 'DELIVERY_RECEIPT' as const, filename: 'comprovante-entrega-DM987654321BR.pdf', sourceReference: 'Protocolo demo-POD-2100', uploadedAt: days(-5) },
    { id: 'demo_doc_102', kind: 'TRANSACTION_RECEIPT' as const, filename: 'comprovante-pix-demo_ch_2100.pdf', sourceReference: 'demo_ch_2100', uploadedAt: days(-5) },
  ];
  for (const doc of showcaseDocuments) {
    await repository.addDocument({
      id: doc.id,
      organizationId: DEMO_ORGANIZATION_ID,
      medId: showcase.id,
      kind: doc.kind,
      filename: doc.filename,
      contentType: 'application/pdf',
      byteSize: 24576,
      storageKey: `demo/${doc.filename}`,
      checksumSha256: demoChecksum(doc.filename),
      source: 'MERCHANT',
      sourceReference: doc.sourceReference,
      uploadedAt: doc.uploadedAt,
      uploadedBy: 'demo',
    });
  }

  // Evidências que não nascem dos registros estruturados: aceite, antifraude,
  // comunicação e política — cada uma com origem e referência conferível.
  const showcaseEvidences = [
    { id: 'demo_ev_terms', type: 'TERMS_ACCEPTANCE' as const, value: 'aceite-demo-2100', displayValue: 'Aceite dos termos no checkout (registro aceite-demo-2100)', source: 'MERCHANT' as const, sourceProvider: 'demo-commerce', sourceReference: 'aceite-demo-2100', verificationStatus: 'VERIFIED' as const },
    { id: 'demo_ev_fraud', type: 'ANTIFRAUD_SCORE' as const, value: 'aprovado (score 12/100)', displayValue: 'Análise antifraude aprovada — score de risco 12/100', source: 'ANTIFRAUD' as const, sourceProvider: 'demo-antifraude', sourceReference: 'demo-af-2100', verificationStatus: 'VERIFIED' as const },
    { id: 'demo_ev_comms', type: 'COMMUNICATION_HISTORY' as const, value: 'atendimento demo-CH-889', displayValue: 'Histórico de atendimento pós-venda (protocolo demo-CH-889)', source: 'MERCHANT' as const, sourceProvider: null, sourceReference: 'demo-CH-889', verificationStatus: 'VERIFIED' as const },
    { id: 'demo_ev_policy', type: 'REFUND_POLICY' as const, value: 'politica-v3', displayValue: 'Política de troca e reembolso v3, aceita no checkout', source: 'MERCHANT' as const, sourceProvider: null, sourceReference: 'politica-v3', verificationStatus: 'VERIFIED' as const },
  ];
  for (const evidence of showcaseEvidences) {
    await repository.addEvidence({
      id: evidence.id,
      organizationId: DEMO_ORGANIZATION_ID,
      medId: showcase.id,
      type: evidence.type,
      value: evidence.value,
      displayValue: evidence.displayValue,
      source: evidence.source,
      sourceProvider: evidence.sourceProvider,
      sourceReference: evidence.sourceReference,
      receivedAt: days(-5),
      verifiedAt: days(-5),
      verificationStatus: evidence.verificationStatus,
      documentId: null,
      metadata: {},
      createdAt: days(-5),
      createdBy: 'demo',
    });
  }

  await repository.addEvidence({
    id: 'demo_ev_comm',
    organizationId: DEMO_ORGANIZATION_ID,
    medId: showcase.id,
    type: 'DELIVERY_COMMUNICATION',
    value: {
      template: 'DELIVERY_CONFIRMATION',
      from: 'Loja Demonstração',
      to: 'cliente.tres@exemplo.demo',
      subject: 'Seu pedido foi entregue',
      sentAt: days(-20),
      body:
        'Olá,\n\nSeu pedido DEMO-PED-2100 foi entregue no endereço cadastrado (rastreio DM987654321BR).\n\nObrigado pela preferência.',
      reference: 'DM987654321BR',
    },
    displayValue: 'Comprovante enviado a cliente.tres@exemplo.demo: Seu pedido foi entregue',
    source: 'MERCHANT',
    sourceProvider: null,
    sourceReference: 'demo-msg-2100',
    receivedAt: days(-20),
    verifiedAt: null,
    verificationStatus: 'UNVERIFIED',
    documentId: null,
    metadata: { reconstruction: true, template: 'DELIVERY_CONFIRMATION' },
    createdAt: days(-5),
    createdBy: 'demo',
  });

  // Defesa já gerada, pelo mesmo engine determinístico do produto.
  const showcaseCase = {
    med: (await repository.getMed(DEMO_ORGANIZATION_ID, showcase.id)) ?? showcase,
    transaction: showcaseTransaction,
    customer: showcaseCustomer,
    order: showcaseOrder,
    tracking: showcaseTracking,
    digitalDelivery: null,
    evidences: await repository.listEvidence(DEMO_ORGANIZATION_ID, showcase.id),
    documents: await repository.listDocuments(DEMO_ORGANIZATION_ID, showcase.id),
  };
  const { defense } = generateDefense({
    medCase: showcaseCase,
    version: 1,
    defenseId: 'demo_def_100',
    generatedBy: 'demo',
  });
  await repository.saveDefense(defense);

  // A defesa nasce junto com o MED: os outros casos demo também carregam a
  // minuta v1, como aconteceria com um caso chegando pelo webhook ou pelo lote.
  for (const [medId, defenseId] of [
    ['demo_med_delivered', 'demo_def_1'],
    ['demo_med_incomplete', 'demo_def_2'],
  ] as const) {
    const bornCase = await repository.loadCase(DEMO_ORGANIZATION_ID, medId);
    if (!bornCase) continue;
    const born = generateDefense({
      medCase: bornCase,
      version: 1,
      defenseId,
      generatedBy: 'demo',
    });
    await repository.saveDefense(born.defense);
  }
}
