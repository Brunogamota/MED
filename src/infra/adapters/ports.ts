import type {
  Address,
  Customer,
  Evidence,
  IsoDateTime,
  JsonValue,
  Order,
  ShipmentStatus,
  Tracking,
  TrackingEvent,
  Transaction,
} from '@/domain/types';

/**
 * Integration ports.
 *
 * Provider-specific logic lives behind these interfaces and never leaks into
 * the domain. Nothing here is implemented against a real provider yet: each
 * integration is added as a separate adapter that fills these shapes with data
 * it actually received, keeping the provenance fields populated.
 *
 * Every port returns data that is either present or absent. An adapter must
 * never fabricate a field to satisfy a shape — omit it and let the Evidence
 * Engine report it as MISSING.
 */

export interface ProviderResult<T> {
  data: T | null;
  /** Raw provider reference so the value can be re-checked later. */
  sourceReference: string | null;
  fetchedAt: IsoDateTime;
}

export interface PaymentProviderAdapter {
  readonly provider: string;
  fetchTransaction(reference: string): Promise<ProviderResult<Partial<Transaction>>>;
}

export interface OrderProviderAdapter {
  readonly provider: string;
  fetchOrder(reference: string): Promise<ProviderResult<Partial<Order>>>;
  fetchCustomer(reference: string): Promise<ProviderResult<Partial<Customer>>>;
}

export interface TrackingProviderAdapter {
  readonly provider: string;
  fetchTracking(trackingCode: string): Promise<
    ProviderResult<{
      status: ShipmentStatus;
      carrier?: string;
      postedAt?: IsoDateTime;
      deliveredAt?: IsoDateTime;
      receiverName?: string;
      events: TrackingEvent[];
    }>
  >;
}

export interface FraudProviderAdapter {
  readonly provider: string;
  fetchAssessment(reference: string): Promise<
    ProviderResult<{ score: number; decision: string; checkedAt: IsoDateTime }>
  >;
}

export interface MerchantAdapter {
  readonly provider: string;
  fetchAccessLogs(customerReference: string): Promise<ProviderResult<TrackingEvent[]>>;
}

export interface DocumentProviderAdapter {
  readonly provider: string;
  fetchDocument(reference: string): Promise<
    ProviderResult<{ filename: string; contentType: string; bytes: Uint8Array }>
  >;
}

/** Where an adapter's result becomes evidence, keeping its origin attached. */
export interface EvidenceProjection {
  evidences: Partial<Evidence>[];
}

export type { Address, JsonValue, Tracking };
