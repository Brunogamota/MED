import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import {
  getCase,
  getDocumentDownloadPath,
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
import { getDocumentStorage } from '@/infra/storage';
import {
  EmptyState,
  KeyValueList,
  KeyValueRow,
  MetricCell,
  MetricStrip,
  MonoId,
  Panel,
  RequirementMark,
  ScoreBar,
  StatusBadge,
  StatusDot,
  StrengthBadge,
  SubtleBadge,
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
import {
  AUDIT_ACTION_LABEL,
  CATEGORY_LABEL,
  DOCUMENT_KIND_LABEL,
  EVIDENCE_SOURCE_LABEL,
  MED_REASON_LABEL,
  NECESSITY_LABEL,
  PRODUCT_TYPE_LABEL,
  RENDERER_LABEL,
  SEVERITY_LABEL,
  SUBMISSION_STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
  deadlineText,
  deadlineTone,
} from '@/lib/labels';
import { createSubmissionAction, generateDefenseAction } from '@/app/meds/actions';
import { FulfillmentPanel } from '@/components/FulfillmentPanel';
import { CommunicationPanel } from '@/components/CommunicationPanel';
import { COMMUNICATION_TEMPLATES, type CommunicationTemplate } from '@/domain/communication/receipt';
import {
  CustomerForm,
  DocumentForm,
  DocumentUploadForm,
  EvidenceForm,
  OrderForm,
  TrackingForm,
  TransactionForm,
} from '@/components/medForms';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'data', label: 'Dados' },
  { key: 'evidence', label: 'Evidências' },
  { key: 'timeline', label: 'Linha do tempo' },
  { key: 'defense', label: 'Defesa' },
  { key: 'comprovantes', label: 'Comprovantes' },
  { key: 'documents', label: 'Documentos' },
  { key: 'submission', label: 'Envio' },
  { key: 'audit', label: 'Auditoria' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const DEADLINE_COLOR = {
  neutral: 'text-[var(--color-text-muted)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
} as const;

/** Etapas do caso: onde o operador esta no processo, derivado do estado real. */
function Steps({
  hasData,
  requiredMissing,
  hasDefense,
  hasSubmission,
}: {
  hasData: boolean;
  requiredMissing: number;
  hasDefense: boolean;
  hasSubmission: boolean;
}) {
  const steps = [
    { label: 'Dados', done: hasData },
    { label: 'Evidências', done: hasData && requiredMissing === 0 },
    { label: 'Defesa', done: hasDefense },
    { label: 'Envio', done: hasSubmission },
  ];
  const current = steps.findIndex((step) => !step.done);

  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-[13px]">
      {steps.map((step, index) => {
        const state = step.done ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li key={step.label} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden className="h-px w-6 bg-[var(--color-border)]" />
            ) : null}
            <span
              className={`flex items-center gap-1.5 ${
                state === 'todo'
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text)]'
              } ${state === 'current' ? 'font-medium' : ''}`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  state === 'done'
                    ? 'bg-[var(--color-accent)]'
                    : state === 'current'
                      ? 'bg-[var(--color-text)]'
                      : 'bg-[var(--color-border-strong)]'
                }`}
              />
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function MedDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; modelo?: string }>;
}) {
  const { id } = await params;
  const { tab, modelo } = await searchParams;
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
  const productType = resolveProductType(medCase);
  const assessment = assessEvidence({
    productType,
    reason: medCase.med.reason,
    evidences,
  });
  const timeline = buildTimeline({ ...medCase, evidences });
  const defenses = await listDefenses(auth, id);
  const latestDefense = defenses[defenses.length - 1] ?? null;
  const submissions = await listSubmissions(auth, id);
  const audit = await listAudit(auth, id);
  const storageAvailable = getDocumentStorage() !== null;
  const documentLinks = new Map<string, string | null>(
    await Promise.all(
      medCase.documents.map(
        async (document) =>
          [document.id, await getDocumentDownloadPath(auth, document.id)] as const,
      ),
    ),
  );

  const { med } = medCase;
  const remaining = daysUntil(med.responseDeadlineAt);
  const tone = deadlineTone(remaining);
  const strongCount = assessment.items.filter(
    (item) => item.status === 'AVAILABLE' && item.strength === 'STRONG',
  ).length;
  const requiredMissing = assessment.missingEvidences.filter(
    (missing) => missing.necessity === 'REQUIRED',
  ).length;
  const hasData =
    medCase.transaction !== null ||
    medCase.order !== null ||
    medCase.tracking !== null ||
    medCase.digitalDelivery !== null;
  const reconstructions = evidences.filter(
    (evidence) => evidence.type === 'DELIVERY_COMMUNICATION',
  );
  const activeTemplate: CommunicationTemplate = COMMUNICATION_TEMPLATES.includes(
    modelo as CommunicationTemplate,
  )
    ? (modelo as CommunicationTemplate)
    : 'ACCESS_DELIVERY';
  const hasSubmission =
    submissions.length > 0 || ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(med.status);

  return (
    <div className="space-y-4">
      {/* Cabecalho da pagina */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-3">
            <Link
              href="/meds"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← MEDs
            </Link>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{med.medId}</h1>
            <StatusBadge status={med.status} />
          </div>
          <div className="flex items-center gap-2">
            {latestDefense ? (
              <a
                href={`/api/meds/${med.id}/pdf`}
                className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)]"
              >
                Baixar PDF
              </a>
            ) : null}
            <form action={generateDefenseAction}>
              <input type="hidden" name="medId" value={med.id} />
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                {latestDefense ? 'Gerar nova versão' : 'Gerar defesa'}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--color-text-muted)]">
          <span className="tabular font-medium text-[var(--color-text)]">
            {formatAmount(med.amount, med.currency)}
          </span>
          <span aria-hidden>·</span>
          {med.requestingInstitution ? (
            <>
              <span>{med.requestingInstitution}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>aberto em {formatDate(med.openedAt)}</span>
          <span aria-hidden>·</span>
          <span className={DEADLINE_COLOR[tone]}>{deadlineText(remaining)}</span>
        </p>
        <div className="mt-3">
          <Steps
            hasData={hasData}
            requiredMissing={requiredMissing}
            hasDefense={latestDefense !== null}
            hasSubmission={hasSubmission}
          />
        </div>
      </div>

      {/* Faixa de metricas */}
      <MetricStrip>
        <MetricCell
          label="Score documental"
          value={latestDefense?.score.total ?? assessment.score.total}
          unit={`/ ${assessment.score.max}`}
        />
        <MetricCell label="Evidências fortes" value={strongCount} />
        <MetricCell
          label="Prazo restante"
          value={remaining === null ? '—' : remaining < 0 ? 'vencido' : remaining}
          unit={remaining !== null && remaining >= 0 ? (remaining === 1 ? 'dia' : 'dias') : undefined}
          tone={tone === 'neutral' ? 'neutral' : tone}
        />
        <MetricCell label="Valor contestado" value={formatAmount(med.amount, med.currency)} />
      </MetricStrip>

      {/* Abas — sublinhado 2px, sem caixa */}
      <nav className="border-b border-[var(--color-border)]">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((entry) => (
            <li key={entry.key}>
              <Link
                href={`/meds/${med.id}?tab=${entry.key}`}
                className={`inline-flex h-9 items-center whitespace-nowrap border-b-2 px-3 text-[13px] transition-colors duration-[120ms] ${
                  entry.key === activeTab
                    ? 'border-[var(--color-text)] font-medium text-[var(--color-text)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          <FulfillmentPanel medCase={medCase} productType={productType} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="MED">
              <KeyValueList>
                <KeyValueRow label="Instituição" value={med.requestingInstitution} />
                <KeyValueRow label="Motivo" value={MED_REASON_LABEL[med.reason]} />
                <KeyValueRow label="Tipo de produto" value={PRODUCT_TYPE_LABEL[productType]} />
                <KeyValueRow label="Transação" value={med.transactionId} mono />
                <KeyValueRow label="End-to-end" value={med.endToEndId} mono />
                <KeyValueRow label="Data da transação" value={formatDateTime(med.transactionAt)} />
                <KeyValueRow label="Abertura do MED" value={formatDateTime(med.openedAt)} />
                <KeyValueRow label="Loja" value={med.merchantName} />
              </KeyValueList>
            </Panel>

            <Panel title="Pagador informado no MED">
              <KeyValueList>
                <KeyValueRow label="Nome" value={med.payer.name} />
                <KeyValueRow label="CPF/CNPJ" value={med.payer.document} mono />
                <KeyValueRow label="E-mail" value={med.payer.email} />
                <KeyValueRow label="Telefone" value={med.payer.phone} />
                <KeyValueRow label="IP" value={med.payerIp} mono />
                <KeyValueRow label="Dispositivo" value={med.payerDevice} mono />
                <KeyValueRow label="Endereço" value={formatAddress(med.payerAddress)} />
              </KeyValueList>
            </Panel>

            <Panel
              title="Situação da defesa"
              footer="O score mede completude e força documental segundo as regras internas. Não representa probabilidade de êxito."
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-muted)]">Score documental</span>
                <ScoreBar value={assessment.score.total} max={assessment.score.max} width="w-32" />
              </div>
              <ul>
                {assessment.score.components.map((component) => (
                  <li
                    key={component.category}
                    className="flex h-7 items-center justify-between gap-3"
                  >
                    <span className="w-32 shrink-0 text-xs text-[var(--color-text-secondary)]">
                      {CATEGORY_LABEL[component.category]}
                    </span>
                    <ScoreBar value={component.earned} max={component.max} width="w-[120px]" />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={`Riscos operacionais (${latestDefense?.riskFlags.length ?? 0})`}>
              {!latestDefense ? (
                <EmptyState title="Defesa ainda não gerada">
                  Gere a defesa para avaliar os riscos operacionais deste caso.
                </EmptyState>
              ) : latestDefense.riskFlags.length === 0 ? (
                <EmptyState title="Nenhum risco identificado">
                  As regras internas não encontraram inconsistências neste caso.
                </EmptyState>
              ) : (
                <ul className="space-y-2.5">
                  {latestDefense.riskFlags.map((flag) => (
                    <li key={flag.code} className="flex items-start gap-2 text-[13px]">
                      <SubtleBadge
                        tone={
                          flag.severity === 'HIGH'
                            ? 'danger'
                            : flag.severity === 'MEDIUM'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {SEVERITY_LABEL[flag.severity]}
                      </SubtleBadge>
                      <span className="text-[var(--color-text-secondary)]">{flag.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'data' ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Registre aqui os dados que você já possui. Campo em branco permanece ausente e será
            apontado como evidência faltante — nada é preenchido por suposição.
          </p>
          <TransactionForm medCase={medCase} />
          <CustomerForm medCase={medCase} />
          <OrderForm medCase={medCase} />
          <TrackingForm medCase={medCase} />
        </div>
      ) : null}

      {activeTab === 'evidence' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={`Requisitos (${assessment.items.length})`} flush>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <Th>Evidência</Th>
                    <Th>Necessidade</Th>
                    <Th>Situação</Th>
                    <Th>Força</Th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.items.map((item) => (
                    <tr key={item.type}>
                      <Td>
                        <span className="block">{item.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)]">
                          {CATEGORY_LABEL[item.category]}
                        </span>
                      </Td>
                      <Td className="text-xs text-[var(--color-text-secondary)]">
                        {NECESSITY_LABEL[item.necessity]}
                      </Td>
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
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title={`Evidências faltantes (${assessment.missingEvidences.length})`}>
              {assessment.missingEvidences.length === 0 ? (
                <EmptyState title="Nada faltando">
                  Todos os itens obrigatórios e recomendados estão disponíveis.
                </EmptyState>
              ) : (
                <ul className="space-y-2.5">
                  {assessment.missingEvidences.map((missing) => (
                    <li key={missing.type} className="flex items-start gap-2 text-[13px]">
                      <SubtleBadge tone={missing.necessity === 'REQUIRED' ? 'danger' : 'warning'}>
                        {NECESSITY_LABEL[missing.necessity]}
                      </SubtleBadge>
                      <span>
                        {missing.label}
                        <span className="block text-xs text-[var(--color-text-muted)]">
                          {missing.rationale}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <EvidenceForm medId={med.id} />
          </div>

          <Panel title={`Evidências registradas (${evidences.length})`} flush>
            {evidences.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Nenhuma evidência registrada">
                  Preencha os dados do caso ou registre uma evidência manualmente.
                </EmptyState>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Tipo</Th>
                      <Th>Valor</Th>
                      <Th>Origem</Th>
                      <Th>Verificação</Th>
                      <Th>Força</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidences.map((evidence) => (
                      <tr key={evidence.id}>
                        <Td>{getEvidenceDefinition(evidence.type).label}</Td>
                        <Td className="max-w-[220px]">
                          <span className="block truncate">
                            {evidence.displayValue ??
                              (typeof evidence.value === 'string'
                                ? evidence.value
                                : 'Registro estruturado')}
                          </span>
                        </Td>
                        <Td>
                          <span className="block text-[13px]">
                            {EVIDENCE_SOURCE_LABEL[evidence.source]}
                          </span>
                          {evidence.sourceReference ? (
                            <MonoId value={evidence.sourceReference} />
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              sem referência
                            </span>
                          )}
                        </Td>
                        <Td className="text-xs text-[var(--color-text-secondary)]">
                          {VERIFICATION_STATUS_LABEL[evidence.verificationStatus]}
                        </Td>
                        <Td>
                          <StrengthBadge strength={evaluateStrength(evidence).strength} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <Panel title={`Linha do tempo (${timeline.length})`}>
          {timeline.length === 0 ? (
            <EmptyState title="Nenhum evento datado">
              Os eventos aparecem aqui conforme os dados do caso são registrados com data e hora.
            </EmptyState>
          ) : (
            <ol>
              {timeline.map((event, index) => (
                <li
                  key={`${event.type}-${event.occurredAt}-${index}`}
                  className="relative flex gap-4 pb-4 last:pb-0"
                >
                  <span className="tabular w-36 shrink-0 pt-0.5 text-xs text-[var(--color-text-muted)]">
                    {formatDateTime(event.occurredAt)}
                  </span>
                  <span className="relative flex flex-col items-center">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                    />
                    {index < timeline.length - 1 ? (
                      <span aria-hidden className="w-px flex-1 bg-[var(--color-border)]" />
                    ) : null}
                  </span>
                  <span className="pb-1">
                    <span className="block text-[13px]">{event.description}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {EVIDENCE_SOURCE_LABEL[event.source]}
                      {event.sourceReference ? (
                        <>
                          {' · '}
                          <MonoId value={event.sourceReference} />
                        </>
                      ) : null}
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
          <Panel title={`Versões (${defenses.length})`} flush>
            {defenses.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Nenhuma defesa gerada"
                  action={
                    <form action={generateDefenseAction}>
                      <input type="hidden" name="medId" value={med.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
                      >
                        Gerar defesa
                      </button>
                    </form>
                  }
                >
                  A defesa é montada apenas com as evidências registradas — nada é inventado.
                </EmptyState>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Versão</Th>
                    <Th>Gerada em</Th>
                    <Th className="text-right">Afirmações</Th>
                    <Th>Score</Th>
                    <Th>Texto</Th>
                  </tr>
                </thead>
                <tbody>
                  {defenses.map((defense) => (
                    <tr key={defense.id}>
                      <Td>
                        <span className="inline-flex h-5 items-center rounded bg-[#f4f4f5] px-1.5 text-[11px] font-medium text-[#3f3f46]">
                          v{defense.version}
                        </span>
                      </Td>
                      <Td className="tabular">{formatDateTime(defense.generatedAt)}</Td>
                      <Td className="tabular text-right">{defense.claims.length}</Td>
                      <Td>
                        <ScoreBar value={defense.score.total} max={defense.score.max} width="w-16" />
                      </Td>
                      <Td className="text-xs text-[var(--color-text-secondary)]">
                        {RENDERER_LABEL[defense.narrative.renderer]}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {latestDefense ? (
            <>
              <Panel title={`Afirmações e evidências (v${latestDefense.version})`}>
                {latestDefense.claims.length === 0 ? (
                  <EmptyState title="Nenhuma afirmação sustentável">
                    Com as evidências atuais, nenhuma afirmação factual pode ser feita. Registre a
                    entrega e os dados do caso.
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {latestDefense.claims.map((claim) => (
                      <li key={claim.id}>
                        <p className="text-[13px] font-medium">{claim.statement}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--color-text-muted)]">
                          <span>{CATEGORY_LABEL[claim.category]}</span>
                          <span aria-hidden>·</span>
                          <StrengthBadge strength={claim.strength} />
                          <span aria-hidden>·</span>
                          <span>{claim.evidenceIds.length} evidência(s)</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Texto da defesa">
                {latestDefense.narrative.guardRejections?.length ? (
                  <p className="mb-3 rounded-md bg-[var(--color-warning-subtle)] px-3 py-2 text-xs text-[var(--color-warning)]">
                    A reescrita por IA foi descartada pela guarda de fatos:{' '}
                    {latestDefense.narrative.guardRejections[0]}
                  </p>
                ) : null}
                <div className="max-w-[75ch] whitespace-pre-line text-[14px] leading-relaxed text-[var(--color-text)]">
                  {latestDefense.narrative.body}
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'documents' ? (
        <div className="space-y-4">
          <Panel title={`Documentos (${medCase.documents.length})`} flush>
            {medCase.documents.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Nenhum documento anexado">
                  Envie o arquivo ou registre a referência de um documento que já existe no seu
                  sistema.
                </EmptyState>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Arquivo</Th>
                    <Th>Tipo</Th>
                    <Th>Origem</Th>
                    <Th>Anexado em</Th>
                    <Th className="text-right">Abrir</Th>
                  </tr>
                </thead>
                <tbody>
                  {medCase.documents.map((document) => {
                    const link = documentLinks.get(document.id) ?? null;
                    return (
                      <tr key={document.id}>
                        <Td className="font-medium">{document.filename}</Td>
                        <Td className="text-[var(--color-text-secondary)]">
                          {DOCUMENT_KIND_LABEL[document.kind]}
                        </Td>
                        <Td className="text-[var(--color-text-secondary)]">
                          {EVIDENCE_SOURCE_LABEL[document.source]}
                        </Td>
                        <Td className="tabular">{formatDateTime(document.uploadedAt)}</Td>
                        <Td className="text-right">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[var(--color-text)] hover:underline"
                            >
                              Abrir
                            </a>
                          ) : (
                            <span
                              className="text-xs text-[var(--color-text-muted)]"
                              title="Configure a assinatura de links para gerar URLs de download"
                            >
                              —
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
          <DocumentUploadForm medId={med.id} storageAvailable={storageAvailable} />
          <DocumentForm medId={med.id} />
        </div>
      ) : null}

      {activeTab === 'comprovantes' ? (
        <CommunicationPanel
          medCase={{ ...medCase, evidences }}
          template={activeTemplate}
          reconstructions={reconstructions}
        />
      ) : null}

      {activeTab === 'submission' ? (
        <div className="space-y-4">
          <Panel
            title="Preparar envio"
            actions={
              <form action={createSubmissionAction}>
                <input type="hidden" name="medId" value={med.id} />
                <input type="hidden" name="provider" value="generic-json" />
                <button
                  type="submit"
                  disabled={!latestDefense}
                  className="inline-flex h-7 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-[13px] font-medium hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
                >
                  Gerar payload
                </button>
              </form>
            }
          >
            <p className="text-xs text-[var(--color-text-muted)]">
              O pacote de evidências é universal; cada instituição recebe uma tradução própria.
              Nenhum envio automático é realizado: o payload fica disponível para conferência.
            </p>
          </Panel>

          <Panel title={`Envios preparados (${submissions.length})`} flush>
            {submissions.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Nenhum envio preparado">
                  Gere o payload para conferir antes de enviar à instituição.
                </EmptyState>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Destino</Th>
                    <Th>Situação</Th>
                    <Th>Defesa</Th>
                    <Th>Criado em</Th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <Td className="font-medium">{submission.provider}</Td>
                      <Td>
                        <StatusDot
                          tone={
                            submission.status === 'READY' || submission.status === 'SUBMITTED'
                              ? 'accent'
                              : submission.status === 'FAILED' || submission.status === 'REJECTED'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {SUBMISSION_STATUS_LABEL[submission.status]}
                        </StatusDot>
                      </Td>
                      <Td>
                        <MonoId value={submission.defenseId} />
                      </Td>
                      <Td className="tabular">{formatDateTime(submission.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'audit' ? (
        <Panel title={`Auditoria (${audit.length})`} flush>
          {audit.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhum evento registrado">
                Toda alteração neste caso fica registrada aqui, com autor e origem.
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Quando</Th>
                    <Th>Ação</Th>
                    <Th>Registro</Th>
                    <Th>Autor</Th>
                    <Th>Origem</Th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <Td className="tabular whitespace-nowrap">
                        {formatDateTime(entry.occurredAt)}
                      </Td>
                      <Td>{AUDIT_ACTION_LABEL[entry.action]}</Td>
                      <Td>
                        <MonoId value={entry.entityId} />
                      </Td>
                      <Td className="text-xs text-[var(--color-text-secondary)]">{entry.actor}</Td>
                      <Td className="text-xs text-[var(--color-text-secondary)]">
                        {EVIDENCE_SOURCE_LABEL[entry.source]}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
