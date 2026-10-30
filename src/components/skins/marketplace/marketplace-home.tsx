'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  AlarmClock,
  ArrowRight,
  CircleCheck,
  FileSpreadsheet,
  FileWarning,
  Inbox,
  MailCheck,
  ReceiptText,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { MED_STATUS_LABEL } from '@/lib/labels';
import type { BullsHomeData, BullsQueueItem } from '@/lib/bullsHome';
import type { MedStatus } from '@/domain/types';
import { initials } from './parts';

/* ==========================================================================
   Visão geral do Marketplace Verificado: faixa de indicadores, entrada de
   MEDs e a fila mais urgente. Cada número leva à visão da fila que ele conta
   (a mesma regra de `buildBullsHome`), para o painel e a lista nunca
   discordarem.
   ========================================================================== */

type Tone = 'brand' | 'warning' | 'success' | 'error' | 'neutral';

const TONE: Record<Tone, { chip: string; bar: string }> = {
  brand: { chip: 'bg-accent text-primary', bar: 'bg-primary' },
  warning: { chip: 'bg-(--mkv-warning-soft) text-(--mkv-warning)', bar: 'bg-(--mkv-warning)' },
  success: { chip: 'bg-(--mkv-success-soft) text-(--mkv-success)', bar: 'bg-(--mkv-success)' },
  error: { chip: 'bg-(--mkv-error-soft) text-(--mkv-error)', bar: 'bg-(--mkv-error)' },
  neutral: { chip: 'bg-secondary text-(--mkv-ink-2)', bar: 'bg-(--mkv-ink-3)' },
};

function percent(fraction: number): string {
  return fraction.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function count(value: number): string {
  return value.toLocaleString('pt-BR');
}

interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  note: string;
  href: string;
  fraction?: number;
}

function kpis(data: BullsHomeData): Kpi[] {
  const share = (n: number) => (data.open > 0 ? n / data.open : undefined);
  const shareNote = (n: number) => {
    const fraction = share(n);
    return fraction === undefined ? 'Nada em aberto' : `${percent(fraction)} do em aberto`;
  };
  return [
    {
      label: 'Em aberto',
      value: count(data.open),
      icon: Inbox,
      tone: 'brand',
      note: `${data.openAmountLabel} em disputa`,
      href: '/meds',
    },
    {
      label: 'Vencendo em 72h',
      value: count(data.dueSoon),
      icon: AlarmClock,
      tone: 'warning',
      note: data.urgent > 0 ? `${count(data.urgent)} em menos de 24h` : shareNote(data.dueSoon),
      href: '/meds?view=vencendo',
      fraction: share(data.dueSoon),
    },
    {
      label: 'Prontos para envio',
      value: count(data.ready),
      icon: CircleCheck,
      tone: 'brand',
      note: shareNote(data.ready),
      href: '/meds?view=prontos',
      fraction: share(data.ready),
    },
    {
      label: 'Sem evidência',
      value: count(data.blocked),
      icon: FileWarning,
      tone: 'error',
      note: shareNote(data.blocked),
      href: '/meds?view=bloqueados',
      fraction: share(data.blocked),
    },
    {
      label: 'Enviados',
      value: count(data.submitted),
      icon: Send,
      tone: 'success',
      note: 'Defesas enviadas à instituição',
      href: '/meds?view=enviados',
    },
  ];
}

function KpiStrip({ data }: { data: BullsHomeData }) {
  return (
    <section
      aria-label="Indicadores"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border bg-border shadow-(--mkv-shadow) lg:grid-cols-5"
    >
      {kpis(data).map((kpi, index) => {
        const tone = TONE[kpi.tone];
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className={cn('min-w-0 bg-card', index === 0 && 'col-span-2 lg:col-span-1')}
          >
            <Link
              href={kpi.href}
              className="flex h-full min-w-0 flex-col gap-3 p-4 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset sm:p-5"
            >
              <span className="flex items-center gap-2">
                <span className={cn('flex size-7 items-center justify-center rounded-lg', tone.chip)}>
                  <kpi.icon className="size-[15px]" aria-hidden="true" />
                </span>
                <span className="truncate text-[13px] font-medium text-(--mkv-ink-2)">{kpi.label}</span>
              </span>
              <span className="text-[30px] leading-none font-semibold tracking-[-0.025em] text-foreground tabular-nums">
                {kpi.value}
              </span>
              <span className="mt-auto flex flex-col gap-2">
                {kpi.fraction !== undefined ? (
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <span
                      className={cn('block h-full rounded-full', tone.bar)}
                      style={{ width: `${Math.min(kpi.fraction, 1) * 100}%` }}
                    />
                  </span>
                ) : null}
                <span className="truncate text-[12.5px] text-(--mkv-ink-3)">{kpi.note}</span>
              </span>
            </Link>
          </motion.div>
        );
      })}
    </section>
  );
}

