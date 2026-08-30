import type { MedListRow } from '@/infra/repositories/types';
import { hoursUntil } from '@/lib/format';

/**
 * Urgência calculada da fila (briefing 3.8).
 *
 * O prazo domina: caso que vence em 6h vem antes de caso que vence em 3 dias,
 * qualquer que seja o valor. Dentro da mesma janela, desempata quem está mais
 * perto de virar enviável (distância do score ao limiar) e depois o valor
 * contestado — é onde uma hora de trabalho rende mais.
 */

export const SCORE_THRESHOLD = 75;

export const QUEUE_BANDS = ['today', 'soon', 'week', 'later', 'expired'] as const;
export type QueueBand = (typeof QUEUE_BANDS)[number];

export const QUEUE_BAND_LABEL: Record<QueueBand, string> = {
  today: 'Vence hoje',
  soon: 'Próximas 48h',
  week: 'Esta semana',
  later: 'Sem urgência',
  expired: 'Prazo vencido',
};

export function queueBand(hoursRemaining: number | null): QueueBand {
  if (hoursRemaining === null) return 'later';
  if (hoursRemaining < 0) return 'expired';
  if (hoursRemaining < 24) return 'today';
  if (hoursRemaining < 48) return 'soon';
  if (hoursRemaining < 24 * 7) return 'week';
  return 'later';
}

export interface UrgencySort {
  band: QueueBand;
  /** Chave crescente: menor = mais urgente dentro da faixa. */
  key: number;
}

export function urgencySort(row: MedListRow, now = new Date()): UrgencySort {
  const hours = hoursUntil(row.med.responseDeadlineAt, now);
  const band = queueBand(hours);

  const score = row.latestDefense
    ? (row.latestDefense.score.total / Math.max(1, row.latestDefense.score.max)) * 100
    : 0;
  const scoreGap = Math.abs(SCORE_THRESHOLD - score); // 0..100 — perto do limiar = acionável
  const amountRank = 1 / (1 + Math.max(0, row.med.amount)); // 0..1 — maior valor = menor chave

  const hoursKey = hours === null ? 1_000_000 : Math.max(0, hours);
  return { band, key: hoursKey * 1000 + scoreGap * 5 + amountRank };
}

const BAND_ORDER: Record<QueueBand, number> = {
  today: 0,
  soon: 1,
  week: 2,
  later: 3,
  expired: 4,
};

export function sortByUrgency(rows: MedListRow[], now = new Date()): MedListRow[] {
  return [...rows]
    .map((row) => ({ row, sort: urgencySort(row, now) }))
    .sort((a, b) => {
      const byBand = BAND_ORDER[a.sort.band] - BAND_ORDER[b.sort.band];
      if (byBand !== 0) return byBand;
      return a.sort.key - b.sort.key;
    })
    .map((entry) => entry.row);
}
