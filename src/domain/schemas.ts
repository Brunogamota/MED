import { z } from 'zod';
import {
  DOCUMENT_KINDS,
  EVIDENCE_SOURCES,
  EVIDENCE_TYPES,
  MED_REASONS,
  MED_STATUSES,
  PRODUCT_TYPES,
  SHIPMENT_STATUSES,
  VERIFICATION_STATUSES,
} from '@/domain/types';

/**
 * Validation schemas for everything crossing the API boundary.
 *
 * Optional fields are optional on purpose: the API never fills a gap with a
 * default value, because a defaulted fact is an invented fact. Absent data is
 * stored as absent and later reported as MISSING.
 */

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data invalida (use ISO-8601)');

const nonEmpty = z.string().trim().min(1);

export const addressSchema = z.object({
  street: nonEmpty.optional(),
  number: nonEmpty.optional(),
  complement: nonEmpty.optional(),
  district: nonEmpty.optional(),
  city: nonEmpty.optional(),
  state: nonEmpty.optional(),
  postalCode: nonEmpty.optional(),
  country: nonEmpty.optional(),
});

export const partySchema = z.object({
  document: nonEmpty.optional(),
  name: nonEmpty.optional(),
  email: z.email().optional(),
  phone: nonEmpty.optional(),
});

export const createMedSchema = z.object({
  medId: nonEmpty,
  transactionId: nonEmpty.optional(),
  endToEndId: nonEmpty.optional(),
  pixId: nonEmpty.optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
  transactionAt: isoDateTime.optional(),
  openedAt: isoDateTime,
  responseDeadlineAt: isoDateTime.optional(),
  reason: z.enum(MED_REASONS),
  reasonDescription: nonEmpty.optional(),
  requestingInstitution: nonEmpty.optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  merchantId: nonEmpty.optional(),
  merchantName: nonEmpty.optional(),
  payer: partySchema.default({}),
  payerAddress: addressSchema.optional(),
  payerIp: nonEmpty.optional(),
  payerDevice: nonEmpty.optional(),
  additionalInformation: nonEmpty.optional(),
});
export type CreateMedInput = z.infer<typeof createMedSchema>;

export const updateMedSchema = z.object({
  productType: z.enum(PRODUCT_TYPES).optional(),
  status: z.enum(MED_STATUSES).optional(),
  responseDeadlineAt: isoDateTime.optional(),
  additionalInformation: nonEmpty.optional(),
});
export type UpdateMedInput = z.infer<typeof updateMedSchema>;

export const upsertTransactionSchema = z.object({
  externalId: nonEmpty.optional(),
  endToEndId: nonEmpty.optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
  method: nonEmpty.optional(),
  status: nonEmpty.optional(),
  authorizedAt: isoDateTime.optional(),
  capturedAt: isoDateTime.optional(),
  provider: nonEmpty.optional(),
  providerReference: nonEmpty.optional(),
});
export type UpsertTransactionInput = z.infer<typeof upsertTransactionSchema>;

export const upsertCustomerSchema = z.object({
  identification: partySchema,
  address: addressSchema.optional(),
  accountCreatedAt: isoDateTime.optional(),
  externalId: nonEmpty.optional(),
});
export type UpsertCustomerInput = z.infer<typeof upsertCustomerSchema>;

export const orderItemSchema = z.object({
  name: nonEmpty,
  sku: nonEmpty.optional(),
  quantity: z.number().int().positive(),
  unitAmount: z.number().nonnegative().optional(),
});

export const upsertOrderSchema = z.object({
  externalId: nonEmpty.optional(),
  productType: z.enum(PRODUCT_TYPES),
  items: z.array(orderItemSchema).default([]),
  totalAmount: z.number().nonnegative().optional(),
  placedAt: isoDateTime.optional(),
  checkoutIp: nonEmpty.optional(),
  deviceFingerprint: nonEmpty.optional(),
  userAgent: nonEmpty.optional(),
  shippingAddress: addressSchema.optional(),
  provider: nonEmpty.optional(),
  providerReference: nonEmpty.optional(),
});
export type UpsertOrderInput = z.infer<typeof upsertOrderSchema>;

export const trackingEventSchema = z.object({
  occurredAt: isoDateTime,
  status: z.enum(SHIPMENT_STATUSES),
  description: nonEmpty,
  location: nonEmpty.optional(),
  source: z.enum(EVIDENCE_SOURCES),
  sourceReference: nonEmpty.optional(),
});

export const upsertTrackingSchema = z.object({
  carrier: nonEmpty.optional(),
  trackingCode: nonEmpty,
  status: z.enum(SHIPMENT_STATUSES),
  postedAt: isoDateTime.optional(),
  deliveredAt: isoDateTime.optional(),
  receiverName: nonEmpty.optional(),
  events: z.array(trackingEventSchema).default([]),
  source: z.enum(EVIDENCE_SOURCES),
  sourceProvider: nonEmpty.optional(),
  sourceReference: nonEmpty.optional(),
});
export type UpsertTrackingInput = z.infer<typeof upsertTrackingSchema>;

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

export const createEvidenceSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  value: jsonValue,
  displayValue: nonEmpty.optional(),
  source: z.enum(EVIDENCE_SOURCES),
  sourceProvider: nonEmpty.optional(),
  sourceReference: nonEmpty.optional(),
  receivedAt: isoDateTime.optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).default('UNVERIFIED'),
  documentId: nonEmpty.optional(),
  metadata: z.record(z.string(), jsonValue).default({}),
});
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;

export const createDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  filename: nonEmpty,
  contentType: nonEmpty,
  byteSize: z.number().int().nonnegative(),
  storageKey: nonEmpty,
  checksumSha256: nonEmpty.optional(),
  source: z.enum(EVIDENCE_SOURCES),
  sourceReference: nonEmpty.optional(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const generateDefenseSchema = z.object({
  /** Ask the LLM to rewrite the deterministic text. Falls back on any violation. */
  useLlm: z.boolean().default(false),
});
export type GenerateDefenseRequest = z.infer<typeof generateDefenseSchema>;

export const createSubmissionSchema = z.object({
  provider: nonEmpty,
  defenseId: nonEmpty.optional(),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const listMedsQuerySchema = z.object({
  status: z.enum(MED_STATUSES).optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
