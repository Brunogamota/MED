import Link from 'next/link';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import { EmptyState, Metric, Panel, ScoreBar, StatusBadge, Td, Th } from '@/components/ui';
import { daysUntil, formatAmount, formatDate, maskDocument } from '@/lib/format';
import type { MedStatus } from '@/domain/types';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  UNRECOGNIZED_TRANSACTION: 'Nao reconhece',
  PRODUCT_NOT_RECEIVED: 'Nao recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'Diferente do anunciado',
  FRAUD_SCAM: 'Golpe',
  FRAUD_COERCION: 'Coacao',
  FRAUD_ACCOUNT_TAKEOVER: 'Invasao de conta',
  DUPLICATE_CHARGE: 'Duplicidade',
  OPERATIONAL_ERROR: 'Erro operacional',
  OTHER: 'Outro',
};

const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];

export default async function MedsPage() {
  const auth = serverPageContext();
  const rows = await listMeds(auth, { limit: 200 });

  const open = rows.filter((row) => OPEN_STATUSES.includes(row.med.status));
  const nearDeadline = open.filter((row) => {
    const remaining = daysUntil(row.med.responseDeadlineAt);
    return remaining !== null && remaining <= 3;
  });
  const missingEvidence = rows.filter((row) => row.med.status === 'MISSING_EVIDENCE');
  const readyToSubmit = rows.filter((row) => row.med.status === 'READY_TO_SUBMIT');
  const submitted = rows.filter((row) => row.med.status === 'SUBMITTED');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="MEDs abertos" value={open.length} />
        <Metric
          label="Proximos do prazo"
          value={nearDeadline.length}
          tone={nearDeadline.length > 0 ? 'danger' : 'default'}
        />
        <Metric
          label="Aguardando evidencia"
          value={missingEvidence.length}
          tone={missingEvidence.length > 0 ? 'warn' : 'default'}
        />
        <Metric label="Prontos para envio" value={readyToSubmit.length} tone="good" />
        <Metric label="Enviados" value={submitted.length} />
      </div>

      <Panel
        title={`MEDs (${rows.length})`}
        actions={
          <div className="flex gap-2">
            <Link
              href="/meds/import"
              className="rounded border border-[var(--color-border-subtle)] px-3 py-1 text-xs font-medium hover:bg-[var(--color-surface-muted)]"
            >
              Importar lote
            </Link>
            <Link
              href="/meds/new"
              className="rounded bg-[var(--color-brand)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              Novo MED
            </Link>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState>
            Nenhum MED registrado. Crie um via <code>POST /api/meds</code> ou receba pelo webhook{' '}
            <code>POST /api/webhooks/med</code>.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>MED</Th>
                  <Th>Cliente</Th>
                  <Th className="text-right">Valor</Th>
                  <Th>Motivo</Th>
                  <Th>Prazo</Th>
                  <Th>Evidence score</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ med, latestDefense, evidenceCount }) => {
                  const remaining = daysUntil(med.responseDeadlineAt);
                  return (
                    <tr key={med.id} className="hover:bg-[var(--color-surface-muted)]">
                      <Td>
                        <Link
                          href={`/meds/${med.id}`}
                          className="font-medium text-[var(--color-brand)] hover:underline"
                        >
                          {med.medId}
                        </Link>
                        <div className="text-[11px] text-[var(--color-ink-muted)]">
                          {med.requestingInstitution ?? 'Instituicao nao informada'}
                        </div>
                      </Td>
                      <Td>
                        <div>{med.payer.name ?? 'Nao informado'}</div>
                        <div className="text-[11px] text-[var(--color-ink-muted)]">
                          {maskDocument(med.payer.document) ?? 'sem documento'}
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatAmount(med.amount, med.currency)}
                      </Td>
                      <Td>{REASON_LABEL[med.reason] ?? med.reason}</Td>
                      <Td>
                        <div>{formatDate(med.responseDeadlineAt) ?? 'Nao informado'}</div>
                        {remaining !== null ? (
                          <div
                            className={`text-[11px] ${
                              remaining < 0
                                ? 'text-red-700'
                                : remaining <= 3
                                  ? 'text-amber-700'
                                  : 'text-[var(--color-ink-muted)]'
                            }`}
                          >
                            {remaining < 0 ? 'vencido' : `faltam ${remaining} dia(s)`}
                          </div>
                        ) : null}
                      </Td>
                      <Td>
                        {latestDefense ? (
                          <ScoreBar value={latestDefense.score.total} max={latestDefense.score.max} />
                        ) : (
                          <span className="text-[11px] text-[var(--color-ink-muted)]">
                            {evidenceCount} evidencia(s), sem defesa
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
