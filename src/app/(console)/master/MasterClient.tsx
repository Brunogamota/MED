'use client';

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlarmClock,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Download,
  FileArchive,
  FileStack,
  FileWarning,
  Inbox,
  Loader2,
  MailCheck,
  ScanSearch,
  Send,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ClientEmailView } from '@/components/ClientEmailView';
import { MasterDropzone } from '@/components/master/dropzone';
import { MasterStepper } from '@/components/master/stepper';
import { LiveSteps, type LiveRow } from '@/components/master/live-steps';
import { CompanyAvatar, CountUp, companyColor } from '@/components/master/parts';
import { MED_STATUS_LABEL } from '@/lib/labels';
import { AUTO_LAYOUT_LABEL, VIA_LABEL, type AutoLayout, type CompanyVia } from '@/domain/master/company';
import { SKINS, type SkinId } from '@/config/skins';
import type {
  MasterCompanyOverview,
  MasterDeliveryResult,
  MasterGroup,
  MasterLotResult,
  MasterPreview,
} from '@/services/masterService';
import {
  masterApplyGroupsAction,
  masterDeliveriesAction,
  masterGenerateChunkAction,
  masterImportChunkAction,
  masterLotListAction,
  masterMarkSubmittedAction,
  masterPreviewAction,
} from './actions';

/* ==========================================================================
   Central Master: todas as empresas numa tela.

   Três etapas num trilho — MEDs, envios, lote de defesa —, cada uma com a
   própria área de arquivos e o próprio resultado. A cor de cada empresa vem
   da conta dela; o resto da tela segue os tokens do ambiente em uso.
   ========================================================================== */

const ease = [0.22, 1, 0.36, 1] as const;

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border bg-card text-card-foreground shadow-xs', className)}>{children}</section>
  );
}

function PanelHeader({ icon, title, description, aside }: { icon: ReactNode; title: string; description: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {aside}
    </header>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** Os ambientes desenhados levam o nome da própria marca: dizer o tipo, não repetir o nome. */
function skinNote(skin: SkinId, layout: AutoLayout | null): string {
  if (skin !== 'auto') return 'Ambiente desenhado';
  return layout ? `Modelo automático · ${AUTO_LAYOUT_LABEL[layout]}` : SKINS.auto.label;
}

function formData(files: File[], extra: Record<string, boolean> = {}): FormData {
  const form = new FormData();
  for (const file of files) form.append('file', file);
  for (const [key, on] of Object.entries(extra)) if (on) form.set(key, 'on');
  return form;
}

// ---------------------------------------------------------------------------
// Topo: os números de todas as empresas
// ---------------------------------------------------------------------------

function Overview({ companies }: { companies: MasterCompanyOverview[] }) {
  const sum = (key: 'open' | 'dueSoon' | 'ready' | 'blocked') => companies.reduce((acc, c) => acc + c[key], 0);
  const tiles = [
    { label: 'Empresas', value: companies.length, icon: Building2, tone: 'text-primary bg-primary/10' },
    { label: 'MEDs em aberto', value: sum('open'), icon: Inbox, tone: 'text-primary bg-primary/10' },
    { label: 'Vencendo em 72h', value: sum('dueSoon'), icon: AlarmClock, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
    { label: 'Prontos para envio', value: sum('ready'), icon: CircleCheck, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card px-5 py-6 shadow-xs sm:px-7 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] opacity-[0.07]"
      />
      <div className="relative flex flex-col gap-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Conta Master
          </p>
          <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.025em] sm:text-[32px]">Central de defesa</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Importe, registre os envios e monte o lote de todas as empresas de uma vez. Cada MED fica na conta da sua
            empresa, e o comprovante sai no modelo dela.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease }}
              className="rounded-2xl border bg-background/70 p-4 backdrop-blur"
            >
              <dt className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className={cn('flex size-6 items-center justify-center rounded-lg', tile.tone)}>
                  <tile.icon className="size-3.5" aria-hidden="true" />
                </span>
                {tile.label}
              </dt>
              <dd className="mt-3 text-[30px] leading-none font-semibold tracking-[-0.02em]">
                <CountUp value={tile.value} />
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function CompanyStrip({ companies }: { companies: MasterCompanyOverview[] }) {
  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {companies.map((company, index) => {
        const color = companyColor(company.skin, company.brandColor);
        const share = company.open > 0 ? company.ready / company.open : 0;
        return (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + index * 0.04, ease }}
            style={{ '--empresa': color } as CSSProperties}
            className="relative flex w-[248px] shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-(--empresa)" />
            <div className="flex items-center gap-3">
              <CompanyAvatar name={company.name} color={color} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{company.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{skinNote(company.skin, company.brandLayout)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'abertos', value: company.open },
                { label: 'vencendo', value: company.dueSoon },
                { label: 'prontos', value: company.ready },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/60 px-1.5 py-1.5">
                  <p className="text-[15px] font-semibold tabular-nums">{item.value.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <motion.div
                  className="h-full rounded-full bg-(--empresa)"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(share * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease }}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                {company.aliases > 0
                  ? `${company.aliases} ${company.aliases === 1 ? 'pista' : 'pistas'} de reconhecimento`
                  : 'Reconhecida pelo nome'}
              </p>
            </div>
          </motion.div>
        );
      })}
      <Link
        href="/contas"
        className="flex w-[200px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-center text-[13px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
      >
        <Building2 className="size-5" aria-hidden="true" />
        Ensinar a reconhecer uma empresa (CNPJ, prefixo)
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. MEDs
// ---------------------------------------------------------------------------

function GroupCard({ group, index }: { group: MasterGroup; index: number }) {
  const color = companyColor(group.skin, group.brandColor);
  const via = Object.entries(group.via) as [CompanyVia, number][];
  return (
    <motion.li
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease }}
      style={{ '--empresa': color } as CSSProperties}
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-(--empresa)" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyAvatar name={group.name} color={color} />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold">{group.name}</p>
            {group.isNew ? (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-medium text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                Nova · desenho {group.brandLayout ? AUTO_LAYOUT_LABEL[group.brandLayout] : 'próprio'}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">{skinNote(group.skin, group.brandLayout)}</p>
            )}
          </div>
        </div>
        <p className="text-right">
          <span className="block text-[26px] leading-none font-semibold tabular-nums">{group.rows}</span>
          <span className="text-[11.5px] text-muted-foreground">{group.rows === 1 ? 'MED' : 'MEDs'}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.isNew ? (
          <span className="rounded-full border px-2 py-0.5 text-[11.5px] text-muted-foreground">pelo nome da empresa</span>
        ) : (
          via.map(([key, count]) => (
            <span key={key} className="rounded-full border px-2 py-0.5 text-[11.5px] text-muted-foreground">
              {VIA_LABEL[key]} · {count}
            </span>
          ))
        )}
      </div>
      {group.learned.length > 0 ? (
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[11.5px] font-medium text-muted-foreground">Vai aprender</p>
          <p className="mt-0.5 truncate font-mono text-[11.5px]">{group.learned.join(' · ')}</p>
        </div>
      ) : null}
    </motion.li>
  );
}

