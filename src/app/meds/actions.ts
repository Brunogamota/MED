'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import {
  addDocument,
  addEvidence,
  uploadDocument,
  MAX_DOCUMENT_BYTES,
  createMed,
  createSubmission,
  generateDefenseForMed,
  upsertCustomer,
  upsertOrder,
  upsertTracking,
  upsertTransaction,
} from '@/services/medService';
import {
  createDocumentSchema,
  createEvidenceSchema,
  createMedSchema,
  upsertCustomerSchema,
  upsertOrderSchema,
  upsertTrackingSchema,
  upsertTransactionSchema,
} from '@/domain/schemas';
import { address, compact, dateTime, integer, number, text } from '@/lib/forms';
import { importParsedMeds } from '@/services/importService';
import { recordDigitalDelivery, recordShipment } from '@/services/fulfillmentService';
import { recordDigitalDeliverySchema, recordShipmentSchema, createCommunicationSchema } from '@/domain/schemas';
import { addCommunicationReconstruction } from '@/services/medService';
import { parseMedImport } from '@/domain/import/csv';

/**
 * Server actions used by the MED screens.
 *
 * They go through the same service layer as the REST API, so authorisation,
 * audit and status transitions behave identically whichever entry point is used,
 * and every payload is validated by the same Zod schema.
 */

function requireMedId(form: FormData): string {
  const medId = text(form, 'medId');
  if (!medId) throw new Error('medId ausente');
  return medId;
}

export async function createMedAction(form: FormData): Promise<void> {
  const auth = serverPageContext();

  const input = createMedSchema.parse(
    compact({
      medId: text(form, 'institutionMedId'),
      transactionId: text(form, 'transactionId'),
      endToEndId: text(form, 'endToEndId'),
      pixId: text(form, 'pixId'),
      amount: number(form, 'amount'),
      currency: text(form, 'currency') ?? 'BRL',
      transactionAt: dateTime(form, 'transactionAt'),
      openedAt: dateTime(form, 'openedAt') ?? new Date().toISOString(),
      responseDeadlineAt: dateTime(form, 'responseDeadlineAt'),
      reason: text(form, 'reason'),
      reasonDescription: text(form, 'reasonDescription'),
      requestingInstitution: text(form, 'requestingInstitution'),
      productType: text(form, 'productType'),
      merchantName: text(form, 'merchantName'),
      payerIp: text(form, 'payerIp'),
      payerDevice: text(form, 'payerDevice'),
      additionalInformation: text(form, 'additionalInformation'),
      payer: compact({
        document: text(form, 'payerDocument'),
        name: text(form, 'payerName'),
        email: text(form, 'payerEmail'),
        phone: text(form, 'payerPhone'),
      }),
      payerAddress: address(form, 'payerAddress'),
    }),
  );

  const med = await createMed(auth, input);
  redirect(`/meds/${med.id}`);
}

