import type {
  DeliveryChannel,
  DigitalDelivery,
  EvidenceSource,
  IsoDateTime,
  ShipmentStatus,
  Tracking,
  TrackingEvent,
} from '@/domain/types';
import type { AuthContext } from '@/infra/auth/context';
import { assertCan } from '@/infra/auth/rbac';
import { getRepository } from '@/infra/container';
import { recordAudit } from '@/services/audit';
import { NotFoundError, ValidationError } from '@/services/errors';
import { newId } from '@/lib/ids';
import { toJson } from '@/lib/json';

/**
 * Registro de entrega — o passo em que o operador informa o que aconteceu com
 * o pedido e o sistema transforma isso em evidência datada.
 *
 * Duas regras governam este arquivo:
 *
 *  1. Status sozinho não prova nada. Cada marco só vira evento da timeline se
 *     vier com a data e a hora correspondentes. Marcar "entregue" sem informar
 *     quando não gera afirmação de entrega — geraria uma data inventada.
 *  2. Marco informado a mao e evidência de origem MANUAL, e fica registrado
 *     como tal. O operador esta transcrevendo o que o ERP ou a transportadora
 *     dizem, e a defesa mostra essa procedência com honestidade, o que reduz a
 *     força da evidência em comparacao com o dado vindo direto do provedor.
 */

export interface FulfillmentMilestones {
  inProductionAt?: IsoDateTime;
  postedAt?: IsoDateTime;
  inTransitAt?: IsoDateTime;
  outForDeliveryAt?: IsoDateTime;
  deliveredAt?: IsoDateTime;
  notDeliveredAt?: IsoDateTime;
  returnedAt?: IsoDateTime;
}

export interface RecordShipmentInput extends FulfillmentMilestones {
  status: ShipmentStatus;
  trackingCode?: string;
  carrier?: string;
  receiverName?: string;
  source: EvidenceSource;
  sourceProvider?: string;
  sourceReference?: string;
}

const MILESTONE_EVENTS: {
  key: keyof FulfillmentMilestones;
  status: ShipmentStatus;
  description: string;
}[] = [
  { key: 'inProductionAt', status: 'IN_PRODUCTION', description: 'Pedido em produção/separação' },
  { key: 'postedAt', status: 'POSTED', description: 'Pedido postado' },
  { key: 'inTransitAt', status: 'IN_TRANSIT', description: 'Pedido em trânsito' },
  { key: 'outForDeliveryAt', status: 'OUT_FOR_DELIVERY', description: 'Pedido saiu para entrega' },
  { key: 'deliveredAt', status: 'DELIVERED', description: 'Pedido entregue' },
  {
    key: 'notDeliveredAt',
    status: 'NOT_DELIVERED',
    description: 'Tentativa de entrega sem sucesso',
  },
  { key: 'returnedAt', status: 'RETURNED', description: 'Pedido devolvido ao remetente' },
];

/** Chave de identidade de um evento, usada para não duplicar na remontagem. */
function eventKey(event: TrackingEvent): string {
  return `${event.status}|${event.occurredAt}`;
}

export function buildMilestoneEvents(
  input: RecordShipmentInput,
  receiverName: string | null,
): TrackingEvent[] {
  const events: TrackingEvent[] = [];

  for (const milestone of MILESTONE_EVENTS) {
    const occurredAt = input[milestone.key];
    if (!occurredAt) continue;

    const isDelivery = milestone.status === 'DELIVERED';
    events.push({
      occurredAt,
      status: milestone.status,
      description:
        isDelivery && receiverName
          ? `${milestone.description} - recebido por ${receiverName}`
          : milestone.description,
      location: null,
      source: input.source,
      sourceReference: input.sourceReference ?? input.trackingCode ?? null,
    });
  }

  return events;
}

/**
 * Grava o status de entrega de um produto físico.
 *
 * Eventos vindos de integracao (qualquer origem que não seja MANUAL) são
 * preservados: o registro manual complementa o que a transportadora informou,
 * nunca apaga.
 */
