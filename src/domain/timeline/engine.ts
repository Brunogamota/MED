import type {
  Evidence,
  EvidenceSource,
  IsoDateTime,
  TimelineEvent,
  TimelineEventType,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { evidenceIdsOfTypes } from '@/domain/case';
import { parseIso } from '@/lib/format';

/**
 * Timeline Engine.
 *
 * Merges events coming from different origins into one ordered sequence.
 * Every event keeps its own source and source reference. Gaps are left as gaps:
 * no event is ever synthesised to make the story look continuous.
 */

interface Candidate {
  type: TimelineEventType;
  at: IsoDateTime | null | undefined;
  description: string;
  source: TimelineEvent['source'];
  sourceReference?: string | null;
  evidenceIds?: string[];
}

function push(events: TimelineEvent[], candidate: Candidate): void {
  const date = parseIso(candidate.at ?? null);
  if (!date) return; // no timestamp -> no timeline event
  events.push({
    type: candidate.type,
    occurredAt: date.toISOString(),
    description: candidate.description,
    source: candidate.source,
    sourceReference: candidate.sourceReference ?? null,
    evidenceIds: candidate.evidenceIds ?? [],
  });
}

/** Timestamp-bearing evidence types that map directly onto a timeline event. */
const EVIDENCE_EVENT_MAP: Partial<Record<Evidence['type'], {
  type: TimelineEventType;
  description: string;
}>> = {
  FIRST_ACCESS_AT: { type: 'customer.first_access', description: 'Primeiro acesso do cliente' },
  PASSWORD_CHANGE: { type: 'customer.password_change', description: 'Alteracao de senha' },
  SERVICE_ACCEPTANCE: { type: 'service.accepted', description: 'Aceite da contratacao do serviço' },
  SERVICE_EXECUTION: { type: 'service.executed', description: 'Execucao do serviço registrada' },
  ACCOUNT_CREATED_AT: { type: 'customer.account_created', description: 'Conta do cliente criada' },
};

/** Evidence types whose value may be a list of dated entries. */
const EVIDENCE_LOG_MAP: Partial<Record<Evidence['type'], {
  type: TimelineEventType;
  description: string;
}>> = {
  LOGIN_LOG: { type: 'customer.login', description: 'Login registrado' },
  DOWNLOAD_LOG: { type: 'customer.download', description: 'Download registrado' },
  ACCESS_LOG: { type: 'customer.login', description: 'Acesso registrado' },
};

function isDatedEntry(value: unknown): value is { occurredAt: string; description?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'occurredAt' in value &&
    typeof (value as { occurredAt: unknown }).occurredAt === 'string'
  );
}

const SHIPMENT_EVENT_TYPE: Record<string, TimelineEventType> = {
  CREATED: 'shipment.created',
  IN_PRODUCTION: 'order.in_production',
  POSTED: 'shipment.posted',
  IN_TRANSIT: 'shipment.in_transit',
  OUT_FOR_DELIVERY: 'shipment.out_for_delivery',
  DELIVERED: 'shipment.delivered',
  NOT_DELIVERED: 'shipment.not_delivered',
  RETURNED: 'shipment.returned',
  UNKNOWN: 'other',
};

