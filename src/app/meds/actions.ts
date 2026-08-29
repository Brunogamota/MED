'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import {
  addDocument,
  addEvidence,
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