export async function upsertTransactionAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertTransactionSchema.parse(
    compact({
      externalId: text(form, 'externalId'),
      endToEndId: text(form, 'endToEndId'),
      amount: number(form, 'amount'),
      currency: text(form, 'currency') ?? 'BRL',
      method: text(form, 'method'),
      status: text(form, 'status'),
      authorizedAt: dateTime(form, 'authorizedAt'),
      capturedAt: dateTime(form, 'capturedAt'),
      provider: text(form, 'provider'),
      providerReference: text(form, 'providerReference'),
    }),
  );

  await upsertTransaction(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertCustomerAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertCustomerSchema.parse(
    compact({
      identification: compact({
        document: text(form, 'document'),
        name: text(form, 'name'),
        email: text(form, 'email'),
        phone: text(form, 'phone'),
      }),
      address: address(form, 'address'),
      accountCreatedAt: dateTime(form, 'accountCreatedAt'),
      externalId: text(form, 'externalId'),
    }),
  );

  await upsertCustomer(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertOrderAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const itemName = text(form, 'itemName');
  const items = itemName
    ? [
        compact({
          name: itemName,
          sku: text(form, 'itemSku'),
          quantity: integer(form, 'itemQuantity') ?? 1,
          unitAmount: number(form, 'itemUnitAmount'),
        }),
      ]
    : [];

  const input = upsertOrderSchema.parse(
    compact({
      externalId: text(form, 'externalId'),
      productType: text(form, 'productType'),
      items,
      totalAmount: number(form, 'totalAmount'),
      placedAt: dateTime(form, 'placedAt'),
      checkoutIp: text(form, 'checkoutIp'),
      deviceFingerprint: text(form, 'deviceFingerprint'),
      userAgent: text(form, 'userAgent'),
      shippingAddress: address(form, 'shipping'),
      provider: text(form, 'provider'),
      providerReference: text(form, 'providerReference'),
    }),
  );

  await upsertOrder(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertTrackingAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertTrackingSchema.parse(
    compact({
      carrier: text(form, 'carrier'),
      trackingCode: text(form, 'trackingCode'),
      status: text(form, 'status'),
      postedAt: dateTime(form, 'postedAt'),
      deliveredAt: dateTime(form, 'deliveredAt'),
      receiverName: text(form, 'receiverName'),
      // Tracking events come from the carrier integration or the API, never
      // from a form: an operator typing logistics events by hand would be
      // creating evidence rather than recording it.
      events: [],
      source: text(form, 'source') ?? 'MANUAL',
      sourceProvider: text(form, 'sourceProvider'),
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await upsertTracking(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function addEvidenceAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createEvidenceSchema.parse(
    compact({
      type: text(form, 'type'),
      value: text(form, 'value'),
      displayValue: text(form, 'displayValue'),
      source: text(form, 'source') ?? 'MANUAL',
      sourceProvider: text(form, 'sourceProvider'),
      sourceReference: text(form, 'sourceReference'),
      receivedAt: dateTime(form, 'receivedAt'),
      verificationStatus: text(form, 'verificationStatus') ?? 'UNVERIFIED',
      metadata: {},
    }),
  );

  await addEvidence(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function addDocumentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createDocumentSchema.parse(
    compact({
      kind: text(form, 'kind'),
      filename: text(form, 'filename'),
      contentType: text(form, 'contentType') ?? 'application/pdf',
      byteSize: integer(form, 'byteSize') ?? 0,
      storageKey: text(form, 'storageKey'),
      checksumSha256: text(form, 'checksumSha256'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await addDocument(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function uploadDocumentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Arquivo excede o limite de ${Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB`,
    );
  }

  await uploadDocument(auth, medId, {
    kind: (text(form, 'kind') ?? 'OTHER') as Parameters<typeof uploadDocument>[2]['kind'],
    filename: file.name || 'documento',
    contentType: file.type || 'application/octet-stream',
    bytes: new Uint8Array(await file.arrayBuffer()),
    source: (text(form, 'source') ?? 'MERCHANT') as Parameters<typeof uploadDocument>[2]['source'],
    sourceReference: text(form, 'sourceReference') ?? null,
  });

  revalidatePath(`/meds/${medId}`);
}

/**
 * Registro de entrega de produto fisico.
 *
 * Quando o operador marca "gerar defesa", a defesa sai na mesma acao — e esse o
 * fluxo real: definiu o status, quer o PDF. O que nao acontece e a data ser
 * preenchida sozinha: marco sem horario nao vira evento.
 */
export async function recordShipmentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = recordShipmentSchema.parse(
    compact({
      status: text(form, 'status'),
      trackingCode: text(form, 'trackingCode'),
      carrier: text(form, 'carrier'),
      receiverName: text(form, 'receiverName'),
      inProductionAt: dateTime(form, 'inProductionAt'),
      postedAt: dateTime(form, 'postedAt'),
      inTransitAt: dateTime(form, 'inTransitAt'),
      outForDeliveryAt: dateTime(form, 'outForDeliveryAt'),
      deliveredAt: dateTime(form, 'deliveredAt'),
      notDeliveredAt: dateTime(form, 'notDeliveredAt'),
      returnedAt: dateTime(form, 'returnedAt'),
      source: text(form, 'source') ?? 'MANUAL',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await recordShipment(auth, medId, input);
  if (form.get('generateDefense') === 'on') {
    await generateDefenseForMed(auth, medId, { useLlm: false });
  }
  revalidatePath(`/meds/${medId}`);
}

/** Registro de entrega digital, servico ou assinatura. */
export async function recordDigitalDeliveryAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = recordDigitalDeliverySchema.parse(
    compact({
      channel: text(form, 'channel'),
      sentTo: text(form, 'sentTo'),
      sentAt: dateTime(form, 'sentAt'),
      platform: text(form, 'platform'),
      firstAccessAt: dateTime(form, 'firstAccessAt'),
      accessCount: integer(form, 'accessCount'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await recordDigitalDelivery(auth, medId, input);
  if (form.get('generateDefense') === 'on') {
    await generateDefenseForMed(auth, medId, { useLlm: false });
  }
  revalidatePath(`/meds/${medId}`);
}

export async function generateDefenseAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();
  await generateDefenseForMed(auth, medId, { useLlm: form.get('useLlm') === 'on' });
  revalidatePath(`/meds/${medId}`);
}

export async function createSubmissionAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const provider = text(form, 'provider') ?? 'generic-json';
  const auth = serverPageContext();
  await createSubmission(auth, medId, { provider });
  revalidatePath(`/meds/${medId}`);
}

// ---------------------------------------------------------------------------
// Acoes em lote da fila
// ---------------------------------------------------------------------------

function medIdsFrom(form: FormData): string[] {
  const raw = text(form, 'medIds');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Regera a minuta dos casos selecionados. Falha individual não trava o lote. */
export async function batchGenerateDefensesAction(form: FormData): Promise<void> {
  const auth = serverPageContext();
  for (const medId of medIdsFrom(form)) {
    try {
      await generateDefenseForMed(auth, medId, { useLlm: false });
    } catch {
      // Caso inelegível (ex.: sem permissão ou inexistente) fica como está.
    }
  }
  revalidatePath('/meds');
}

/** Prepara o payload de envio dos casos selecionados, um a um. */
export async function batchPrepareSubmissionsAction(form: FormData): Promise<void> {
  const auth = serverPageContext();
  for (const medId of medIdsFrom(form)) {
    try {
      await createSubmission(auth, medId, { provider: 'generic-json' });
    } catch {
      // Sem defesa ou caso inelegível: pulado; o operador vê o estado na fila.
    }
  }
  revalidatePath('/meds');
}

// ---------------------------------------------------------------------------
// Importacao em lote
// ---------------------------------------------------------------------------

/**
 * Le o arquivo colado ou enviado. A analise nao grava nada: o operador confere
 * o que foi reconhecido antes de qualquer escrita.
 */
async function readImportText(form: FormData): Promise<string> {
  const file = form.get('file');
  if (file instanceof File && file.size > 0) return file.text();
  return text(form, 'csv') ?? '';
}

export interface ImportPreviewState {
  csv: string;
  defaultOpenedAt: string | null;
  batchReference: string | null;
  parsed: ReturnType<typeof parseMedImport> | null;
  report: Awaited<ReturnType<typeof importParsedMeds>> | null;
  error: string | null;
}

export async function previewImportAction(
  _previous: ImportPreviewState | null,
  form: FormData,
): Promise<ImportPreviewState> {
  const csv = await readImportText(form);
  const defaultOpenedAt = dateTime(form, 'defaultOpenedAt') ?? null;
  const batchReference = text(form, 'batchReference') ?? null;

  if (csv.trim().length === 0) {
    return {
      csv: '',
      defaultOpenedAt,
      batchReference,
      parsed: null,
      report: null,
      error: 'Cole o conteudo do arquivo ou selecione um arquivo CSV.',
    };
  }

  return {
    csv,
    defaultOpenedAt,
    batchReference,
    parsed: parseMedImport(csv),
    report: null,
    error: null,
  };
}

export async function confirmImportAction(
  _previous: ImportPreviewState | null,
  form: FormData,
): Promise<ImportPreviewState> {
  const auth = serverPageContext();
  const csv = text(form, 'csv') ?? '';
  const defaultOpenedAt = text(form, 'defaultOpenedAt') ?? null;
  const batchReference = text(form, 'batchReference') ?? null;

  const parsed = parseMedImport(csv);
  if (parsed.fatalError) {
    return { csv, defaultOpenedAt, batchReference, parsed, report: null, error: parsed.fatalError };
  }

  const report = await importParsedMeds(auth, parsed, {
    defaultOpenedAt: defaultOpenedAt ?? undefined,
    batchReference: batchReference ?? undefined,
  });

  revalidatePath('/meds');
  return { csv, defaultOpenedAt, batchReference, parsed, report, error: null };
}

// ---------------------------------------------------------------------------
// Comprovante de comunicação
// ---------------------------------------------------------------------------

export async function addCommunicationAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createCommunicationSchema.parse(
    compact({
      template: text(form, 'template') ?? 'GENERIC',
      from: text(form, 'from'),
      to: text(form, 'to'),
      toName: text(form, 'toName'),
      subject: text(form, 'subject'),
      sentAt: dateTime(form, 'sentAt'),
      body: text(form, 'body'),
      reference: text(form, 'reference'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await addCommunicationReconstruction(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}
