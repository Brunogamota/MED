import type { MedCase } from '@/domain/case';
import type { AuditLogEntry, Evidence, Order, Tracking } from '@/domain/types';
import type { CreateCommunicationInput, UpsertOrderInput, UpsertTrackingInput } from '@/domain/schemas';
import type { AuthContext } from '@/infra/auth/context';
import { assertCan } from '@/infra/auth/rbac';
import { getRepository } from '@/infra/container';
import type { ImportBatch } from '@/infra/repositories/types';
import { newId } from '@/lib/ids';
import { toJson } from '@/lib/json';
import { deriveStatus } from '@/services/medService';

/**
 * Escritas de uma importação em lote, montadas em memória e gravadas de uma vez.
 *
 * Faz o mesmo que `upsertOrder`, `upsertTracking`,
 * `addCommunicationReconstruction` e a remoção de reconstrução do
 * `medService` — os mesmos objetos, a mesma origem, a mesma linha de
 * auditoria e o mesmo recálculo de status —, mas sem uma ida ao banco por
 * escrita. Com centenas de casos, gravar um por um estourava o tempo da função
 * e a importação morria no meio.
 */
export class ImportBatchWriter {
  private readonly batch: ImportBatch = {
    orders: [],
    trackings: [],
    evidences: [],
    removeEvidenceIds: [],
    audits: [],
    medUpdates: [],
  };

  constructor(private readonly auth: AuthContext) {
    assertCan(auth.role, 'med:write');
    assertCan(auth.role, 'evidence:write');
  }

  private audit(entry: Omit<AuditLogEntry, 'id' | 'organizationId' | 'actor' | 'actorRole' | 'occurredAt'>): void {
    this.batch.audits.push({
      id: newId('aud'),
      organizationId: this.auth.organizationId,
      actor: this.auth.actor,
      actorRole: this.auth.role,
      occurredAt: new Date().toISOString(),
      ...entry,
    });
  }

  /** Pedido novo para um caso que não tinha. Devolve o caso já com ele. */
  order(medCase: MedCase, input: UpsertOrderInput): MedCase {
    const order: Order = {
      id: newId('ord'),
      organizationId: this.auth.organizationId,
      medId: medCase.med.id,
      externalId: input.externalId ?? null,
      productType: input.productType,
      items: input.items,
      totalAmount: input.totalAmount ?? null,
      placedAt: input.placedAt ?? null,
      checkoutIp: input.checkoutIp ?? null,
      deviceFingerprint: input.deviceFingerprint ?? null,
      userAgent: input.userAgent ?? null,
      shippingAddress: input.shippingAddress ?? null,
      provider: input.provider ?? null,
      providerReference: input.providerReference ?? null,
      createdAt: new Date().toISOString(),
    };
    this.batch.orders.push(order);
    this.audit({
      action: 'ORDER_UPSERTED',
      entityType: 'Order',
      entityId: order.id,
      medId: medCase.med.id,
      source: input.provider ? 'API' : 'MANUAL',
      previousValue: toJson(medCase.order),
      newValue: toJson(order),
    });
    // O tipo do pedido conduz a matriz de evidência; o MED adota quando não tem.
    const med = medCase.med.productType ? medCase.med : { ...medCase.med, productType: input.productType };
    if (!medCase.med.productType) {
      this.batch.medUpdates.push({ medId: medCase.med.id, productType: input.productType });
    }
    return { ...medCase, med, order };
  }

