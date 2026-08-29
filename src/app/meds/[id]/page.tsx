import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import {
  getCase,
  listAudit,
  listDefenses,
  listSubmissions,
} from '@/services/medService';
import { NotFoundError } from '@/services/errors';
import { assessEvidence } from '@/domain/evidence/engine';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { resolveProductType } from '@/domain/defense/engine';
import { buildTimeline } from '@/domain/timeline/engine';
import { getEvidenceDefinition } from '@/domain/evidence/catalog';
import { evaluateStrength } from '@/domain/evidence/strength';
import {
  EmptyState,
  Panel,
  RequirementMark,
  ScoreBar,
  StatusBadge,
  StrengthBadge,
  Td,
  Th,
} from '@/components/ui';
import {
  daysUntil,
  formatAddress,
  formatAmount,
  formatDate,
  formatDateTime,
} from '@/lib/format';
import { createSubmissionAction, generateDefenseAction } from '@/app/meds/actions';
import {
  CustomerForm,
  DocumentForm,
  EvidenceForm,
  OrderForm,
  TrackingForm,
  TransactionForm,
} from '@/components/medForms';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'data', label: 'Dados' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'defense', label: 'Defense' },
  { key: 'documents', label: 'Documents' },
  { key: 'submission', label: 'Submission' },
  { key: 'audit', label: 'Audit log' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default async function MedDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: TabKey = (TABS.find((entry) => entry.key === tab)?.key ?? 'overview') as TabKey;

  const auth = serverPageContext();

  let medCase;
  try {
    medCase = await getCase(auth, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const evidences = mergeEvidence(medCase.evidences, deriveEvidence(medCase));
  const assessment = assessEvidence({
    productType: resolveProductType(medCase),
    reason: medCase.med.reason,
    evidences,
  });
  const timeline = buildTimeline({ ...medCase, evidences });
  const defenses = await listDefenses(auth, id);
  const latestDefense = defenses[defenses.length - 1] ?? null;
  const submissions = await listSubmissions(auth, id);
  const audit = await listAudit(auth, id);

  const { med } = medCase;
  const remaining = daysUntil(med.responseDeadlineAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/meds" className="text-xs text-[var(--color-ink-muted)] hover:underline">
          &larr; MEDs
        </Link>
        <h1 className="text-lg font-semibold">{med.medId}</h1>
        <StatusBadge status={med.status} />
        <span className="text-sm tabular-nums">{formatAmount(med.amount, med.currency)}</span>
        <span className="text-xs text-[var(--color-ink-muted)]">
          prazo {formatDate(med.responseDeadlineAt) ?? 'nao informado'}
          {remaining !== null ? ` (${remaining < 0 ? 'vencido' : `${remaining}d`})` : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {latestDefense ? (
            <a
              href={`/api/meds/${med.id}/pdf`}
              className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-muted)]"
            >
              Baixar PDF
            </a>
          ) : null}
          <form action={generateDefenseAction}>
            <input type="hidden" name="medId" value={med.id} />
            <button
              type="submit"
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              {latestDefense ? 'Gerar nova versao' : 'Gerar defesa'}
            </button>
          </form>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-[var(--color-border-subtle)] text-sm">
        {TABS.map((entry) => (
          <Link
            key={entry.key}
            href={`/meds/${med.id}?tab=${entry.key}`}
            className={`-mb-px border-b-2 px-3 py-2 ${
              entry.key === activeTab
                ? 'border-[var(--color-brand)] font-medium text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="MED">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Instituicao" value={med.requestingInstitution} />
              <Field label="Motivo" value={med.reason} />
              <Field label="Transaction ID" value={med.transactionId} />
              <Field label="End-to-end ID" value={med.endToEndId} />
              <Field label="Data da transacao" value={formatDateTime(med.transactionAt)} />
              <Field label="Abertura" value={formatDateTime(med.openedAt)} />
              <Field label="Tipo de produto" value={resolveProductType(medCase)} />
              <Field label="Merchant" value={med.merchantName} />
            </dl>
          </Panel>

          <Panel title="Pagador informado no MED">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Nome" value={med.payer.name} />
              <Field label="CPF/CNPJ" value={med.payer.document} />
              <Field label="E-mail" value={med.payer.email} />
              <Field label="Telefone" value={med.payer.phone} />
              <Field label="IP" value={med.payerIp} />
              <Field label="Device" value={med.payerDevice} />
              <Field label="Endereco" value={formatAddress(med.payerAddress)} />
            </dl>
          </Panel>

          <Panel title="Situacao da defesa">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-[var(--color-ink-muted)]">Documentation score</span>
                <ScoreBar value={assessment.score.total} max={assessment.score.max} />
              </div>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Mede completude e forca documental segundo as regras internas. Nao representa
                probabilidade de exito.
              </p>
              <ul className="space-y-1 text-xs">
                {assessment.score.components.map((component) => (
                  <li key={component.category} className="flex items-center gap-2">
                    <span className="w-32 text-[var(--color-ink-muted)]">{component.category}</span>
                    <ScoreBar value={component.earned} max={component.max} />
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title={`Riscos operacionais (${latestDefense?.riskFlags.length ?? 0})`}>
            {!latestDefense ? (
              <EmptyState>Gere a defesa para avaliar os riscos operacionais.</EmptyState>
            ) : latestDefense.riskFlags.length === 0 ? (
              <EmptyState>Nenhum risco identificado pelas regras atuais.</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {latestDefense.riskFlags.map((flag) => (
                  <li key={flag.code} className="flex gap-2">
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        flag.severity === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : flag.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {flag.severity}
                    </span>
                    <span>{flag.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'data' ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Registre aqui os dados que voce ja possui. Campo em branco permanece ausente e sera
            apontado como evidencia faltante — nada e preenchido por suposicao.
          </p>
          <TransactionForm medCase={medCase} />
          <CustomerForm medCase={medCase} />
          <OrderForm medCase={medCase} />
          <TrackingForm medCase={medCase} />
        </div>
      ) : null}

      {activeTab === 'evidence' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={`Requisitos (${assessment.items.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Evidencia</Th>
                  <Th>Necessidade</Th>
                  <Th>Situacao</Th>
                  <Th>Forca</Th>
                </tr>
              </thead>
              <tbody>
                {assessment.items.map((item) => (
                  <tr key={item.type}>
                    <Td>
                      <div>{item.label}</div>
                      <div className="text-[11px] text-[var(--color-ink-muted)]">
                        {item.category}
                      </div>
                    </Td>
                    <Td className="text-[11px]">{item.necessity}</Td>
                    <Td>
                      <RequirementMark status={item.status} />
                    </Td>
                    <Td>
                      <StrengthBadge strength={item.strength} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title={`Evidencias registradas (${evidences.length})`}>
            {evidences.length === 0 ? (
              <EmptyState>Nenhuma evidencia registrada.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Tipo</Th>
                    <Th>Valor</Th>
                    <Th>Origem</Th>
                    <Th>Forca</Th>
                  </tr>
                </thead>
                <tbody>
                  {evidences.map((evidence) => (
                    <tr key={evidence.id}>
                      <Td>{getEvidenceDefinition(evidence.type).label}</Td>
                      <Td className="max-w-[220px] truncate">
                        {evidence.displayValue ??
                          (typeof evidence.value === 'string' ? evidence.value : 'registro anexo')}
                      </Td>
                      <Td>
                        <div className="text-[11px]">{evidence.source}</div>
                        <div className="text-[11px] text-[var(--color-ink-muted)]">
                          {evidence.sourceReference ?? 'sem referencia'}
                        </div>
                      </Td>
                      <Td>
                        <StrengthBadge strength={evaluateStrength(evidence).strength} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <EvidenceForm medId={med.id} />

          <Panel title={`Evidencias faltantes (${assessment.missingEvidences.length})`}>
            {assessment.missingEvidences.length === 0 ? (
              <EmptyState>Nada faltando entre os itens obrigatorios e recomendados.</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {assessment.missingEvidences.map((missing) => (
                  <li key={missing.type} className="flex gap-2">
                    <span className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      {missing.necessity}
                    </span>
                    <span>
                      {missing.label}
                      <span className="block text-[11px] text-[var(--color-ink-muted)]">
                        {missing.rationale}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <Panel title={`Timeline (${timeline.length} eventos)`}>
          {timeline.length === 0 ? (
            <EmptyState>Nenhum evento datado registrado.</EmptyState>
          ) : (
            <ol className="space-y-3">
              {timeline.map((event, index) => (
                <li key={`${event.type}-${event.occurredAt}-${index}`} className="flex gap-4 text-sm">
                  <span className="w-36 shrink-0 tabular-nums text-[var(--color-ink-muted)]">
                    {formatDateTime(event.occurredAt)}
                  </span>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  <span>
                    {event.description}
                    <span className="block text-[11px] text-[var(--color-ink-muted)]">
                      {event.source}
                      {event.sourceReference ? ` - ref. ${event.sourceReference}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      ) : null}

      {activeTab === 'defense' ? (
        <div className="space-y-4">
          <Panel title={`Versoes (${defenses.length})`}>
            {defenses.length === 0 ? (
              <EmptyState>Nenhuma defesa gerada ainda.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Versao</Th>
                    <Th>Gerada em</Th>
                    <Th>Afirmacoes</Th>
                    <Th>Score</Th>
                    <Th>Renderizador</Th>
                  </tr>
                </thead>
                <tbody>
                  {defenses.map((defense) => (
                    <tr key={defense.id}>
                      <Td>v{defense.version}</Td>
                      <Td>{formatDateTime(defense.generatedAt)}</Td>
                      <Td>{defense.claims.length}</Td>
                      <Td>
                        <ScoreBar value={defense.score.total} max={defense.score.max} />
                      </Td>
                      <Td className="text-[11px]">{defense.narrative.renderer}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {latestDefense ? (
            <>
              <Panel title={`Afirmacoes e evidencias (v${latestDefense.version})`}>
                {latestDefense.claims.length === 0 ? (
                  <EmptyState>
                    Nenhuma afirmacao pode ser sustentada com as evidencias disponiveis.
                  </EmptyState>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {latestDefense.claims.map((claim) => (
                      <li key={claim.id}>
                        <div className="font-medium">{claim.statement}</div>
                        <div className="text-[11px] text-[var(--color-ink-muted)]">
                          {claim.category} - forca {claim.strength} - evidencias:{' '}
                          {claim.evidenceIds.join(', ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Texto da defesa">
                {latestDefense.narrative.guardRejections?.length ? (
                  <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    A reescrita por IA foi descartada: {latestDefense.narrative.guardRejections[0]}
                  </p>
                ) : null}
                <div className="space-y-3 text-sm whitespace-pre-line">
                  {latestDefense.narrative.body}
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'documents' ? (
        <div className="space-y-4">
        <Panel title={`Documentos (${medCase.documents.length})`}>
          {medCase.documents.length === 0 ? (
            <EmptyState>
              Nenhum documento anexado. Registre via <code>POST /api/meds/{med.id}/documents</code>.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Arquivo</Th>
                  <Th>Tipo</Th>
                  <Th>Origem</Th>
                  <Th>Enviado em</Th>
                </tr>
              </thead>
              <tbody>
                {medCase.documents.map((document) => (
                  <tr key={document.id}>
                    <Td>{document.filename}</Td>
                    <Td>{document.kind}</Td>
                    <Td>{document.source}</Td>
                    <Td>{formatDateTime(document.uploadedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <DocumentForm medId={med.id} />
        </div>
      ) : null}

      {activeTab === 'submission' ? (
        <div className="space-y-4">
          <Panel
            title="Preparar envio"
            actions={
              <form action={createSubmissionAction} className="flex items-center gap-2">
                <input type="hidden" name="medId" value={med.id} />
                <input type="hidden" name="provider" value="generic-json" />
                <button
                  type="submit"
                  disabled={!latestDefense}
                  className="rounded border border-[var(--color-border-subtle)] px-3 py-1 text-xs font-medium disabled:opacity-40"
                >
                  Gerar payload
                </button>
              </form>
            }
          >
            <p className="text-xs text-[var(--color-ink-muted)]">
              O Evidence Pack e universal. Cada instituicao recebe uma traducao propria via adapter.
              Nenhum envio automatico e realizado: o payload fica disponivel para conferencia.
            </p>
          </Panel>

          <Panel title={`Submissions (${submissions.length})`}>
            {submissions.length === 0 ? (
              <EmptyState>Nenhum payload preparado.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Provider</Th>
                    <Th>Status</Th>
                    <Th>Defesa</Th>
                    <Th>Criado em</Th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <Td>{submission.provider}</Td>
                      <Td>{submission.status}</Td>
                      <Td className="text-[11px]">{submission.defenseId}</Td>
                      <Td>{formatDateTime(submission.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'audit' ? (
        <Panel title={`Audit log (${audit.length})`}>
          {audit.length === 0 ? (
            <EmptyState>Nenhum evento registrado.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Quando</Th>
                  <Th>Acao</Th>
                  <Th>Entidade</Th>
                  <Th>Ator</Th>
                  <Th>Origem</Th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <Td className="tabular-nums">{formatDateTime(entry.occurredAt)}</Td>
                    <Td>{entry.action}</Td>
                    <Td className="text-[11px]">
                      {entry.entityType} {entry.entityId}
                    </Td>
                    <Td className="text-[11px]">
                      {entry.actor} ({entry.actorRole})
                    </Td>
                    <Td className="text-[11px]">{entry.source}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="break-words">{value ?? 'Nao informado'}</dd>
    </div>
  );
}
