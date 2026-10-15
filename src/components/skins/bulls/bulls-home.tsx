'use client';

/**
 * Visão geral do ambiente Bulls Cash ("Bento Claro").
 *
 * Base: bento do 21st.dev (#30742 "Financial Bento Grid"), adaptado — sem foto
 * e sem logo, blocos trocados pelos números da conta. Todo número chega pronto
 * de `buildBullsHome` (servidor, dados reais); aqui só se desenha. Nenhum
 * valor de exemplo: conta vazia mostra zero e diz o que fazer.
 */

import * as React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'motion/react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  FileUp,
  FileWarning,
  Inbox,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import type { BullsHomeData } from '@/lib/bullsHome';
import { BullsAvatar, BullsPrazoChip } from './parts';
import { BullsQueueCard } from './bulls-queue-card';

const tileBase =
  'relative overflow-hidden rounded-[24px] border border-bulls-line bg-card shadow-bulls transition-shadow duration-300 hover:shadow-bulls-hover';

const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
};

const pct = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 });

/* ─── Herói: prontos para envio ────────────────────────────── */

function HeroTile({ data }: { data: BullsHomeData }) {
  const share = data.readyShare ?? 0;
  return (
    <motion.section
      variants={item}
      aria-labelledby="bulls-hero-title"
      className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-bulls-brand-deep via-bulls-brand-strong to-bulls-brand p-6 text-bulls-on-brand shadow-bulls-hero sm:p-8 lg:col-span-5 lg:row-span-2"
    >
      {/* Ornamento: anéis concêntricos, sem dado nenhum. */}
      <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -top-24 -right-24 size-[380px] opacity-[0.18]">
        {[60, 100, 140, 180].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1.2" />
        ))}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 size-[320px] rounded-full bg-bulls-lilac opacity-30 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-bulls-on-brand/15 px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-bulls-on-brand/25 backdrop-blur">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Prontos para envio
        </span>
      </div>

      <div className="relative mt-8">
        <h2 id="bulls-hero-title" className="sr-only">
          Prontos para envio
        </h2>
        <p className="text-[76px] leading-[0.9] font-bold tracking-[-0.04em] tabular-nums sm:text-[96px]">{data.ready}</p>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-bulls-on-brand/85">
          {data.ready > 0
            ? 'MEDs com defesa pronta e evidência suficiente, esperando seguir para a instituição.'
            : data.open > 0
              ? 'Nenhum MED pronto ainda. Os casos em aberto esperam evidência ou defesa.'
              : 'Nenhum MED em aberto nesta conta.'}
        </p>
      </div>

      <div className="relative mt-8 space-y-5">
        {data.readyShare !== null ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-bulls-on-brand/80">
              <span>Da fila em aberto</span>
              <span className="font-semibold text-bulls-on-brand tabular-nums">
                {data.ready} de {data.open} · {pct(share)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bulls-on-brand/20">
              <motion.div
                className="h-full rounded-full bg-bulls-on-brand"
                initial={{ width: 0 }}
                animate={{ width: `${share * 100}%` }}
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
              />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {data.total === 0 ? (
            <Link
              href="/meds/import"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-bulls-on-brand px-5 text-[14px] font-semibold text-bulls-brand-deep shadow-bulls-pill transition-colors hover:bg-bulls-on-brand/90"
            >
              <FileUp className="size-4" aria-hidden="true" />
              Importar MEDs
            </Link>
          ) : (
            <Link
              href="/meds?view=prontos"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-bulls-on-brand px-5 text-[14px] font-semibold text-bulls-brand-deep shadow-bulls-pill transition-colors hover:bg-bulls-on-brand/90"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Gerar defesas
            </Link>
          )}
          <Link
            href="/meds"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-bulls-on-brand transition-colors hover:bg-bulls-on-brand/15"
          >
            Ver lista
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Indicadores ──────────────────────────────────────────── */

type Tone = 'brand' | 'warning' | 'error' | 'success';

const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-bulls-brand-soft text-bulls-brand-strong',
  warning: 'bg-bulls-warning-soft text-bulls-warning-ink',
  error: 'bg-bulls-error-soft text-bulls-error-ink',
  success: 'bg-bulls-success-soft text-bulls-success-ink',
};

function StatTile({
  label,
  value,
  detail,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  detail: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
  href: string;
}) {
  return (
    <motion.article variants={item} className={cn(tileBase, 'group')}>
      <Link
        href={href}
        className="flex h-full flex-col justify-between gap-6 rounded-[24px] p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <span className={cn('flex size-10 items-center justify-center rounded-2xl', TONE_CHIP[tone])}>{icon}</span>
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full text-bulls-ink-4 transition-colors group-hover:bg-bulls-brand-wash group-hover:text-bulls-brand-strong"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
        <div>
          <h3 className="text-[13.5px] font-medium text-bulls-ink-3">{label}</h3>
          <p className="mt-1 text-[34px] leading-none font-bold tracking-[-0.03em] text-foreground tabular-nums sm:text-[40px]">
            {value}
          </p>
          <p className="mt-2.5 text-[13px] text-bulls-ink-2">{detail}</p>
        </div>
      </Link>
    </motion.article>
  );
}

/* ─── Gráfico de entrada ───────────────────────────────────── */

const chartConfig = {
  entradas: { label: 'MEDs recebidos', color: 'var(--bulls-brand)' },
} satisfies ChartConfig;

const DAY_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const DAY_LONG = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

function IntakeChartTile({ data }: { data: BullsHomeData }) {
  const gradientId = React.useId().replace(/:/g, '');
  const { series, total, average, variation } = data.intake;
  const lastIndex = series.length - 1;
  const chartData = series.map((day, index) => {
    const date = new Date(`${day.date}T12:00:00.000Z`);
    return {
      dia: index === lastIndex ? 'Hoje' : DAY_SHORT.format(date),
      rotulo: DAY_LONG.format(date),
      entradas: day.received,
    };
  });
  const rotulo: Record<string, string> = Object.fromEntries(chartData.map((d) => [d.dia, d.rotulo]));
  const subiu = variation !== null && variation >= 0;

  return (
    <motion.section variants={item} aria-labelledby="bulls-chart-title" className={cn(tileBase, 'flex flex-col p-5 sm:p-6 lg:col-span-7')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="bulls-chart-title" className="text-[16px] font-semibold tracking-tight text-foreground">
            Entrada de MEDs — {series.length} dias
          </h2>
          <p className="mt-1 text-[13px] text-bulls-ink-3">Contestações abertas por dia</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums">{total}</p>
            <p className="mt-1 text-[12px] text-bulls-ink-3">
              média {average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia
            </p>
          </div>
          {variation !== null ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums',
                subiu ? 'bg-bulls-warning-soft text-bulls-warning-ink' : 'bg-bulls-success-soft text-bulls-success-ink',
              )}
              title="Últimos 7 dias contra os 7 anteriores"
            >
              {subiu ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
              {subiu ? '+' : ''}
              {pct(variation)}
              <span className="sr-only"> nos últimos 7 dias contra os 7 anteriores</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 flex min-h-[220px] flex-1 flex-col sm:min-h-[240px]">
        <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-[220px] w-full flex-1 sm:min-h-[240px]">
          <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-entradas)" stopOpacity={0.32} />
                <stop offset="65%" stopColor="var(--color-entradas)" stopOpacity={0.06} />
                <stop offset="100%" stopColor="var(--color-entradas)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="var(--bulls-line)" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={18}
              tick={{ fill: 'var(--bulls-ink-3)', fontSize: 11 }}
            />
            <YAxis
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={28}
              tickMargin={6}
              allowDecimals={false}
              tick={{ fill: 'var(--bulls-ink-4)', fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--bulls-lilac)', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  className="rounded-2xl border-bulls-line bg-card px-3 py-2 shadow-bulls-hover"
                  labelFormatter={(label) => rotulo[String(label)] ?? String(label)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="entradas"
              stroke="var(--color-entradas)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--card)', fill: 'var(--bulls-brand-strong)' }}
            />
          </AreaChart>
        </ChartContainer>
        {total === 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-[13px] font-medium text-bulls-ink-3">
            Nenhum MED aberto nestes {series.length} dias.
          </p>
        ) : null}
      </div>
    </motion.section>
  );
}

/* ─── Precisam de você ─────────────────────────────────────── */

function NeedsYouTile({ data }: { data: BullsHomeData }) {
  return (
    <motion.section variants={item} aria-labelledby="bulls-needs-title" className={cn(tileBase, 'flex flex-col p-5 sm:p-6 lg:col-span-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="bulls-needs-title" className="text-[16px] font-semibold tracking-tight text-foreground">
            Precisam de você
          </h2>
          <p className="mt-1 text-[13px] text-bulls-ink-3">Prazo curto ou sem evidência suficiente</p>
        </div>
        <Link
          href="/meds?view=vencendo"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-bulls-brand-strong transition-colors hover:bg-bulls-brand-wash hover:text-bulls-brand-deep"
        >
          Ver todos
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {data.needsYou.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-bulls-line-strong bg-bulls-bg-2 px-4 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-bulls-success-soft text-bulls-success-ink">
            <CircleCheck className="size-5" aria-hidden="true" />
          </span>
          <p className="text-[14px] font-semibold">Nada pedindo ação agora</p>
          <p className="max-w-[32ch] text-[12.5px] text-bulls-ink-3">
            Nenhum MED vence nas próximas 24 h e nenhum está travado por evidência.
          </p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-1 flex-col gap-2.5">
          {data.needsYou.map((med) => (
            <li key={med.id}>
              <Link
                href={med.blocked ? `/meds/${med.id}?tab=evidencias` : `/meds/${med.id}`}
                className="group/row flex items-center gap-3 rounded-[18px] border border-bulls-line bg-bulls-bg-2 p-3 outline-none transition-colors hover:border-bulls-line-strong hover:bg-bulls-brand-wash focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BullsAvatar name={med.payerName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-foreground">{med.payerName ?? med.medId}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-bulls-ink-3">
                    <span
                      aria-hidden="true"
                      className={cn('size-1.5 shrink-0 rounded-full', med.blocked ? 'bg-bulls-error' : 'bg-bulls-warning')}
                    />
                    {med.blocked
                      ? 'Sem evidência'
                      : med.hours !== null && med.hours < 0
                        ? 'Prazo vencido'
                        : 'Prazo curto'}
                    <span className="hidden tabular-nums sm:inline lg:hidden 2xl:inline">· {med.amountLabel}</span>
                  </p>
                </div>
                <span className="hidden sm:inline-flex">
                  <BullsPrazoChip hours={med.hours} />
                </span>
                <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-bulls-line-strong bg-card px-3 text-[12.5px] font-semibold text-bulls-brand-strong transition-colors group-hover/row:bg-bulls-brand-soft group-hover/row:text-bulls-brand-deep">
                  {med.blocked ? 'Completar' : 'Abrir'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

/* ─── Página ───────────────────────────────────────────────── */

export function BullsHome({ accountName, data }: { accountName: string; data: BullsHomeData }) {
  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
        <div>
          <p className="text-[13px] font-semibold text-bulls-brand-strong">{accountName}</p>
          <h1 data-bulls-title className="mt-1">
            Visão geral
          </h1>
          <p className="mt-1.5 text-[14px] text-bulls-ink-3">O que entrou, o que vence e o que já pode ser defendido.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/meds/import"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-bulls-line-strong bg-card px-4 text-[13.5px] font-semibold text-bulls-ink-2 shadow-bulls transition-colors hover:bg-bulls-brand-wash hover:text-foreground"
          >
            <FileUp className="size-4" aria-hidden="true" />
            Importar MEDs
          </Link>
          <Link
            href="/meds/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-bulls-brand-deep to-bulls-brand px-4 text-[13.5px] font-semibold text-bulls-on-brand shadow-bulls-brand transition-[filter] hover:brightness-105"
          >
            <Plus className="size-4" aria-hidden="true" />
            Novo MED
          </Link>
        </div>
      </header>

      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <HeroTile data={data} />
        <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:row-span-2 lg:gap-5">
          <StatTile
            label="Em aberto"
            value={String(data.open)}
            detail={<span className="font-semibold text-foreground tabular-nums">{data.openAmountLabel}</span>}
            icon={<Inbox className="size-5" aria-hidden="true" />}
            tone="brand"
            href="/meds"
          />
          <StatTile
            label="Vencendo em 72h"
            value={String(data.dueSoon)}
            detail={
              data.urgent > 0
                ? `${data.urgent} ${data.urgent === 1 ? 'vence' : 'vencem'} em menos de 24 h`
                : 'Nenhum vence nas próximas 24 h'
            }
            icon={<AlarmClock className="size-5" aria-hidden="true" />}
            tone="warning"
            href="/meds?view=vencendo"
          />
          <StatTile
            label="Sem evidência"
            value={String(data.blocked)}
            detail="Faltam provas para defender"
            icon={<FileWarning className="size-5" aria-hidden="true" />}
            tone="error"
            href="/meds?view=bloqueados"
          />
          <StatTile
            label="Enviados"
            value={data.submitted.toLocaleString('pt-BR')}
            detail="Defesas já enviadas"
            icon={<Send className="size-5" aria-hidden="true" />}
            tone="success"
            href="/meds?view=enviados"
          />
        </div>
        <IntakeChartTile data={data} />
        <NeedsYouTile data={data} />
      </motion.div>

      <div className="mt-4 lg:mt-5">
        <BullsQueueCard
          items={data.queue}
          title="Fila de contestações"
          subtitle="Os casos em aberto que vencem primeiro"
          footerHref={data.open > data.queue.length ? '/meds' : undefined}
          footerLabel={`Ver os ${data.open} em aberto`}
        />
      </div>
    </div>
  );
}