  /** Acompanhamento completo do caso (substitui o anterior). */
  tracking(medCase: MedCase, input: UpsertTrackingInput): MedCase {
    const tracking: Tracking = {
      id: medCase.tracking?.id ?? newId('trk'),
      organizationId: this.auth.organizationId,
      medId: medCase.med.id,
      carrier: input.carrier ?? null,
      trackingCode: input.trackingCode ?? null,
      status: input.status,
      postedAt: input.postedAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
      receiverName: input.receiverName ?? null,
      events: input.events.map((event) => ({
        occurredAt: event.occurredAt,
        status: event.status,
        description: event.description,
        location: event.location ?? null,
        source: event.source,
        sourceReference: event.sourceReference ?? null,
      })),
      source: input.source,
      sourceProvider: input.sourceProvider ?? null,
      sourceReference: input.sourceReference ?? null,
      createdAt: medCase.tracking?.createdAt ?? new Date().toISOString(),
    };
    this.batch.trackings = this.batch.trackings.filter((item) => item.medId !== tracking.medId);
    this.batch.trackings.push(tracking);
    this.audit({
      action: 'TRACKING_UPSERTED',
      entityType: 'Tracking',
      entityId: tracking.id,
      medId: medCase.med.id,
      source: input.source,
      previousValue: toJson(medCase.tracking),
      newValue: toJson(tracking),
    });
    return { ...medCase, tracking };
  }

  /** Reconstrução de comunicação (comprovante). */
  reconstruction(medCase: MedCase, input: CreateCommunicationInput): MedCase {
    const now = new Date().toISOString();
    const receipt = {
      template: input.template,
      from: input.from,
      to: input.to,
      toName: input.toName ?? null,
      subject: input.subject,
      sentAt: input.sentAt ?? null,
      body: input.body,
      reference: input.reference ?? null,
    };
    const evidence: Evidence = {
      id: newId('ev'),
      organizationId: this.auth.organizationId,
      medId: medCase.med.id,
      type: 'DELIVERY_COMMUNICATION',
      value: receipt as unknown as Evidence['value'],
      displayValue: `Comprovante enviado a ${input.to}: ${input.subject}`,
      source: input.source,
      sourceProvider: null,
      sourceReference: input.sourceReference ?? null,
      receivedAt: input.sentAt ?? now,
      verifiedAt: null,
      verificationStatus: 'UNVERIFIED',
      documentId: null,
      metadata: { reconstruction: true, template: input.template, generatedAt: now },
      createdAt: now,
      createdBy: this.auth.actor,
    };
    this.batch.evidences.push(evidence);
    this.audit({
      action: 'EVIDENCE_ADDED',
      entityType: 'Evidence',
      entityId: evidence.id,
      medId: medCase.med.id,
      source: evidence.source,
      previousValue: null,
      newValue: toJson({ type: evidence.type, reconstruction: true, to: input.to, subject: input.subject }),
    });
    return { ...medCase, evidences: [...medCase.evidences, evidence] };
  }

  /** Remove uma reconstrução de comunicação. Evidência de origem externa não sai. */
  removeReconstruction(medCase: MedCase, evidenceId: string): MedCase {
    const target = medCase.evidences.find((evidence) => evidence.id === evidenceId);
    if (!target || target.type !== 'DELIVERY_COMMUNICATION') return medCase;
    this.batch.removeEvidenceIds.push(evidenceId);
    this.audit({
      action: 'EVIDENCE_UPDATED',
      entityType: 'Evidence',
      entityId: evidenceId,
      medId: medCase.med.id,
      source: 'MANUAL',
      previousValue: toJson({ removed: true, type: target.type, value: target.value }),
      newValue: null,
    });
    return { ...medCase, evidences: medCase.evidences.filter((evidence) => evidence.id !== evidenceId) };
  }

  /** Recalcula o status do caso com tudo que foi escrito nele. */
  status(medCase: MedCase, hasDefense: boolean): void {
    const next = deriveStatus(medCase, hasDefense);
    if (next === medCase.med.status) return;
    const existente = this.batch.medUpdates.find((update) => update.medId === medCase.med.id);
    if (existente) existente.status = next;
    else this.batch.medUpdates.push({ medId: medCase.med.id, status: next });
    this.audit({
      action: 'MED_STATUS_CHANGED',
      entityType: 'Med',
      entityId: medCase.med.id,
      medId: medCase.med.id,
      source: 'SYSTEM_DERIVED',
      previousValue: medCase.med.status,
      newValue: next,
    });
  }

  async flush(): Promise<void> {
    const repository = await getRepository();
    await repository.applyImportBatch(this.auth.organizationId, this.batch);
  }
}
