import Link from 'next/link';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import { EmptyState, MetricCell, MetricStrip, Panel } from '@/components/ui';
import { QueueTable, type QueueRow } from '@/components/QueueTable';
import { countdownText, formatAmount, hoursUntil, maskDocument } from '@/lib/format';
import { MED_STATUS_LABEL, MED_STATUS_TONE } from '@/lib/labels';
import { queueBand, sortByUrgency } from '@/lib/urgency';
import type { MedListRow } from '@/infra/repositories/types';
import type { MedStatus } from '@/domain/types';

export const dynamic = 'force-dynamic';

/**
 * Fila de trabalho (briefing 3.8): não é uma tabela cronológica, é a resposta
 * a "qual caso eu atendo agora?". Ordenada por urgência calculada, agrupada
 * por faixa de prazo, com seleção múltipla e ações em lote.
 */

const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];
const SUBMITTED_STATUSES: MedStatus[] = ['SUBMITTED', 'ACCEPTED', 'REJECTED'];

const NEXT_ACTION_BY_STATUS: Record<MedStatus, string> = {
  RECEIVED: 'Revisar dados',
  COLLECTING_DATA: 'Revisar dados',
  MISSING_EVIDENCE: 'Completar evidências',
  READY_TO_GENERATE: 'Gerar defesa',
  DEFENSE_GENERATED: 'Conferir defesa',
  READY_TO_SUBMIT: 'Preparar envio',
  SUBMITTED: 'Acompanhar retorno',
  ACCEPTED: 'Registrar desfecho',
  REJECTED: 'Registrar desfecho',
  EXPIRED: 'Registrar desfecho',
};

/** Filtros salvos como visões (abas leves acima da fila). */
const VIEWS = [
  { key: '', label: 'Fila' },
  { key: 'prontos', label: 'Prontos para envio' },
  { key: 'bloqueados', label: 'Bloqueados por evidência' },
  { key: 'vencendo', label: 'Vencendo' },
  { key: 'enviados', label: 'Enviados' },
] as const;

function toQueueRow(row: MedListRow, now: Date): QueueRow {
  const hours = hoursUntil(row.med.responseDeadlineAt, now);
  return {
    id: row.med.id,
    medId: row.med.medId,
    institution: row.med.requestingInstitution ?? null,
    payerName: row.med.payer.name ?? null,
    payerDocument: maskDocument(row.med.payer.document),
    amountLabel: formatAmount(row.med.amount, row.med.currency),
    scoreTotal: row.latestDefense?.score.total ?? 0,
    scoreMax: row.latestDefense?.score.max ?? 100,
    hasDefense: row.latestDefense !== null,
    deadlineLabel: countdownText(hours),
    deadlineDanger: hours !== null && hours < 48,
    statusLabel: MED_STATUS_LABEL[row.med.status],
    statusTone: MED_STATUS_TONE[row.med.status],
    nextActionLabel: NEXT_ACTION_BY_STATUS[row.med.status],
    band: queueBand(hours),
  };
}

export default async function MedsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const auth = serverPageContext();
  const all = await listMeds(auth, { limit: 200 });
  const now = new Date();

  const open = all.filter((row) => OPEN_STATUSES.includes(row.med.status));
  const expired = all.filter((row) => row.med.status === 'EXPIRED');
  const submitted = all.filter((row) => SUBMITTED_STATUSES.includes(row.med.status));
  const nearDeadline = open.filter((row) => {
    const hours = hoursUntil(row.med.responseDeadlineAt, now);
    return hours !== null && hours <= 72;
  });
  const missingEvidence = all.filter((row) => row.med.status === 'MISSING_EVIDENCE');
  const readyToSubmit = all.filter((row) => row.med.status === 'READY_TO_SUBMIT');

  const selection =
    view === 'prontos'
      ? readyToSubmit
      : view === 'bloqueados'
        ? missingEvidence
        : view === 'vencendo'
          ? nearDeadline
          : view === 'enviados'
            ? submitted
            : [...open, ...expired];

  const rows = sortByUrgency(selection, now).map((row) => toQueueRow(row, now));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">MEDs</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/meds/import"
            className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)]"
          >
            Importar lote
          </Link>
          <Link
            href="/meds/new"
            className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Novo MED
          </Link>
        </div>
      </div>

      <MetricStrip columns={5}>
        <MetricCell label="MEDs abertos" value={open.length} />
        <MetricCell
          label="Vencendo"
          value={nearDeadline.length}
          tone={nearDeadline.length > 0 ? 'danger' : 'neutral'}
        />
        <MetricCell
          label="Aguardando evidência"
          value={missingEvidence.length}
          tone={missingEvidence.length > 0 ? 'warning' : 'neutral'}
        />
        <MetricCell
          label="Prontos para envio"
          value={readyToSubmit.length}
          tone={readyToSubmit.length > 0 ? 'success' : 'neutral'}
        />
        <MetricCell label="Enviados" value={submitted.length} />
      </MetricStrip>

      {/* Visões salvas — abas leves */}
      <nav className="border-b border-[var(--color-border)]">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {VIEWS.map((entry) => {
            const active = (view ?? '') === entry.key;
            return (
              <li key={entry.key}>
                <Link
                  href={entry.key ? `/meds?view=${entry.key}` : '/meds'}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-9 items-center whitespace-nowrap border-b-2 px-3 text-[13px] transition-colors duration-[120ms] ${
                    active
                      ? 'border-[var(--color-text)] font-medium text-[var(--color-text)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            title={view ? 'Nada nesta visão' : 'Nenhum MED registrado'}
            action={
              view ? undefined : (
                <span className="flex items-center gap-2">
                  <Link
                    href="/integracoes"
                    className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    Conectar o webhook da instituição
                  </Link>
                  <Link
                    href="/meds/import"
                    className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)]"
                  >
                    Importar lote
                  </Link>
                </span>
              )
            }
          >
            {view
              ? 'Nenhum caso corresponde a este filtro no momento.'
              : 'Com o webhook conectado, cada MED chega, é preenchido pelas fontes e entra nesta fila com a minuta pronta — sem digitação.'}
          </EmptyState>
        </Panel>
      ) : (
        <QueueTable rows={rows} />
      )}
    </div>
  );
}
