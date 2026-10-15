import type { ShipmentStatus, TrackingEvent } from '@/domain/types';
import { formatDateTimeSmart, parseIso } from '@/lib/format';
import { SHIPMENT_STATUS_LABEL } from '@/lib/labels';

/**
 * Etapas do pedido para o comprovante, a partir dos marcos registrados.
 *
 * Só entra marco que existe e tem data: o comprovante não desenha etapa
 * futura, não completa a sequência "esperada" e não supõe hora. Sem marco,
 * a lista sai vazia e a peça não mostra a coluna.
 */

export type TrackingStepState = 'completed' | 'current' | 'issue';

export interface TrackingStep {
  key: string;
  /** Texto do evento como foi registrado; sem texto, o nome do status. */
  title: string;
  statusLabel: string;
  dateLabel: string;
  occurredAt: string;
  state: TrackingStepState;
}

const ISSUE: ShipmentStatus[] = ['NOT_DELIVERED', 'RETURNED'];
/** Depois destes não há etapa seguinte: o último marco não fica "em andamento". */
const FINAL: ShipmentStatus[] = ['DELIVERED', 'RETURNED'];

export function trackingSteps(events: readonly TrackingEvent[] | null | undefined): TrackingStep[] {
  if (!events || events.length === 0) return [];

  const seen = new Set<string>();
  const dated = events
    .filter((event) => parseIso(event.occurredAt) !== null)
    .filter((event) => {
      const key = `${event.status}|${event.occurredAt}|${event.description.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (parseIso(a.occurredAt)?.getTime() ?? 0) - (parseIso(b.occurredAt)?.getTime() ?? 0));

  const lastIndex = dated.length - 1;
  return dated.map((event, index) => {
    const statusLabel = SHIPMENT_STATUS_LABEL[event.status];
    const title = event.description.trim() || statusLabel;
    const state: TrackingStepState = ISSUE.includes(event.status)
      ? 'issue'
      : index === lastIndex && !FINAL.includes(event.status)
        ? 'current'
        : 'completed';
    return {
      key: `${event.status}-${event.occurredAt}-${index}`,
      title,
      statusLabel,
      dateLabel: formatDateTimeSmart(event.occurredAt) ?? '',
      occurredAt: event.occurredAt,
      state,
    };
  });
}
