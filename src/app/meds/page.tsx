import Link from 'next/link';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import {
  EmptyState,
  MetricCell,
  MetricStrip,
  Panel,
  ScoreBar,
  StatusBadge,
  Td,
  Th,
} from '@/components/ui';
import { daysUntil, formatAmount, formatDate, maskDocument } from '@/lib/format';
import { MED_REASON_LABEL, deadlineText, deadlineTone } from '@/lib/labels';
import type { MedStatus } from '@/domain/types';

export const dynamic = 'force-dynamic';

const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];

const DEADLINE_COLOR = {
  neutral: 'text-[var(--color-text-muted)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
} as const;

export default async function MedsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const auth = serverPageContext();
  const all = await listMeds(auth, { limit: 200 });

  const open = all.filter((row) => OPEN_STATUSES.includes(row.med.status));
  const nearDeadline = open.filter((row) => {
    const remaining = daysUntil(row.med.responseDeadlineAt);
    return remaining !== null && remaining <= 3;
  });
  const missingEvidence = all.filter((row) => row.med.status === 'MISSING_EVIDENCE');
  const readyToSubmit = all.filter((row) => row.med.status === 'READY_TO_SUBMIT');
  const submitted = all.filter((row) =>
    ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(row.med.status),
  );

  const rows =
    view === 'vencendo' ? nearDeadline : view === 'enviados' ? submitted : all;
  const viewTitle =
    view === 'vencendo' ? 'MEDs vencendo' : view === 'enviados' ? 'MEDs enviados' : 'MEDs';

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{viewTitle}</h1>
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

      <MetricStrip>
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

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState
            title={view ? 'Nada por aqui' : 'Nenhum MED registrado'}
            action={
              view ? undefined : (
                <Link
                  href="/meds/import"
                  className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Importar o lote da adquirente
                </Link>
              )
            }
          >
            {view
              ? 'Nenhum MED nesta visão no momento.'
              : 'Importe o arquivo da adquirente ou crie um MED manualmente para começar.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>MED</Th>
                  <Th>Cliente</Th>
                  <Th className="text-right">Valor</Th>
                  <Th>Motivo</Th>
                  <Th>Prazo</Th>
                  <Th>Score</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ med, latestDefense, evidenceCount }) => {
                  const remaining = daysUntil(med.responseDeadlineAt);
                  const tone = deadlineTone(remaining);
                  return (
                    <tr
                      key={med.id}
                      className="transition-colors duration-[120ms] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Td>
                        <Link
                          href={`/meds/${med.id}`}
                          className="font-medium text-[var(--color-text)] hover:underline"
                        >
                          {med.medId}
                        </Link>
                        <span className="block text-xs text-[var(--color-text-muted)]">
                          {med.requestingInstitution ?? '—'}
                        </span>
                      </Td>
                      <Td>
                        <span className="block">{med.payer.name ?? '—'}</span>
                        <span className="block font-mono text-xs text-[var(--color-text-muted)]">
                          {maskDocument(med.payer.document) ?? '—'}
                        </span>
                      </Td>
                      <Td className="tabular text-right font-medium">
                        {formatAmount(med.amount, med.currency)}
                      </Td>
                      <Td className="text-[var(--color-text-secondary)]">
                        {MED_REASON_LABEL[med.reason]}
                      </Td>
                      <Td>
                        <span className="tabular block">
                          {formatDate(med.responseDeadlineAt) ?? '—'}
                        </span>
                        <span className={`block text-xs ${DEADLINE_COLOR[tone]}`}>
                          {deadlineText(remaining)}
                        </span>
                      </Td>
                      <Td>
                        {latestDefense ? (
                          <ScoreBar
                            value={latestDefense.score.total}
                            max={latestDefense.score.max}
                            width="w-16"
                          />
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {evidenceCount > 0
                              ? `${evidenceCount} evidência(s)`
                              : 'sem defesa'}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={med.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