export function buildTimeline(medCase: MedCase): TimelineEvent[] {
  const { med, transaction, customer, order, tracking, digitalDelivery, evidences, documents } =
    medCase;
  const events: TimelineEvent[] = [];

  push(events, {
    type: 'transaction.created',
    at: med.transactionAt ?? transaction?.createdAt,
    description: 'Transação realizada',
    source: transaction?.provider ? 'PAYMENT_PROVIDER' : 'MANUAL',
    sourceReference: transaction?.providerReference ?? med.endToEndId ?? null,
    evidenceIds: evidenceIdsOfTypes(evidences, ['END_TO_END_ID', 'TRANSACTION_RECEIPT']),
  });

  push(events, {
    type: 'payment.approved',
    at: transaction?.authorizedAt ?? transaction?.capturedAt,
    description: 'Pagamento aprovado',
    source: 'PAYMENT_PROVIDER',
    sourceReference: transaction?.providerReference ?? null,
    evidenceIds: evidenceIdsOfTypes(evidences, ['PAYMENT_AUTHORIZATION']),
  });

  push(events, {
    type: 'order.created',
    at: order?.placedAt,
    description: 'Pedido registrado',
    source: order?.provider ? 'API' : 'MANUAL',
    sourceReference: order?.providerReference ?? order?.externalId ?? null,
    evidenceIds: evidenceIdsOfTypes(evidences, ['ORDER_RECORD', 'ORDER_PLACED_AT']),
  });

  push(events, {
    type: 'customer.account_created',
    at: customer?.accountCreatedAt,
    description: 'Conta do cliente criada',
    source: 'MERCHANT',
    sourceReference: customer?.externalId ?? null,
    evidenceIds: evidenceIdsOfTypes(evidences, ['ACCOUNT_CREATED_AT']),
  });

  if (tracking) {
    const trackingEvidenceIds = evidenceIdsOfTypes(evidences, [
      'TRACKING_CODE',
      'TRACKING_EVENTS',
      'DELIVERY_CONFIRMATION',
      'DELIVERED_AT',
    ]);
    push(events, {
      type: 'shipment.posted',
      at: tracking.postedAt,
      description: tracking.carrier
        ? `Pedido postado (${tracking.carrier})`
        : 'Pedido postado',
      source: tracking.source,
      sourceReference: tracking.sourceReference ?? tracking.trackingCode ?? null,
      evidenceIds: trackingEvidenceIds,
    });
    for (const trackingEvent of tracking.events) {
      push(events, {
        type: SHIPMENT_EVENT_TYPE[trackingEvent.status] ?? 'other',
        at: trackingEvent.occurredAt,
        description: trackingEvent.location
          ? `${trackingEvent.description} - ${trackingEvent.location}`
          : trackingEvent.description,
        source: trackingEvent.source,
        sourceReference: trackingEvent.sourceReference ?? tracking.trackingCode ?? null,
        evidenceIds: trackingEvidenceIds,
      });
    }
    push(events, {
      type: 'shipment.delivered',
      at: tracking.deliveredAt,
      description: tracking.receiverName
        ? `Pedido entregue - recebido por ${tracking.receiverName}`
        : 'Pedido entregue',
      source: tracking.source,
      sourceReference: tracking.sourceReference ?? tracking.trackingCode ?? null,
      evidenceIds: trackingEvidenceIds,
    });
  }

  if (digitalDelivery) {
    const deliveryEvidenceIds = evidenceIdsOfTypes(evidences, [
      'ACCESS_SENT_AT',
      'ACCESS_SENT_TO',
      'ACCESS_DELIVERY_CHANNEL',
    ]);
    push(events, {
      type: 'access.sent',
      at: digitalDelivery.sentAt,
      description: digitalDelivery.sentTo
        ? `Acesso enviado para ${digitalDelivery.sentTo}`
        : 'Acesso enviado ao comprador',
      source: digitalDelivery.source,
      sourceReference: digitalDelivery.sourceReference ?? digitalDelivery.platform ?? null,
      evidenceIds: deliveryEvidenceIds,
    });
    push(events, {
      type: 'customer.first_access',
      at: digitalDelivery.firstAccessAt,
      description: 'Primeiro acesso do comprador ao produto',
      source: digitalDelivery.source,
      sourceReference: digitalDelivery.sourceReference ?? null,
      evidenceIds: evidenceIdsOfTypes(evidences, ['FIRST_ACCESS_AT']),
    });
  }

  for (const evidence of evidences) {
    const single = EVIDENCE_EVENT_MAP[evidence.type];
    if (single && typeof evidence.value === 'string') {
      push(events, {
        type: single.type,
        at: evidence.value,
        description: single.description,
        source: evidence.source,
        sourceReference: evidence.sourceReference,
        evidenceIds: [evidence.id],
      });
    }

    const log = EVIDENCE_LOG_MAP[evidence.type];
    if (log && Array.isArray(evidence.value)) {
      for (const entry of evidence.value) {
        if (!isDatedEntry(entry)) continue;
        push(events, {
          type: log.type,
          at: entry.occurredAt,
          description: entry.description ?? log.description,
          source: evidence.source,
          sourceReference: evidence.sourceReference,
          evidenceIds: [evidence.id],
        });
      }
    }
  }

  for (const document of documents) {
    push(events, {
      type: document.kind === 'INVOICE' ? 'invoice.created' : 'document.uploaded',
      at: document.uploadedAt,
      description:
        document.kind === 'INVOICE'
          ? `Nota fiscal anexada (${document.filename})`
          : `Documento anexado (${document.filename})`,
      source: document.source,
      sourceReference: document.sourceReference ?? document.id,
      evidenceIds: [],
    });
  }

  push(events, {
    type: 'med.opened',
    at: med.openedAt,
    description: med.requestingInstitution
      ? `MED aberto por ${med.requestingInstitution}`
      : 'MED aberto',
    source: 'WEBHOOK',
    sourceReference: med.medId,
    evidenceIds: [],
  });

  push(events, {
    type: 'med.deadline',
    at: med.responseDeadlineAt,
    description: 'Prazo final para resposta',
    source: 'WEBHOOK',
    sourceReference: med.medId,
    evidenceIds: [],
  });

  return sortTimeline(dedupeTimeline(events));
}

