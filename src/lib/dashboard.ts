import type { MedListRow } from '@/infra/repositories/types';
import type { MedStatus } from '@/domain/types';
import { hoursUntil } from '@/lib/format';

/**
 * Agregações do painel.
 *
 * Puro de proposito: recebe as linhas e o `now`, devolve numeros. Nada aqui
 * estima, projeta ou preenche buraco — dia sem MED aparece com zero porque
 * zero e o fato, e score medio e `null` quando nenhuma defesa foi gerada,
 * nunca 0, que leria como "todas ruins".
 */

const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];

const CLOSED_STATUSES: MedStatus[] = ['SUBMITTED', 'ACCEPTED', 'REJECTED'];

export interface DashboardMetrics {
  open: number;
  /** Soma em disputa dos casos abertos. */
  openAmount: number;
  currency: string;
  dueSoon: number;
  hasUrgent: boolean;
  readyToSubmit: number;
  submitted: number;
  /** Percentual medio de completude das defesas geradas; `null` sem defesa. */
  averageScore: number | null;
}

export function scorePercent(row: MedListRow): number | null {
  if (!row.latestDefense) return null;
  const { total, max } = row.latestDefense.score;
  if (max <= 0) return null;
  return Math.round((total / max) * 100);
}

export function buildDashboardMetrics(rows: MedListRow[], now = new Date()): DashboardMetrics {
  const open = rows.filter((row) => OPEN_STATUSES.includes(row.med.status));
  const hours = open.map((row) => hoursUntil(row.med.responseDeadlineAt, now));
  const scores = rows.map(scorePercent).filter((value): value is number => value !== null);

  return {
    open: open.length,
    openAmount: open.reduce((sum, row) => sum + row.med.amount, 0),
    // A operação e em BRL; a moeda vem do caso para nao fixar simbolo na tela.
    currency: open[0]?.med.currency ?? rows[0]?.med.currency ?? 'BRL',
    dueSoon: hours.filter((value) => value !== null && value >= 0 && value <= 48).length,
    hasUrgent: hours.some((value) => value !== null && value >= 0 && value < 24),
    readyToSubmit: rows.filter((row) => row.med.status === 'READY_TO_SUBMIT').length,
    submitted: rows.filter((row) => CLOSED_STATUSES.includes(row.med.status)).length,
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null,
  };
}

export interface IntakeDay {
  /** Dia em ISO curto (YYYY-MM-DD), em UTC. */
  date: string;
  received: number;
  amount: number;
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * MEDs abertos por dia na janela pedida, do mais antigo ao mais recente.
 *
 * A serie cobre todos os dias da janela, inclusive os vazios: buraco no
 * eixo faria o grafico mentir sobre a distribuicao.
 */
export function buildIntakeSeries(rows: MedListRow[], now = new Date(), days = 30): IntakeDay[] {
  const byDay = new Map<string, { received: number; amount: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    byDay.set(isoDay(day), { received: 0, amount: 0 });
  }

  for (const row of rows) {
    const openedAt = Date.parse(row.med.openedAt);
    if (Number.isNaN(openedAt)) continue;
    const bucket = byDay.get(isoDay(new Date(openedAt)));
    if (!bucket) continue;
    bucket.received += 1;
    bucket.amount += row.med.amount;
  }

  return [...byDay.entries()].map(([date, value]) => ({ date, ...value }));
}