export async function recordShipment(
  auth: AuthContext,
  medId: string,
  input: RecordShipmentInput,
): Promise<Tracking> {
  assertCan(auth.role, 'med:write');

  if (input.status === 'DELIVERED' && !input.deliveredAt) {
    throw new ValidationError(
      'Para marcar como entregue é preciso informar a data e a hora da entrega. Sem isso a defesa não pode afirmar que houve entrega.',
    );
  }

  const repository = await getRepository();
  const medCase = await repository.loadCase(auth.organizationId, medId);
  if (!medCase) throw new NotFoundError(`MED ${medId} não encontrado`);

  const existing = medCase.tracking;
  const receiverName = input.receiverName ?? existing?.receiverName ?? null;

  const preserved = (existing?.events ?? []).filter((event) => event.source !== 'MANUAL');
  const preservedKeys = new Set(preserved.map(eventKey));
  const manual = buildMilestoneEvents(input, receiverName).filter(
    (event) => !preservedKeys.has(eventKey(event)),
  );

  const events = [...preserved, ...manual].sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
  );

  const tracking: Tracking = {
    id: existing?.id ?? newId('trk'),
    organizationId: auth.organizationId,
    medId,
    carrier: input.carrier ?? existing?.carrier ?? null,
    trackingCode: input.trackingCode ?? existing?.trackingCode ?? null,
    status: input.status,
    postedAt: input.postedAt ?? existing?.postedAt ?? null,
    deliveredAt: input.deliveredAt ?? existing?.deliveredAt ?? null,
    receiverName,
    events,
    source: input.source,
    sourceProvider: input.sourceProvider ?? existing?.sourceProvider ?? null,
    sourceReference: input.sourceReference ?? existing?.sourceReference ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertTracking(tracking);
  await recordAudit(repository, auth, {
    action: 'TRACKING_UPSERTED',
    entityType: 'Tracking',
    entityId: saved.id,
    medId,
    source: input.source,
    previousValue: toJson(existing),
    newValue: toJson(saved),
  });

  return saved;
}

export interface RecordDigitalDeliveryInput {
  channel: DeliveryChannel;
  sentTo?: string;
  sentAt?: IsoDateTime;
  platform?: string;
  firstAccessAt?: IsoDateTime;
  accessCount?: number;
  source: EvidenceSource;
  sourceProvider?: string;
  sourceReference?: string;
}

/**
 * Grava a entrega de produto digital, serviço ou assinatura.
 *
 * O que sustenta a defesa aqui e o envio do acesso — data, canal e destino —,
 * não a confirmação do comprador. Depender do contestante confirmar que
 * recebeu deixaria a defesa refem de alguem que não tem incentivo para
 * responder dentro do prazo do MED.
 */
export async function recordDigitalDelivery(
  auth: AuthContext,
  medId: string,
  input: RecordDigitalDeliveryInput,
): Promise<DigitalDelivery> {
  assertCan(auth.role, 'med:write');

  if (input.sentTo && !input.sentAt) {
    throw new ValidationError(
      'Informe a data e a hora do envio do acesso. Um destino sem data não comprova entrega.',
    );
  }

  const repository = await getRepository();
  const medCase = await repository.loadCase(auth.organizationId, medId);
  if (!medCase) throw new NotFoundError(`MED ${medId} não encontrado`);

  const existing = medCase.digitalDelivery;
  const delivery: DigitalDelivery = {
    id: existing?.id ?? newId('dld'),
    organizationId: auth.organizationId,
    medId,
    channel: input.channel,
    sentTo: input.sentTo ?? existing?.sentTo ?? null,
    sentAt: input.sentAt ?? existing?.sentAt ?? null,
    platform: input.platform ?? existing?.platform ?? null,
    firstAccessAt: input.firstAccessAt ?? existing?.firstAccessAt ?? null,
    accessCount: input.accessCount ?? existing?.accessCount ?? null,
    source: input.source,
    sourceProvider: input.sourceProvider ?? existing?.sourceProvider ?? null,
    sourceReference: input.sourceReference ?? existing?.sourceReference ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const saved = await repository.upsertDigitalDelivery(delivery);
  await recordAudit(repository, auth, {
    action: 'TRACKING_UPSERTED',
    entityType: 'DigitalDelivery',
    entityId: saved.id,
    medId,
    source: input.source,
    previousValue: toJson(existing),
    newValue: toJson(saved),
  });

  return saved;
}