/**
 * Remove repeticoes do mesmo fato.
 *
 * O mesmo marco pode chegar por dois caminhos — o campo `deliveredAt` do
 * rastreio e o evento de entrega da lista — e são a mesma coisa, não duas
 * entregas. Dois eventos com o mesmo tipo e o mesmo instante são um só.
 *
 * Quem fica e a versão de origem mais autoritativa: a redacao da própria
 * transportadora vale mais do que a nossa parafrase, e e o que a instituição
 * espera ler. As evidências das duas versoes são preservadas, porque ambas
 * sustentam o mesmo fato.
 */
const SOURCE_AUTHORITY: Record<EvidenceSource, number> = {
  TRACKING_PROVIDER: 4,
  PAYMENT_PROVIDER: 4,
  ANTIFRAUD: 4,
  SHOPIFY: 3,
  ERP: 3,
  API: 3,
  WEBHOOK: 3,
  // Mensagem recebida, com id verificavel e remetente — vale mais que digitado
  // ou declarado pela loja. Abaixo do provedor porque texto de e-mail nao e
  // campo estruturado e o remetente pode ser forjado.
  EMAIL: 3,
  MERCHANT: 2,
  SYSTEM_DERIVED: 2,
  MANUAL: 1,
};

function authorityScore(event: TimelineEvent): number {
  return (
    SOURCE_AUTHORITY[event.source] * 1000 +
    event.description.length +
    (event.sourceReference ? 1 : 0)
  );
}

export function dedupeTimeline(events: TimelineEvent[]): TimelineEvent[] {
  const byKey = new Map<string, TimelineEvent>();

  for (const event of events) {
    const key = `${event.type}|${event.occurredAt}`;
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, event);
      continue;
    }

    const winner = authorityScore(event) > authorityScore(current) ? event : current;
    byKey.set(key, {
      ...winner,
      evidenceIds: [...new Set([...current.evidenceIds, ...event.evidenceIds])],
    });
  }

  return [...byKey.values()];
}

/** Chronological, with a stable tiebreak só output is reproducible. */
export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const delta = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    if (delta !== 0) return delta;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.description.localeCompare(b.description);
  });
}
