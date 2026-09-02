import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { QueueTable, type QueueRow } from '@/components/QueueTable';
import { countdownText, formatAmount, hoursUntil, maskDocument } from '@/lib/format';
import { queueBand, sortByUrgency } from '@/lib/urgency';
import { cn } from '@/lib/cn';
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
    status: row.med.status,
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
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">MEDs</h1>
          <p className="text-muted-foreground text-sm">Qual caso atender agora, em ordem de urgência.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/meds/import">
              <Upload data-icon="inline-start" />
              Importar lote
            </Link>
          </Button>
          <Button asChild>
            <Link href="/meds/new">
              <Plus data-icon="inline-start" />
              Novo MED
            </Link>
          </Button>
        </div>
      </div>

      <nav className="border-b">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {VIEWS.map((entry) => {
            const active = (view ?? '') === entry.key;
            return (
              <li key={entry.key}>
                <Link
                  href={entry.key ? `/meds?view=${entry.key}` : '/meds'}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors',
                    active
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{view ? 'Nada nesta visão' : 'Nenhum MED registrado'}</EmptyTitle>
                <EmptyDescription>
                  {view
                    ? 'Nenhum caso corresponde a este filtro no momento.'
                    : 'Com o webhook conectado, cada MED chega, é preenchido pelas fontes e entra nesta fila com a minuta pronta — sem digitação.'}
                </EmptyDescription>
              </EmptyHeader>
              {view ? null : (
                <EmptyContent>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button asChild>
                      <Link href="/integracoes">Conectar o webhook da instituição</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/meds/import">Importar lote</Link>
                    </Button>
                  </div>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <QueueTable rows={rows} />
      )}
    </div>
  );
}
