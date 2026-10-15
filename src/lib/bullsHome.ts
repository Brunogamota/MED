import type { MedListRow } from '@/infra/repositories/types';
import type { MedStatus } from '@/domain/types';
import { buildIntakeSeries, scorePercent, type IntakeDay } from '@/lib/dashboard';
import { formatAmount, hoursUntil } from '@/lib/format';
import { PRODUCT_TYPE_LABEL } from '@/lib/labels';
import { sortByUrgency } from '@/lib/urgency';

/**
 * Números da visão geral do ambiente Bulls Cash.
 *
 * Puro: recebe as linhas e o `now`. Cada bloco usa a mesma regra da visão da
 * fila para onde ele leva — "Prontos" conta o que `/meds?view=prontos` lista,
 * "Vencendo" o que `/meds?view=vencendo` lista, e assim por diante —, para que
 * o número do painel e a lista que se abre ao clicar nunca discordem.
 */

export const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];
export const SUBMITTED_STATUSES: MedStatus[] = ['SUBMITTED', 'ACCEPTED', 'REJECTED'];

/** Mesma janela da visão "Vencendo" da fila. */
export const DUE_SOON_HOURS = 72;

export interface BullsQueueItem {
  id: string;
  medId: string;
  payerName: string | null;
  endToEndId: string | null;
  productLabel: string | null;
  amountLabel: string;
  /** Horas até o prazo, com sinal; `null` quando o MED não tem prazo. */
  hours: number | null;
  /** Força da evidência da última defesa, 0–100; `null` sem defesa. */
  scorePercent: number | null;
  status: MedStatus;
  ready: boolean;
  blocked: boolean;
  dueSoon: boolean;
  urgent: boolean;
}

export interface BullsIntake {
  series: IntakeDay[];
  total: number;
  /** Média diária na janela. */
  average: number;
  /** Últimos 7 dias contra os 7 anteriores; `null` quando não há base. */
  variation: number | null;
}

export interface BullsHomeData {
  total: number;
  open: number;
  openAmountLabel: string;
  ready: number;
  /** Fração do aberto que está pronta; `null` sem nada em aberto. */
  readyShare: number | null;
  dueSoon: number;
  urgent: number;
  blocked: number;
  submitted: number;
  intake: BullsIntake;
  needsYou: BullsQueueItem[];
  queue: BullsQueueItem[];
}

const isOpen = (row: MedListRow) => OPEN_STATUSES.includes(row.med.status);

export function toBullsQueueItem(row: MedListRow, now: Date): BullsQueueItem {
  const hours = hoursUntil(row.med.responseDeadlineAt, now);
  const open = isOpen(row);
  return {
    id: row.med.id,
    medId: row.med.medId,
    payerName: row.med.payer.name ?? null,
    endToEndId: row.med.endToEndId ?? null,
    productLabel: row.med.productType ? PRODUCT_TYPE_LABEL[row.med.productType] : null,
    amountLabel: formatAmount(row.med.amount, row.med.currency),
    hours,
    scorePercent: scorePercent(row),
    status: row.med.status,
    ready: row.med.status === 'READY_TO_SUBMIT',
    blocked: row.med.status === 'MISSING_EVIDENCE',
    dueSoon: open && hours !== null && hours <= DUE_SOON_HOURS,
    urgent: open && hours !== null && hours < 24,
  };
}

/** Variação semanal; sem nada na semana anterior não há base para comparar. */
export function weeklyVariation(series: IntakeDay[]): number | null {
  const sum = (days: IntakeDay[]) => days.reduce((acc, day) => acc + day.received, 0);
  if (series.length < 14) return null;
  const last = sum(series.slice(-7));
  const previous = sum(series.slice(-14, -7));
  if (previous === 0) return null;
  return (last - previous) / previous;
}

export function buildBullsHome(
  rows: MedListRow[],
  now: Date,
  options: { days?: number; needsYouLimit?: number; queueLimit?: number } = {},
): BullsHomeData {
  const days = options.days ?? 14;
  const open = rows.filter(isOpen);
  const ordered = sortByUrgency(open, now).map((row) => toBullsQueueItem(row, now));

  const series = buildIntakeSeries(rows, now, days);
  const total = series.reduce((acc, day) => acc + day.received, 0);
  const ready = rows.filter((row) => row.med.status === 'READY_TO_SUBMIT').length;
  const currency = open[0]?.med.currency ?? rows[0]?.med.currency ?? 'BRL';

  return {
    total: rows.length,
    open: open.length,
    openAmountLabel: formatAmount(
      open.reduce((acc, row) => acc + row.med.amount, 0),
      currency,
    ),
    ready,
    readyShare: open.length > 0 ? ready / open.length : null,
    dueSoon: ordered.filter((item) => item.dueSoon).length,
    urgent: ordered.filter((item) => item.urgent).length,
    blocked: rows.filter((row) => row.med.status === 'MISSING_EVIDENCE').length,
    submitted: rows.filter((row) => SUBMITTED_STATUSES.includes(row.med.status)).length,
    intake: {
      series,
      total,
      average: days > 0 ? total / days : 0,
      variation: weeklyVariation(series),
    },
    // Prazo curto (vencido inclusive) ou travado por evidência, o mais
    // apertado primeiro. A ordem da fila já é essa.
    needsYou: ordered
      .filter((item) => item.blocked || (item.hours !== null && item.hours < 24))
      .slice(0, options.needsYouLimit ?? 5),
    queue: ordered.slice(0, options.queueLimit ?? 8),
  };
}