const chartConfig = {
  meds: { label: 'MEDs recebidos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** "2026-10-28" → "28/10"; o último dia da janela é "Hoje". */
function dayLabel(date: string, last: boolean): string {
  if (last) return 'Hoje';
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[12.5px] text-(--mkv-ink-3)">{label}</dt>
      <dd className="flex items-baseline gap-1.5">
        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
          {value}
        </span>
        {note ? <span className="text-[12px] text-(--mkv-ink-3)">{note}</span> : null}
      </dd>
    </div>
  );
}

function IntakeChart({ data }: { data: BullsHomeData }) {
  const series = data.intake.series;
  const rows = series.map((day, index) => ({
    dia: dayLabel(day.date, index === series.length - 1),
    meds: day.received,
  }));
  const peak = series.reduce<{ received: number; index: number }>(
    (best, day, index) => (day.received > best.received ? { received: day.received, index } : best),
    { received: 0, index: -1 },
  );
  const average = data.intake.average;

  return (
    <section aria-labelledby="mkv-entrada" className="rounded-[12px] border border-border bg-card shadow-(--mkv-shadow)">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="mkv-entrada" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Entrada de MEDs — últimos {series.length} dias
          </h2>
          <p className="mt-0.5 text-[13px] text-(--mkv-ink-3)">Contestações recebidas por dia, pela data de abertura</p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-(--mkv-ink-2)">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-primary" />
            MEDs recebidos
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0 w-4 border-t-[1.5px] border-dashed border-(--mkv-ink-3)" />
            Média diária
          </span>
        </div>
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-[200px_1fr]">
        <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:content-start lg:gap-6 lg:border-r lg:border-border lg:pr-6">
          <Stat label="Total no período" value={count(data.intake.total)} note="MEDs" />
          <Stat
            label="Média diária"
            value={average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          />
          <Stat
            label="Pico"
            value={count(peak.received)}
            note={peak.index >= 0 ? rows[peak.index]?.dia : undefined}
          />
        </dl>
        {data.intake.total === 0 ? (
          <div className="flex h-[232px] items-center justify-center rounded-[10px] border border-dashed border-border text-[13px] text-(--mkv-ink-3)">
            Nenhum MED aberto nos últimos {series.length} dias.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[232px] w-full">
            <BarChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval="preserveStartEnd"
                minTickGap={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} width={44} tickMargin={6} allowDecimals={false} tick={{ fontSize: 11 }} />
              <ChartTooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltipContent indicator="dot" className="min-w-40" />} />
              <ReferenceLine y={average} stroke="var(--mkv-ink-3)" strokeDasharray="4 4" strokeWidth={1.25} ifOverflow="extendDomain" />
              <Bar dataKey="meds" fill="var(--color-meds)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
}

const STATUS_TONE: Partial<Record<MedStatus, string>> = {
  READY_TO_SUBMIT: 'bg-accent text-primary ring-primary/15',
  DEFENSE_GENERATED: 'bg-(--mkv-sky-soft) text-(--mkv-sky-ink) ring-(--mkv-sky)/20',
  MISSING_EVIDENCE: 'bg-(--mkv-error-soft) text-(--mkv-error-ink) ring-(--mkv-error)/20',
  SUBMITTED: 'bg-(--mkv-success-soft) text-(--mkv-success-ink) ring-(--mkv-success)/20',
  ACCEPTED: 'bg-(--mkv-success-soft) text-(--mkv-success-ink) ring-(--mkv-success)/20',
  REJECTED: 'bg-(--mkv-error-soft) text-(--mkv-error-ink) ring-(--mkv-error)/20',
  EXPIRED: 'bg-(--mkv-error-soft) text-(--mkv-error-ink) ring-(--mkv-error)/20',
};

export function StatusPill({ status }: { status: MedStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1',
        STATUS_TONE[status] ?? 'bg-secondary text-(--mkv-ink-2) ring-border',
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {MED_STATUS_LABEL[status]}
    </span>
  );
}

/** Prazo como o operador lê: "6h", "1d 6h", "vencido", "sem prazo". */
function deadlineLabel(hours: number | null): string {
  if (hours === null) return 'sem prazo';
  if (hours < 0) return 'vencido';
  if (hours < 1) return '< 1h';
  const whole = Math.floor(hours);
  if (whole < 24) return `${whole}h`;
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

function deadlineTone(hours: number | null): string {
  if (hours === null) return 'text-(--mkv-ink-3)';
  if (hours < 24) return 'text-(--mkv-error-ink)';
  if (hours < 72) return 'text-(--mkv-warning-ink)';
  return 'text-(--mkv-ink-2)';
}

function shortE2e(value: string | null): string {
  if (!value) return '—';
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value;
}

function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[12.5px] text-(--mkv-ink-3)">sem defesa</span>;
  const tone = value >= 70 ? 'bg-(--mkv-success)' : value >= 40 ? 'bg-(--mkv-warning)' : 'bg-(--mkv-error)';
  return (
    <span className="flex items-center justify-end gap-2.5">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${value}%` }} />
      </span>
      <span className="w-7 text-right font-mono text-[12.5px] text-foreground tabular-nums">{value}</span>
    </span>
  );
}

function QueueRowLink({ item }: { item: BullsQueueItem }) {
  return (
    <tr className="group border-t border-border transition-colors hover:bg-muted/50">
      <td className="px-5 py-3 font-mono text-[12.5px] text-(--mkv-ink-2)">
        <Link href={`/meds/${item.id}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
          {shortE2e(item.endToEndId ?? item.medId)}
        </Link>
      </td>
      <td className="px-3 py-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-(--mkv-ink-2)"
          >
            {initials(item.payerName)}
          </span>
          <span className="truncate text-[13.5px] font-medium text-foreground">{item.payerName ?? 'Pagador não informado'}</span>
        </span>
      </td>
      <td className="hidden px-3 py-3 text-[13px] text-(--mkv-ink-2) md:table-cell">{item.productLabel ?? '—'}</td>
      <td className="px-3 py-3 text-right font-mono text-[13px] font-medium text-foreground tabular-nums">{item.amountLabel}</td>
      <td className={cn('px-3 py-3 font-mono text-[12.5px] font-medium tabular-nums', deadlineTone(item.hours))}>
        {deadlineLabel(item.hours)}
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        <StatusPill status={item.status} />
      </td>
      <td className="hidden px-5 py-3 sm:table-cell">
        <ScoreBar value={item.scorePercent} />
      </td>
    </tr>
  );
}

function QueuePreview({ data }: { data: BullsHomeData }) {
  return (
    <section aria-labelledby="mkv-fila" className="overflow-hidden rounded-[12px] border border-border bg-card shadow-(--mkv-shadow)">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 id="mkv-fila" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Fila de contestações
          </h2>
          <p className="mt-0.5 text-[13px] text-(--mkv-ink-3)">
            Os {data.queue.length} casos em aberto com o prazo mais curto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/meds">Ver fila completa</Link>
          </Button>
          {data.ready > 0 ? (
            <Button asChild>
              <Link href="/meds?view=prontos">
                Prontos para envio
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </div>
      </header>
      {data.queue.length === 0 ? (
        <div className="border-t border-border px-5 py-12 text-center">
          <p className="text-[14px] font-medium text-foreground">Nenhum MED em aberto</p>
          <p className="mt-1 text-[13px] text-(--mkv-ink-3)">Importe o arquivo da adquirente para começar.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/meds/import">Importar MEDs</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/60 text-[11px] font-semibold tracking-[0.06em] text-(--mkv-ink-3) uppercase">
                <th scope="col" className="px-5 py-2.5 font-semibold">End-to-end</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Pagador</th>
                <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Produto</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Valor</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Prazo</th>
                <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">Situação</th>
                <th scope="col" className="hidden px-5 py-2.5 text-right font-semibold sm:table-cell">Score</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:relative">
              {data.queue.map((item) => (
                <QueueRowLink key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MarketplaceHome({ accountName, data }: { accountName: string; data: BullsHomeData }) {
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-primary">{accountName}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.025em] text-foreground">Visão geral</h1>
          <p className="mt-1 text-[14px] text-(--mkv-ink-2)">
            Contestações MED recebidas, prazos de resposta e defesas prontas para envio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/meds/comprovantes/gerados">
              <ReceiptText data-icon="inline-start" />
              Comprovantes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/meds/entregas">
              <MailCheck data-icon="inline-start" />
              Importar envios
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/meds/import">
              <FileSpreadsheet data-icon="inline-start" />
              Importar MEDs
            </Link>
          </Button>
        </div>
      </div>
      <KpiStrip data={data} />
      <IntakeChart data={data} />
      <QueuePreview data={data} />
    </div>
  );
}
