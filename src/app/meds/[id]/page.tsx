import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
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
import { CopyId } from '@/components/CopyId';
import { HiddenFields } from '@/components/HiddenFields';
import {
  formatAddress,
  formatAmount,
  formatDate,
  formatDateTimeSmart,
  hoursUntil,
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
import { MED_ORIGIN, evidenceSourceOrigin, type FieldOrigin } from '@/lib/origin';
import { nextAction } from '@/lib/nextAction';
import { NextActionCard } from '@/components/med/NextActionCard';
import { CaseTimeline } from '@/components/med/CaseTimeline';
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

/**
 * Detalhe do MED em cinco abas (briefing 2.4). O progresso do caso é
 * comunicado pelo bloco "Próxima ação" e pela barra de score — não existe
 * trilha de etapas decorativa.
 */
const TABS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'evidencias', label: 'Evidências' },
  { key: 'defesa', label: 'Defesa' },
  { key: 'envio', label: 'Envio' },
  { key: 'auditoria', label: 'Auditoria' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** URLs antigas (9 abas) continuam funcionando. */
const LEGACY_TAB_MAP: Record<string, TabKey> = {
  overview: 'resumo',
  data: 'evidencias',
  evidence: 'evidencias',
  timeline: 'auditoria',
  defense: 'defesa',
  comprovantes: 'evidencias',
  documents: 'evidencias',
  submission: 'envio',
  audit: 'auditoria',
};

const DEADLINE_COLOR = {
  neutral: 'text-muted-foreground',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
} as const;

interface RowSpec {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  origin: FieldOrigin;
}

/** Bloco rótulo-valor: preenchidos primeiro, vazios atrás de um clique. */
function OriginKeyValueBlock({ rows }: { rows: RowSpec[] }) {
  const filled = rows.filter((row) => row.value);
  const empty = rows.filter((row) => !row.value);
  return (
    <>
      <KeyValueList>
        {filled.map((row) => (
          <KeyValueRow key={row.label} label={row.label} value={row.value} mono={row.mono} origin={row.origin} />
        ))}
      </KeyValueList>
      {rows.length > 6 && empty.length > 0 ? (
        <HiddenFields count={empty.length}>
          <KeyValueList>
            {empty.map((row) => (
              <KeyValueRow key={row.label} label={row.label} value={row.value} mono={row.mono} origin={row.origin} />
            ))}
          </KeyValueList>
        </HiddenFields>
      ) : (
        <KeyValueList>
          {rows.length <= 6
            ? empty.map((row) => (
                <KeyValueRow key={row.label} label={row.label} value={row.value} mono={row.mono} origin={row.origin} />
              ))
            : null}
        </KeyValueList>
      )}
    </>
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
  const activeTab: TabKey =
    TABS.find((entry) => entry.key === tab)?.key ?? LEGACY_TAB_MAP[tab ?? ''] ?? 'resumo';

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
  const hoursRemaining = hoursUntil(med.responseDeadlineAt);
  const daysRemaining = hoursRemaining === null ? null : Math.ceil(hoursRemaining / 24);
  const tone = deadlineTone(daysRemaining);
  const availableItems = assessment.items.filter((item) => item.status === 'AVAILABLE');
  const strongCount = availableItems.filter((item) => item.strength === 'STRONG').length;
  const lastEvidenceAt = evidences.reduce<string | null>((latest, evidence) => {
    if (!latest || Date.parse(evidence.receivedAt) > Date.parse(latest)) {
      return evidence.receivedAt;
    }
    return latest;
  }, null);
  const action = nextAction({
    med,
    assessment,
    latestDefense,
    submissions,
    hoursRemaining,
    lastEvidenceAt,
  });
  const activeTemplate: CommunicationTemplate = COMMUNICATION_TEMPLATES.includes(
    modelo as CommunicationTemplate,
  )
    ? (modelo as CommunicationTemplate)
    : 'ACCESS_DELIVERY';

  const medRows: RowSpec[] = [
    { label: 'Instituição', value: med.requestingInstitution, origin: MED_ORIGIN },
    { label: 'Motivo', value: MED_REASON_LABEL[med.reason], origin: MED_ORIGIN },
    { label: 'Tipo de produto', value: PRODUCT_TYPE_LABEL[productType], origin: MED_ORIGIN },
    { label: 'Transação', value: med.transactionId, mono: true, origin: MED_ORIGIN },
    { label: 'End-to-end', value: med.endToEndId, mono: true, origin: MED_ORIGIN },
    { label: 'Data da transação', value: formatDateTimeSmart(med.transactionAt), origin: MED_ORIGIN },
    { label: 'Abertura do MED', value: formatDateTimeSmart(med.openedAt), origin: MED_ORIGIN },
    { label: 'Loja', value: med.merchantName, origin: MED_ORIGIN },
  ];
  const payerRows: RowSpec[] = [
    { label: 'Nome', value: med.payer.name, origin: MED_ORIGIN },
    { label: 'CPF/CNPJ', value: med.payer.document, mono: true, origin: MED_ORIGIN },
    { label: 'E-mail', value: med.payer.email, origin: MED_ORIGIN },
    { label: 'Telefone', value: med.payer.phone, origin: MED_ORIGIN },
    { label: 'IP', value: med.payerIp, mono: true, origin: MED_ORIGIN },
    { label: 'Dispositivo', value: med.payerDevice, mono: true, origin: MED_ORIGIN },
    { label: 'Endereço', value: formatAddress(med.payerAddress), origin: MED_ORIGIN },
  ];

  const deadlineCellDanger = hoursRemaining !== null && hoursRemaining < 48;
  const deadlineUrgent = hoursRemaining !== null && hoursRemaining >= 0 && hoursRemaining < 24;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title={med.medId}
        parent={{ href: '/meds', label: 'MEDs' }}
        actions={
          <>
            {latestDefense ? (
              <Button asChild variant="outline">
                <a href={`/api/meds/${med.id}/pdf`}>
                  <Download data-icon="inline-start" />
                  Baixar PDF
                </a>
              </Button>
            ) : null}
            {med.status === 'READY_TO_SUBMIT' ? (
              <form action={createSubmissionAction}>
                <input type="hidden" name="medId" value={med.id} />
                <input type="hidden" name="provider" value="generic-json" />
                <Button type="submit">
                  <Send data-icon="inline-start" />
                  Preparar envio
                </Button>
              </form>
            ) : null}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            <StatusBadge status={med.status} />
            <span className="font-medium text-foreground tabular-nums">
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
            <span className={DEADLINE_COLOR[tone]}>{deadlineText(daysRemaining)}</span>
          </span>
        }
      />

      {/* Faixa de métricas — quatro células iguais */}
      <MetricStrip>
        <MetricCell
          label="Score documental"
          value={latestDefense?.score.total ?? assessment.score.total}
          unit={`/ ${assessment.score.max}`}
          bar={{
            value: latestDefense?.score.total ?? assessment.score.total,
            max: assessment.score.max,
          }}
        />
        <MetricCell
          label="Evidências fortes"
          value={strongCount}
          unit={`de ${availableItems.length}`}
        />
        <MetricCell
          label="Prazo restante"
          value={
            hoursRemaining === null
              ? '—'
              : hoursRemaining < 0
                ? 'vencido'
                : hoursRemaining < 48
                  ? Math.floor(hoursRemaining)
                  : Math.ceil(hoursRemaining / 24)
          }
          unit={
            hoursRemaining === null || hoursRemaining < 0
              ? undefined
              : hoursRemaining < 48
                ? 'h'
                : 'dias'
          }
          tone={tone === 'neutral' ? 'neutral' : tone}
          cellTone={deadlineCellDanger ? 'danger' : undefined}
          badge={deadlineUrgent ? <SubtleBadge tone="danger">urgente</SubtleBadge> : undefined}
        />
        <MetricCell label="Valor contestado" value={formatAmount(med.amount, med.currency)} />
      </MetricStrip>

      {/* Abas — sublinhado 2px, sem caixa */}
      <nav className="border-b border-border">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((entry) => (
            <li key={entry.key}>
              <Link
                href={`/meds/${med.id}?tab=${entry.key}`}
                aria-current={entry.key === activeTab ? 'page' : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-[120ms] ${
                  entry.key === activeTab
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === 'resumo' ? (
        <div className="space-y-4">
          <NextActionCard medId={med.id} action={action} />

          <div id="entrega" className="scroll-mt-16">
            <FulfillmentPanel medCase={medCase} productType={productType} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`O que temos (${availableItems.length})`}>
              {availableItems.length === 0 ? (
                <EmptyState title="Nenhuma evidência disponível">
                  Registre a entrega e os dados do caso para as evidências aparecerem aqui.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {availableItems.map((item) => (
                    <li key={item.type} className="flex min-h-9 items-center justify-between gap-3 py-1.5 text-sm">
                      <span>{item.label}</span>
                      <StrengthBadge strength={item.strength} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={`O que falta (${assessment.missingEvidences.length})`}>
              {assessment.missingEvidences.length === 0 ? (
                <EmptyState title="Nada faltando">
                  Todos os itens obrigatórios e recomendados estão disponíveis.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {assessment.missingEvidences.map((missing) => (
                    <li key={missing.type} className="flex min-h-9 items-start justify-between gap-3 py-1.5 text-sm">
                      <span>
                        {missing.label}
                        <span className="block text-xs text-muted-foreground">
                          {missing.rationale}
                        </span>
                      </span>
                      <SubtleBadge tone={missing.necessity === 'REQUIRED' ? 'danger' : 'warning'}>
                        {NECESSITY_LABEL[missing.necessity]}
                      </SubtleBadge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="MED">
              <OriginKeyValueBlock rows={medRows} />
            </Panel>

            <Panel title="Pagador informado no MED">
              <OriginKeyValueBlock rows={payerRows} />
            </Panel>

            <Panel
              title="Situação da defesa"
              footer="O score mede completude e força documental segundo as regras internas. Não representa probabilidade de êxito."
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score documental</span>
                <ScoreBar value={assessment.score.total} max={assessment.score.max} width="w-32" />
              </div>
              <ul>
                {assessment.score.components.map((component) => (
                  <li key={component.category} className="flex h-7 items-center justify-between gap-3">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">
                      {CATEGORY_LABEL[component.category]}
                    </span>
                    <ScoreBar value={component.earned} max={component.max} width="w-[120px]" />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={`Riscos operacionais (${latestDefense?.riskFlags.length ?? 0})`}>
              {!latestDefense ? (
                <EmptyState title="Minuta ainda não gerada">
                  A avaliação de riscos acompanha a minuta da defesa.
                </EmptyState>
              ) : latestDefense.riskFlags.length === 0 ? (
                <EmptyState title="Nenhum risco identificado">
                  As regras internas não encontraram inconsistências neste caso.
                </EmptyState>
              ) : (
                <ul className="space-y-2.5">
                  {latestDefense.riskFlags.map((flag) => (
                    <li key={flag.code} className="flex items-start gap-2 text-sm">
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
                      <span className="text-muted-foreground">{flag.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'evidencias' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`Requisitos (${assessment.items.length})`} flush>
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background">
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
                          <span className="block text-xs text-muted-foreground">
                            {CATEGORY_LABEL[item.category]}
                          </span>
                        </Td>
                        <Td className="text-xs text-muted-foreground">
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
                    {evidences.map((evidence) => {
                      const origin = evidenceSourceOrigin(evidence.source, evidence.sourceProvider);
                      return (
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
                            <SubtleBadge tone={origin.kind === 'manual' ? 'warning' : 'neutral'}>
                              {EVIDENCE_SOURCE_LABEL[evidence.source]}
                            </SubtleBadge>
                            {evidence.sourceReference ? (
                              <span className="mt-0.5 block">
                                <CopyId value={evidence.sourceReference} />
                              </span>
                            ) : null}
                          </Td>
                          <Td className="text-xs text-muted-foreground">
                            {VERIFICATION_STATUS_LABEL[evidence.verificationStatus]}
                          </Td>
                          <Td>
                            <StrengthBadge strength={evaluateStrength(evidence).strength} />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <CommunicationPanel
            medCase={{ ...medCase, evidences }}
            template={activeTemplate}
            reconstructions={evidences.filter(
              (evidence) => evidence.type === 'DELIVERY_COMMUNICATION',
            )}
          />

          <div id="documentos" className="scroll-mt-16 space-y-4">
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
                          <Td className="text-muted-foreground">
                            {DOCUMENT_KIND_LABEL[document.kind]}
                          </Td>
                          <Td className="text-muted-foreground">
                            {EVIDENCE_SOURCE_LABEL[document.source]}
                          </Td>
                          <Td className="tabular-nums">{formatDateTimeSmart(document.uploadedAt)}</Td>
                          <Td className="text-right">
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-foreground hover:underline"
                              >
                                Abrir
                              </a>
                            ) : (
                              <span
                                className="text-xs text-muted-foreground"
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

          <div className="space-y-4">
            <p className="pt-2 text-xs text-muted-foreground">
              Registros do caso — o que os conectores não trouxerem pode ser completado aqui. Campo
              em branco permanece ausente e é apontado como evidência faltante; o salvamento é
              automático ao sair do campo.
            </p>
            <TransactionForm medCase={medCase} />
            <CustomerForm medCase={medCase} />
            <OrderForm medCase={medCase} />
            <TrackingForm medCase={medCase} />
          </div>
        </div>
      ) : null}

      {activeTab === 'defesa' ? (
        <div className="space-y-4">
          <Panel
            title={`Versões (${defenses.length})`}
            flush
            actions={
              <form action={generateDefenseAction}>
                <input type="hidden" name="medId" value={med.id} />
                <button
                  type="submit"
                  className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-sm font-medium hover:bg-accent"
                >
                  Regerar
                </button>
              </form>
            }
          >
            {defenses.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Nenhuma minuta gerada">
                  A minuta nasce com o MED; use Regerar para criá-la com as evidências atuais.
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
                        <SubtleBadge tone="neutral">v{defense.version}</SubtleBadge>
                      </Td>
                      <Td className="tabular-nums">{formatDateTimeSmart(defense.generatedAt)}</Td>
                      <Td className="tabular-nums text-right">{defense.claims.length}</Td>
                      <Td>
                        <ScoreBar value={defense.score.total} max={defense.score.max} width="w-16" />
                      </Td>
                      <Td className="text-xs text-muted-foreground">
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
                        <p className="text-sm font-medium">{claim.statement}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
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
                  <p className="mb-3 rounded-md bg-amber-600/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    A reescrita por IA foi descartada pela guarda de fatos:{' '}
                    {latestDefense.narrative.guardRejections[0]}
                  </p>
                ) : null}
                <div className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {latestDefense.narrative.body}
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'envio' ? (
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
                  className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-sm font-medium hover:bg-accent disabled:opacity-40"
                >
                  Gerar payload
                </button>
              </form>
            }
          >
            <p className="text-xs text-muted-foreground">
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
                        <CopyId value={submission.defenseId} />
                      </Td>
                      <Td className="tabular-nums">{formatDateTimeSmart(submission.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'auditoria' ? (
        <div className="space-y-4">
          <Panel title={`Linha do tempo (${timeline.length})`}>
            <CaseTimeline timeline={timeline} />
          </Panel>

          <Panel title={`Registro de alterações (${audit.length})`} flush>
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
                        <Td className="tabular-nums whitespace-nowrap">
                          {formatDateTimeSmart(entry.occurredAt)}
                        </Td>
                        <Td>{AUDIT_ACTION_LABEL[entry.action]}</Td>
                        <Td>
                          <CopyId value={entry.entityId} />
                        </Td>
                        <Td className="text-xs text-muted-foreground">{entry.actor}</Td>
                        <Td className="text-xs text-muted-foreground">
                          {EVIDENCE_SOURCE_LABEL[entry.source]}
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
    </div>
  );
}