interface ImportLine {
  name: string;
  color: string;
  created: number;
  duplicated: number;
  skipped: number;
  failed: number;
  problems: { line: number; medId: string | null; message: string }[];
}

function StepMeds({ onDone }: { onDone: (summary: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<MasterPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [summary, setSummary] = useState<ImportLine[] | null>(null);
  const [showUnknown, setShowUnknown] = useState(false);

  const totalRows = preview?.groups.reduce((acc, group) => acc + group.rows, 0) ?? 0;

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setSummary(null);
    const result = await masterPreviewAction(formData(files));
    setAnalyzing(false);
    if (!result.ok) return setError(result.error);
    setPreview(result.data);
  }

  async function confirm() {
    if (!preview) return;
    setError(null);
    const groups = preview.groups;
    const live: LiveRow[] = groups.map((group) => ({
      id: group.key,
      name: group.name,
      color: companyColor(group.skin, group.brandColor),
      status: 'pending',
      meta: `${group.rows} MEDs`,
      progress: 0,
    }));
    setRows([...live]);
    const mapping = await masterApplyGroupsAction(
      groups.map((group) => ({
        key: group.key,
        accountId: group.accountId,
        name: group.name,
        brandColor: group.brandColor,
        brandLayout: group.brandLayout,
        learned: group.learned,
      })),
    );
    if (!mapping.ok) {
      setRows(null);
      return setError(mapping.error);
    }
    const out: ImportLine[] = [];
    for (const [index, group] of groups.entries()) {
      const accountId = mapping.data[group.key];
      const line: ImportLine = { name: group.name, color: live[index]!.color, created: 0, duplicated: 0, skipped: 0, failed: 0, problems: [] };
      live[index] = { ...live[index]!, status: 'active', meta: `0 de ${group.chunks.length}` };
      setRows([...live]);
      for (const [n, chunk] of group.chunks.entries()) {
        const result = accountId ? await masterImportChunkAction(accountId, chunk) : null;
        if (result?.ok) {
          line.created += result.data.created;
          line.duplicated += result.data.duplicated;
          line.skipped += result.data.skipped;
          line.failed += result.data.failed;
          line.problems.push(...result.data.problems);
        } else {
          line.failed += 1;
          line.problems.push({ line: 0, medId: null, message: result?.error ?? 'Conta não encontrada.' });
        }
        live[index] = { ...live[index]!, meta: `bloco ${n + 1} de ${group.chunks.length}`, progress: (n + 1) / group.chunks.length };
        setRows([...live]);
      }
      live[index] = {
        ...live[index]!,
        status: line.failed > 0 ? 'error' : 'done',
        meta: `${line.created} novos`,
        progress: 1,
      };
      setRows([...live]);
      out.push(line);
    }
    setSummary(out);
    setPreview(null);
    setFiles([]);
    const created = out.reduce((acc, line) => acc + line.created, 0);
    onDone(`${created} MEDs novos em ${out.length} ${out.length === 1 ? 'empresa' : 'empresas'}`);
  }

  const running = rows !== null && summary === null;

  return (
    <Panel>
      <PanelHeader
        icon={<Upload className="size-4" aria-hidden="true" />}
        title="MEDs de todas as empresas"
        description="Pode ser a planilha misturada, um arquivo por empresa ou um .xlsx com várias abas. Cada MED vai para a conta da sua empresa: pelo CNPJ ou chave Pix do recebedor, pelo nome da empresa, pelo prefixo do pedido ou pelo nome do arquivo."
      />
      <div className="space-y-5 p-5 sm:p-6">
        {!preview && !rows ? (
          <>
            <MasterDropzone
              files={files}
              onChange={setFiles}
              title="Solte aqui os arquivos de MEDs"
              hint="CSV, XLSX (todas as abas) ou ZIP. Vários de uma vez."
              disabled={analyzing}
            />
            <div className="flex justify-end">
              <Button type="button" size="lg" onClick={analyze} disabled={files.length === 0 || analyzing}>
                {analyzing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ScanSearch data-icon="inline-start" />}
                {analyzing ? 'Lendo os arquivos…' : 'Separar por empresa'}
              </Button>
            </div>
          </>
        ) : null}

        <ErrorLine message={error} />

        {preview ? (
          <div className="space-y-4">
            {preview.files.filter((file) => file.error).map((file) => (
              <ErrorLine key={file.name} message={`${file.name}: ${file.error}`} />
            ))}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {preview.groups.map((group, index) => (
                <GroupCard key={group.key} group={group} index={index} />
              ))}
            </ul>
            {preview.unknown.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <button
                  type="button"
                  onClick={() => setShowUnknown(!showUnknown)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={showUnknown}
                >
                  <span className="flex items-center gap-2 text-[13.5px] font-medium">
                    <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    {preview.unknown.length} {preview.unknown.length === 1 ? 'linha sem empresa fica' : 'linhas sem empresa ficam'} de fora
                  </span>
                  <ChevronDown className={cn('size-4 transition-transform', showUnknown && 'rotate-180')} aria-hidden="true" />
                </button>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Nenhuma pista bateu com uma empresa. Cadastre o CNPJ ou o prefixo em Contas e suba de novo — nada é
                  encaixado por palpite.
                </p>
                <AnimatePresence initial={false}>
                  {showUnknown ? (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden font-mono text-[12px] text-muted-foreground"
                    >
                      {preview.unknown.slice(0, 40).map((row) => (
                        <li key={`${row.file}-${row.line}`}>
                          {row.file} · linha {row.line}
                          {row.medId ? ` · ${row.medId}` : ''}
                        </li>
                      ))}
                    </motion.ul>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/90 p-3 pl-4 shadow-lg backdrop-blur">
              <p className="text-[13.5px]">
                <span className="font-semibold">{totalRows} MEDs</span> em{' '}
                <span className="font-semibold">{preview.groups.length}</span>{' '}
                {preview.groups.length === 1 ? 'empresa' : 'empresas'}
                {preview.groups.some((group) => group.isNew) ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · {preview.groups.filter((group) => group.isNew).length} nova(s) serão criadas
                  </span>
                ) : null}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
                  Voltar
                </Button>
                <Button type="button" onClick={confirm} disabled={preview.groups.length === 0}>
                  Importar tudo
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {rows ? <LiveSteps rows={rows} label="Importação por empresa" /> : null}

        {summary ? (
          <div className="space-y-3">
            {summary.some((line) => line.problems.length > 0) ? (
              <details className="rounded-2xl border p-4 text-[13px]">
                <summary className="cursor-pointer font-medium">Linhas que não entraram</summary>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {summary.flatMap((line) =>
                    line.problems.slice(0, 10).map((problem, index) => (
                      <li key={`${line.name}-${index}`}>
                        <span className="font-medium text-foreground">{line.name}</span> ·{' '}
                        {problem.line ? `linha ${problem.line}` : 'bloco'}
                        {problem.medId ? ` (${problem.medId})` : ''}: {problem.message}
                      </li>
                    )),
                  )}
                </ul>
              </details>
            ) : null}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => { setRows(null); setSummary(null); }}>
                Importar mais arquivos
              </Button>
            </div>
          </div>
        ) : null}
        {running ? <p className="text-[12.5px] text-muted-foreground">Não feche a página até terminar.</p> : null}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 2. Envios
// ---------------------------------------------------------------------------

function ToggleRow({ id, checked, onChange, title, description }: { id: string; checked: boolean; onChange: (value: boolean) => void; title: string; description: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3.5 transition-colors hover:bg-muted/40">
      <span>
        <span className="block text-[13.5px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}

function StepDeliveries({ colors, onDone }: { colors: Map<string, string>; onDone: (summary: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [receipts, setReceipts] = useState(true);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MasterDeliveryResult | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await masterDeliveriesAction(formData(files, { gerarComprovantes: receipts, substituirComprovantes: replace }));
    setBusy(false);
    if (!response.ok) return setError(response.error);
    setResult(response.data);
    setFiles([]);
    const total = response.data.companies.reduce((acc, company) => acc + company.receipts, 0);
    onDone(`${total} comprovantes gerados`);
  }

  return (
    <Panel>
      <PanelHeader
        icon={<MailCheck className="size-4" aria-hidden="true" />}
        title="Envios e comprovantes"
        description="Logs de envio, planilhas de pedidos e linhas do tempo de todas as empresas juntos. Cada linha é registrada na empresa que tem aquele MED, e o comprovante sai no modelo dela."
      />
      <div className="space-y-5 p-5 sm:p-6">
        <MasterDropzone
          files={files}
          onChange={setFiles}
          title="Solte aqui os arquivos de envio"
          hint="Logs do provedor, Pedidos e Linha do Tempo — CSV, XLSX ou ZIP."
          disabled={busy}
        />
        <div className="grid gap-2.5 md:grid-cols-2">
          <ToggleRow id="gerar" checked={receipts} onChange={setReceipts} title="Gerar os comprovantes" description="Um por envio registrado, no modelo de cada empresa." />
          <ToggleRow id="substituir" checked={replace} onChange={setReplace} title="Substituir os antigos" description="Apaga os comprovantes desses casos que não vieram destes arquivos." />
        </div>
        <ErrorLine message={error} />
        <div className="flex justify-end">
          <Button type="button" size="lg" onClick={send} disabled={files.length === 0 || busy}>
            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {busy ? 'Registrando em todas as empresas…' : 'Registrar envios'}
          </Button>
        </div>
        {result ? (
          <div className="space-y-3">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.companies.map((company, index) => {
                const color = colors.get(company.accountId) ?? '#334155';
                return (
                  <motion.li
                    key={company.accountId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease }}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-4"
                  >
                    <CompanyAvatar name={company.name} color={color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{company.name}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {company.recorded} registrados
                        {company.invalid > 0 ? ` · ${company.invalid} inválidas` : ''}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="block text-[22px] leading-none font-semibold tabular-nums">{company.receipts}</span>
                      <span className="text-[11.5px] text-muted-foreground">comprovantes</span>
                    </p>
                  </motion.li>
                );
              })}
            </ul>
            {result.companies.length === 0 ? (
              <ErrorLine message="Nenhuma linha casou com MED de nenhuma empresa. Importe os MEDs primeiro." />
            ) : null}
            {result.unmatched.length > 0 ? (
              <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
                {result.unmatched.length} {result.unmatched.length === 1 ? 'linha não achou' : 'linhas não acharam'} MED em
                nenhuma empresa (ex.: {result.unmatched.slice(0, 3).map((line) => line.medId ?? `linha ${line.line}`).join(', ')}).
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 3. Lote de defesa
// ---------------------------------------------------------------------------

interface Part {
  name: string;
  url: string;
  meds: number;
  bytes: number;
  color: string;
  company: string;
}

interface Rendered {
  key: string;
  result: MasterLotResult;
  skin: SkinId;
  brandColor: string | null;
  brandLayout: AutoLayout | null;
  receiptIndex: number;
}

const PART_SIZE = 150;
const CHUNK = 10;
const PRESETS = [7, 14, 21, 30] as const;

function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'empresa'
  );
}

function csvLine(values: (string | number | null)[]): string {
  return values
    .map((value) => {
      const text = value === null ? '' : String(value);
      return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(';');
}

function deadlineLabel(iso: string | null): string {
  if (!iso) return 'sem prazo';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function sizeLabel(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Fonte da peça de cada ambiente: o print sai igual ao que a tela mostra. */
function fontFor(skin: SkinId): CSSProperties {
  return {
    '--font-sans':
      skin === 'bulls'
        ? 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif'
        : 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
  } as CSSProperties;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function StepLot({ companies, onDone }: { companies: MasterCompanyOverview[]; onDone: (summary: string) => void }) {
  const today = useMemo(() => new Date(), []);
  const [days, setDays] = useState<number | null>(21);
  const [from, setFrom] = useState(isoDay(new Date(today.getTime() - 21 * 86400000)));
  const [to, setTo] = useState(isoDay(today));
  const [selected, setSelected] = useState<string[]>(companies.filter((c) => c.open > 0).map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [overall, setOverall] = useState<{ done: number; total: number } | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [pending, setPending] = useState<{ account: string; result: MasterLotResult }[]>([]);
  const [included, setIncluded] = useState<{ accountId: string; id: string }[]>([]);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [marked, setMarked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const byId = new Map(companies.map((company) => [company.id, company]));

  function preset(value: number) {
    setDays(value);
    setFrom(isoDay(new Date(today.getTime() - value * 86400000)));
    setTo(isoDay(today));
  }

  async function run() {
    setBusy(true);
    setError(null);
    setParts([]);
    setPending([]);
    setIncluded([]);
    setMarked(null);
    setFinished(false);
    const list = await masterLotListAction({ from: from || null, to: to || null, accountIds: selected });
    if (!list.ok) {
      setBusy(false);
      return setError(list.error);
    }
    const items = list.data;
    if (items.length === 0) {
      setBusy(false);
      return setError('Nenhum MED em aberto nesse período, nas empresas escolhidas.');
    }

    const [{ toBlob, getFontEmbedCSS }, { default: JSZip }] = await Promise.all([import('html-to-image'), import('jszip')]);
    const fontCss = new Map<string, string>();
    const allPending: { account: string; result: MasterLotResult }[] = [];
    const allIncluded: { accountId: string; id: string }[] = [];
    const newParts: Part[] = [];
    const accountIds = [...new Set(items.map((item) => item.accountId))];
    const live: LiveRow[] = accountIds.map((id) => {
      const company = byId.get(id)!;
      const count = items.filter((item) => item.accountId === id).length;
      return { id, name: company.name, color: companyColor(company.skin, company.brandColor), status: 'pending', meta: `${count} MEDs`, progress: 0 };
    });
    setRows([...live]);
    let done = 0;
    setOverall({ done, total: items.length });

    for (const [rowIndex, accountId] of accountIds.entries()) {
      const company = byId.get(accountId);
      if (!company) continue;
      const color = live[rowIndex]!.color;
      const ids = items.filter((item) => item.accountId === accountId).map((item) => item.id);
      const folder = slug(company.name);
      let zip = new JSZip();
      const header = csvLine(['Empresa', 'MED', 'End-to-end', 'Valor', 'Prazo', 'Score', 'Situação', 'Arquivos', 'Pendências']);
      let index: string[] = [header];
      let inPart = 0;
      let partNumber = 1;
      let companyIncluded = 0;

      const closePart = async () => {
        if (inPart === 0) return;
        zip.file('indice.csv', `﻿${index.join('\n')}\n`);
        const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        const name = `lote-${folder}-parte-${partNumber}.zip`;
        const url = URL.createObjectURL(blob);
        newParts.push({ name, url, meds: inPart, bytes: blob.size, color, company: company.name });
        setParts([...newParts]);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        partNumber += 1;
        zip = new JSZip();
        index = [header];
        inPart = 0;
      };

      live[rowIndex] = { ...live[rowIndex]!, status: 'active', meta: `0 de ${ids.length}` };
      setRows([...live]);

      for (let start = 0; start < ids.length; start += CHUNK) {
        const chunk = await masterGenerateChunkAction(accountId, ids.slice(start, start + CHUNK));
        const results = chunk.ok ? chunk.data : [];
        if (!chunk.ok) setError(chunk.error);

        // Prints dos comprovantes: a peça no modelo da empresa, fora da tela.
        const toRender: Rendered[] = results
          .filter((result) => result.include)
          .flatMap((result) =>
            result.receipts.map((_, receiptIndex) => ({
              key: `${result.id}-${receiptIndex}`,
              result,
              skin: company.skin,
              brandColor: company.brandColor,
              brandLayout: company.brandLayout,
              receiptIndex,
            })),
          );
        flushSync(() => setRendered(toRender));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const shots = new Map<string, Blob>();
        const nodes = [...(stage.current?.querySelectorAll<HTMLElement>('[data-print-key]') ?? [])];
        // Cada desenho do modelo automático tem a própria fonte: a cache é por ambiente e desenho.
        const fontKey = `${company.skin}:${company.brandLayout ?? ''}`;
        if (nodes.length > 0 && !fontCss.has(fontKey)) fontCss.set(fontKey, await getFontEmbedCSS(nodes[0]!));
        for (const node of nodes) {
          const blob = await toBlob(node, { pixelRatio: 1.5, fontEmbedCSS: fontCss.get(fontKey), skipAutoScale: true, backgroundColor: '#ffffff' });
          if (blob) shots.set(node.dataset.printKey ?? '', blob);
        }

        // PDFs da defesa, quatro por vez.
        const pdfs = new Map<string, Blob>();
        const queue = results.filter((result) => result.include);
        await Promise.all(
          Array.from({ length: Math.min(4, queue.length) }, async () => {
            for (let item = queue.shift(); item; item = queue.shift()) {
              const response = await fetch(`/master/pdf?conta=${encodeURIComponent(accountId)}&id=${encodeURIComponent(item.id)}`);
              if (response.ok) pdfs.set(item.id, await response.blob());
            }
          }),
        );

        for (const result of results) {
          done += 1;
          if (!result.include) {
            allPending.push({ account: company.name, result });
            continue;
          }
          const dir = `${folder}/${slug(result.endToEndId ?? result.medId)}`;
          const files: string[] = [];
          const pdf = pdfs.get(result.id);
          if (pdf) {
            zip.file(`${dir}/defesa.pdf`, pdf);
            files.push('defesa.pdf');
          }
          result.receipts.forEach((_, receiptIndex) => {
            const shot = shots.get(`${result.id}-${receiptIndex}`);
            if (!shot) return;
            const name = `comprovante-${receiptIndex + 1}.png`;
            zip.file(`${dir}/${name}`, shot);
            files.push(name);
          });
          index.push(
            csvLine([
              company.name,
              result.medId,
              result.endToEndId,
              result.amountLabel,
              deadlineLabel(result.deadline),
              result.score,
              MED_STATUS_LABEL[result.status],
              files.join(', '),
              result.missing.join(', '),
            ]),
          );
          allIncluded.push({ accountId, id: result.id });
          companyIncluded += 1;
          inPart += 1;
          if (inPart >= PART_SIZE) await closePart();
        }
        const processed = Math.min(start + CHUNK, ids.length);
        live[rowIndex] = { ...live[rowIndex]!, meta: `${processed} de ${ids.length}`, progress: processed / ids.length };
        setRows([...live]);
        setOverall({ done, total: items.length });
      }
      await closePart();
      live[rowIndex] = { ...live[rowIndex]!, status: 'done', meta: `${companyIncluded} no lote`, progress: 1 };
      setRows([...live]);
    }

    flushSync(() => setRendered([]));
    setPending(allPending);
    setIncluded(allIncluded);
    setBusy(false);
    setFinished(true);
    onDone(`${allIncluded.length} MEDs em ${newParts.length} ${newParts.length === 1 ? 'arquivo' : 'arquivos'}`);
  }

  function downloadPending() {
    const lines = [csvLine(['Empresa', 'MED', 'Situação', 'O que falta', 'Erro'])];
    for (const { account, result } of pending) {
      lines.push(csvLine([account, result.medId, MED_STATUS_LABEL[result.status], result.missing.join(', '), result.error]));
    }
    const url = URL.createObjectURL(new Blob([`﻿${lines.join('\n')}\n`], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pendentes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function markSubmitted() {
    setBusy(true);
    let total = 0;
    for (const accountId of [...new Set(included.map((item) => item.accountId))]) {
      const ids = included.filter((item) => item.accountId === accountId).map((item) => item.id);
      for (let start = 0; start < ids.length; start += 50) {
        const result = await masterMarkSubmittedAction(accountId, ids.slice(start, start + 50));
        if (result.ok) total += result.data;
      }
    }
    setMarked(total);
    setBusy(false);
  }

  const percent = overall ? Math.round((overall.done / Math.max(overall.total, 1)) * 100) : 0;
  const openSelected = companies.filter((c) => selected.includes(c.id)).reduce((acc, c) => acc + c.open, 0);

  return (
    <Panel>
      <PanelHeader
        icon={<FileStack className="size-4" aria-hidden="true" />}
        title="Lote de defesa"
        description="Gera a defesa de cada MED em aberto e baixa um ZIP por empresa: uma pasta por MED (pelo end-to-end) com o PDF da defesa e os prints dos comprovantes no modelo da empresa, mais o índice."
      />
      <div className="space-y-6 p-5 sm:p-6">
        {!busy && !finished ? (
          <>
            <div className="space-y-2.5">
              <p className="text-[13px] font-medium">Período (data de abertura do MED)</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="inline-flex rounded-xl border bg-muted/50 p-1" role="group" aria-label="Atalhos de período">
                  {PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => preset(value)}
                      aria-pressed={days === value}
                      className={cn(
                        'relative h-8 rounded-lg px-3 text-[13px] font-medium transition-colors',
                        days === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {days === value ? (
                        <motion.span layoutId="master-preset" className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                      ) : null}
                      <span className="relative">{value} dias</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="lote-de" className="text-[12px] text-muted-foreground">De</Label>
                    <Input id="lote-de" type="date" value={from} className="h-10 w-[150px]" onChange={(event) => { setFrom(event.target.value); setDays(null); }} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="lote-ate" className="text-[12px] text-muted-foreground">Até</Label>
                    <Input id="lote-ate" type="date" value={to} className="h-10 w-[150px]" onChange={(event) => { setTo(event.target.value); setDays(null); }} />
                  </div>
                </div>
              </div>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-[13px] font-medium">Empresas</legend>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {companies.map((company) => {
                  const on = selected.includes(company.id);
                  const color = companyColor(company.skin, company.brandColor);
                  return (
                    <label
                      key={company.id}
                      style={{ '--empresa': color } as CSSProperties}
                      className={cn(
                        'relative flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all',
                        on ? 'border-(--empresa) bg-card shadow-sm ring-1 ring-(--empresa)/30' : 'bg-muted/30 opacity-70 hover:opacity-100',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => setSelected(on ? selected.filter((id) => id !== company.id) : [...selected, company.id])}
                      />
                      <CompanyAvatar name={company.name} color={color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{company.name}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {company.open} em aberto · {company.dueSoon} vencendo
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn('flex size-5 items-center justify-center rounded-full border-2 transition-colors', on ? 'border-(--empresa) bg-(--empresa) text-white' : 'border-muted-foreground/30')}
                      >
                        {on ? <Check className="size-3" strokeWidth={3.5} /> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <ErrorLine message={error} />

            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border bg-muted/40 p-4 sm:flex-row sm:items-center">
              <p className="text-[13px] text-muted-foreground">
                Até <span className="font-semibold text-foreground">{openSelected.toLocaleString('pt-BR')}</span> MEDs em aberto
                em <span className="font-semibold text-foreground">{selected.length}</span>{' '}
                {selected.length === 1 ? 'empresa' : 'empresas'}. Sem prova de envio e com evidência obrigatória faltando, o MED vai para as pendências — não para o lote.
              </p>
              <Button type="button" size="lg" onClick={run} disabled={selected.length === 0}>
                <FileStack data-icon="inline-start" />
                Gerar lote
              </Button>
            </div>
          </>
        ) : null}

        {busy || finished ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-muted/30 p-6 text-center">
              <div className="relative size-36">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="9" className="text-muted" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    strokeLinecap="round"
                    className="text-primary"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - percent / 100) }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[30px] leading-none font-semibold tabular-nums">{percent}%</span>
                  <span className="mt-1 text-[12px] text-muted-foreground">
                    {overall ? `${overall.done} de ${overall.total}` : ''}
                  </span>
                </div>
              </div>
              <p className="text-[13.5px] font-medium" aria-live="polite">
                {finished ? 'Lote pronto' : 'Gerando defesas e prints…'}
              </p>
              {!finished ? <p className="text-[12px] text-muted-foreground">Não feche a página até terminar.</p> : null}
            </div>
            <div className="space-y-4">
              {rows ? <LiveSteps rows={rows} label="Lote por empresa" /> : null}
              <ErrorLine message={error} />
            </div>
          </div>
        ) : null}

        {parts.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-[13px] font-medium">Arquivos do lote</p>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {parts.map((part) => (
                  <motion.li
                    key={part.name}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <a
                      href={part.url}
                      download={part.name}
                      style={{ '--empresa': part.color } as CSSProperties}
                      className="group flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-shadow hover:shadow-md"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--empresa)/10 text-(--empresa)">
                        <FileArchive className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{part.company}</span>
                        <span className="block truncate font-mono text-[11.5px] text-muted-foreground">
                          {part.meds} MEDs · {sizeLabel(part.bytes)}
                        </span>
                      </span>
                      <Download className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
                    </a>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ) : null}

        {finished ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                No lote
              </p>
              <p className="mt-2 text-[28px] leading-none font-semibold tabular-nums">{included.length}</p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <FileWarning className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Pendentes
              </p>
              <p className="mt-2 text-[28px] leading-none font-semibold tabular-nums">{pending.length}</p>
              {pending.length > 0 ? (
                <button type="button" onClick={downloadPending} className="mt-2 text-[12.5px] font-medium text-primary hover:underline">
                  Baixar a lista com o que falta
                </button>
              ) : null}
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-4">
              <p className="text-[12.5px] text-muted-foreground">Depois de subir no portal:</p>
              {marked === null ? (
                <Button type="button" variant="outline" onClick={markSubmitted} disabled={busy || included.length === 0}>
                  <CheckCircle2 data-icon="inline-start" />
                  Marcar os {included.length} como enviados
                </Button>
              ) : (
                <p className="text-[13.5px] font-medium">{marked} marcados como enviados.</p>
              )}
              <button type="button" onClick={() => { setFinished(false); setRows(null); setOverall(null); setParts([]); }} className="text-left text-[12.5px] text-muted-foreground hover:text-foreground">
                Montar outro lote
              </button>
            </div>
          </div>
        ) : null}

        {/* Palco dos prints: fora da tela, na largura da peça impressa. */}
        <div ref={stage} aria-hidden="true" className="pointer-events-none fixed top-0 -left-[12000px] w-[1000px]">
          {rendered.map((item) => {
            const entry = item.result.receipts[item.receiptIndex];
            if (!entry) return null;
            return (
              <div key={item.key} data-print-key={item.key} style={fontFor(item.skin)} className="bg-white p-4">
                <ClientEmailView
                  receipt={entry.receipt}
                  skin={item.skin}
                  brandColor={item.brandColor}
                  brandLayout={item.brandLayout}
                  sourceReference={entry.sourceReference}
                  endToEndId={item.result.endToEndId}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function MasterClient({ companies }: { companies: MasterCompanyOverview[] }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<(string | null)[]>([null, null, null]);
  const colors = new Map(companies.map((company) => [company.id, companyColor(company.skin, company.brandColor)]));

  const finish = (index: number) => (summary: string) => {
    setDone((current) => current.map((value, i) => (i === index ? summary : value)));
    router.refresh();
  };

  const steps = [
    { title: 'Importar MEDs', description: done[0] ?? 'Planilhas de todas as empresas', icon: Upload, done: done[0] !== null },
    { title: 'Registrar envios', description: done[1] ?? 'Logs e linhas do tempo', icon: MailCheck, done: done[1] !== null },
    { title: 'Lote de defesa', description: done[2] ?? 'ZIP por empresa', icon: FileStack, done: done[2] !== null },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <Overview companies={companies} />
      <CompanyStrip companies={companies} />
      <Panel className="px-4 py-5 sm:px-8">
        <MasterStepper steps={steps} active={active} onSelect={setActive} />
      </Panel>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
        >
          {active === 0 ? <StepMeds onDone={finish(0)} /> : null}
          {active === 1 ? <StepDeliveries colors={colors} onDone={finish(1)} /> : null}
          {active === 2 ? <StepLot companies={companies} onDone={finish(2)} /> : null}
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}>
          Etapa anterior
        </Button>
        <Button type="button" variant="outline" onClick={() => setActive(Math.min(2, active + 1))} disabled={active === 2}>
          Próxima etapa
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
