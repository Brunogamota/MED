'use client';

/**
 * Bento do painel (21st.dev #30742 "Financial Bento Grid"), adaptado:
 * - sem fotos de equipe e sem logos de parceiros;
 * - blocos trocados pelos números do RESUMO e pela lista do que precisa de ação;
 * - gráfico de área do original, agora com RESUMO.entradaDiaria.
 * Todo número sai de fixtures; os derivados (total, média, variação) são
 * contas sobre esses mesmos números.
 */

import * as React from 'react';
import { motion, type Variants } from 'motion/react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  FileWarning,
  Inbox,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import { MEDS, RESUMO, STATUS_LABEL, brl, prazo } from '@/components/previews/fixtures';
import { PersonAvatar, prazoTone } from './parts';

const tileBase =
  'relative overflow-hidden rounded-[24px] border border-[var(--o2-line)] bg-card shadow-[var(--o2-shadow)] transition-shadow duration-300 hover:shadow-[var(--o2-shadow-hover)]';

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
};

const pct = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 });

/* ─── Herói: prontos para envio ────────────────────────────── */

function HeroTile() {
  const share = RESUMO.prontos / RESUMO.emAberto;
  return (
    <motion.section
      variants={item}
      aria-labelledby="o2-hero-title"
      className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--o2-brand-deep)] via-[var(--o2-brand-strong)] to-[var(--o2-brand)] p-6 text-white shadow-[0_24px_56px_-24px_rgba(124,58,237,0.65)] sm:p-8 lg:col-span-5 lg:row-span-2"
    >
      {/* Ornamento: anéis concêntricos, sem dado nenhum. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -top-24 -right-24 size-[380px] opacity-[0.18]"
      >
        {[60, 100, 140, 180].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="white" strokeWidth="1.2" />
        ))}
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 size-[320px] rounded-full bg-[var(--o2-lilac)] opacity-30 blur-3xl"
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-white/25 backdrop-blur">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {STATUS_LABEL.PRONTO}
        </span>
      </div>

      <div className="relative mt-8">
        <h2 id="o2-hero-title" className="sr-only">
          Prontos para envio
        </h2>
        <p className="text-[76px] leading-[0.9] font-bold tracking-[-0.04em] tabular-nums sm:text-[96px]">
          {RESUMO.prontos}
        </p>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-white/85">
          MEDs com evidência reunida, prontos para virar defesa e seguir para o banco.
        </p>
      </div>

      <div className="relative mt-8 space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-white/80">
            <span>Da fila em aberto</span>
            <span className="font-semibold text-white tabular-nums">
              {RESUMO.prontos} de {RESUMO.emAberto} · {pct(share)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${share * 100}%` }}
              transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="h-11 rounded-full border-white bg-white px-5 text-[14px] font-semibold text-[var(--o2-brand-deep)] shadow-[0_8px_20px_-8px_rgba(27,16,48,0.45)] hover:bg-white/90">
            <Sparkles className="size-4" aria-hidden="true" />
            Gerar defesas
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-full px-4 text-[14px] font-semibold text-white hover:bg-white/15 hover:text-white"
          >
            Ver lista
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Indicadores ──────────────────────────────────────────── */

type Tone = 'brand' | 'warning' | 'error' | 'success';

const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-[var(--o2-brand-soft)] text-[var(--o2-brand-strong)]',
  warning: 'bg-[var(--o2-warning-soft)] text-[var(--o2-warning-ink)]',
  error: 'bg-[var(--o2-error-soft)] text-[var(--o2-error-ink)]',
  success: 'bg-[var(--o2-success-soft)] text-[var(--o2-success-ink)]',
};

function StatTile({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
}) {
  return (
    <motion.article variants={item} className={cn(tileBase, 'group flex flex-col justify-between gap-6 p-5 sm:p-6')}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-2xl', TONE_CHIP[tone])}>{icon}</span>
        <button
          type="button"
          aria-label={`Abrir ${label.toLowerCase()}`}
          className="flex size-8 items-center justify-center rounded-full text-[var(--o2-ink-4)] outline-none transition-colors group-hover:bg-[var(--o2-brand-wash)] group-hover:text-[var(--o2-brand-strong)] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div>
        <h3 className="text-[13.5px] font-medium text-[var(--o2-ink-3)]">{label}</h3>
        <p className="mt-1 text-[34px] leading-none font-bold tracking-[-0.03em] text-foreground tabular-nums sm:text-[40px]">
          {value}
        </p>
        <p className="mt-2.5 text-[13px] text-[var(--o2-ink-2)]">{detail}</p>
      </div>
    </motion.article>
  );
}

/* ─── Gráfico de entrada ───────────────────────────────────── */

const DIAS = RESUMO.entradaDiaria.length;

const CHART_DATA = RESUMO.entradaDiaria.map((entradas, index) => {
  const atras = DIAS - 1 - index;
  return {
    dia: atras === 0 ? 'Hoje' : atras === 1 ? 'Ontem' : `-${atras}d`,
    rotulo: atras === 0 ? 'Hoje' : atras === 1 ? 'Ontem' : `Há ${atras} dias`,
    entradas,
  };
});

const ROTULO: Record<string, string> = Object.fromEntries(CHART_DATA.map((d) => [d.dia, d.rotulo]));

const chartConfig = {
  entradas: { label: 'MEDs recebidos', color: 'var(--o2-brand)' },
} satisfies ChartConfig;

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
const TOTAL = sum(RESUMO.entradaDiaria);
const ULTIMOS_7 = sum(RESUMO.entradaDiaria.slice(-7));
const ANTERIORES_7 = sum(RESUMO.entradaDiaria.slice(-14, -7));
const VARIACAO = ANTERIORES_7 > 0 ? (ULTIMOS_7 - ANTERIORES_7) / ANTERIORES_7 : 0;
const MEDIA = TOTAL / DIAS;

function IntakeChartTile() {
  const gradientId = React.useId().replace(/:/g, '');
  const subiu = VARIACAO >= 0;
  return (
    <motion.section variants={item} aria-labelledby="o2-chart-title" className={cn(tileBase, 'flex flex-col p-5 sm:p-6 lg:col-span-7')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="o2-chart-title" className="text-[16px] font-semibold tracking-tight text-foreground">
            Entrada de MEDs — 14 dias
          </h2>
          <p className="mt-1 text-[13px] text-[var(--o2-ink-3)]">Contestações recebidas por dia</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums">{TOTAL}</p>
            <p className="mt-1 text-[12px] text-[var(--o2-ink-3)]">
              média {MEDIA.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums',
              subiu ? 'bg-[var(--o2-warning-soft)] text-[var(--o2-warning-ink)]' : 'bg-[var(--o2-success-soft)] text-[var(--o2-success-ink)]',
            )}
            title="Últimos 7 dias contra os 7 anteriores"
          >
            {subiu ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
            {subiu ? '+' : ''}
            {pct(VARIACAO)}
            <span className="sr-only"> nos últimos 7 dias contra os 7 anteriores</span>
          </span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[220px] w-full sm:h-[240px]">
        <AreaChart accessibilityLayer data={CHART_DATA} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-entradas)" stopOpacity={0.32} />
              <stop offset="65%" stopColor="var(--color-entradas)" stopOpacity={0.06} />
              <stop offset="100%" stopColor="var(--color-entradas)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="var(--o2-line)" />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            minTickGap={18}
            tick={{ fill: 'var(--o2-ink-3)', fontSize: 11 }}
          />
          <YAxis
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={28}
            tickMargin={6}
            allowDecimals={false}
            tick={{ fill: 'var(--o2-ink-4)', fontSize: 11 }}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--o2-lilac)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={
              <ChartTooltipContent
                indicator="line"
                className="rounded-2xl border-[var(--o2-line)] bg-card px-3 py-2 shadow-[var(--o2-shadow-hover)]"
                labelFormatter={(label) => ROTULO[String(label)] ?? String(label)}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="entradas"
            stroke="var(--color-entradas)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--card)', fill: 'var(--o2-brand-strong)' }}
          />
        </AreaChart>
      </ChartContainer>
    </motion.section>
  );
}

/* ─── Precisam de você ─────────────────────────────────────── */

const PENDENTES = MEDS.filter(
  (med) => med.status === 'SEM_ENVIO' || (med.prazoHoras < 24 && med.status !== 'ENVIADO'),
).sort((a, b) => a.prazoHoras - b.prazoHoras);

function NeedsYouTile() {
  return (
    <motion.section variants={item} aria-labelledby="o2-needs-title" className={cn(tileBase, 'flex flex-col p-5 sm:p-6 lg:col-span-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="o2-needs-title" className="text-[16px] font-semibold tracking-tight text-foreground">
            Precisam de você
          </h2>
          <p className="mt-1 text-[13px] text-[var(--o2-ink-3)]">Prazo curto ou sem registro de envio</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold text-[var(--o2-brand-strong)] hover:bg-[var(--o2-brand-wash)] hover:text-[var(--o2-brand-deep)]"
        >
          Ver todos
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {PENDENTES.map((med) => {
          const semEnvio = med.status === 'SEM_ENVIO';
          return (
            <li
              key={med.id}
              className="group/row flex items-center gap-3 rounded-[18px] border border-[var(--o2-line)] bg-[var(--o2-bg-2)] p-3 transition-colors hover:border-[var(--o2-line-strong)] hover:bg-[var(--o2-brand-wash)]"
            >
              <PersonAvatar name={med.pagador} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">{med.pagador}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-[var(--o2-ink-3)]">
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 shrink-0 rounded-full', semEnvio ? 'bg-[var(--o2-error)]' : 'bg-[var(--o2-warning)]')}
                  />
                  {semEnvio ? STATUS_LABEL.SEM_ENVIO : `Vence em ${prazo(med.prazoHoras)}`}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{brl(med.valor)}</span>
                </p>
              </div>
              <span className={cn('hidden shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums sm:inline-flex', prazoTone(med.prazoHoras))}>
                {prazo(med.prazoHoras)}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`${semEnvio ? 'Registrar envio' : 'Gerar defesa'} — ${med.pagador}`}
                className="h-8 shrink-0 rounded-full border-[var(--o2-line-strong)] bg-card px-3 text-[12.5px] font-semibold text-[var(--o2-brand-strong)] hover:bg-[var(--o2-brand-soft)] hover:text-[var(--o2-brand-deep)]"
              >
                {semEnvio ? 'Registrar envio' : 'Gerar defesa'}
              </Button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

/* ─── Grade ────────────────────────────────────────────────── */

export function BentoOverview() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5"
    >
      <HeroTile />
      <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:row-span-2 lg:gap-5">
        <StatTile
          label="Em aberto"
          value={String(RESUMO.emAberto)}
          detail={<span className="font-semibold tabular-nums text-foreground">{brl(RESUMO.valorEmAberto)}</span>}
          icon={<Inbox className="size-5" aria-hidden="true" />}
          tone="brand"
        />
        <StatTile
          label="Vencendo em 24h"
          value={String(RESUMO.vencendo24h)}
          detail="Responder antes do prazo"
          icon={<AlarmClock className="size-5" aria-hidden="true" />}
          tone="warning"
        />
        <StatTile
          label="Sem evidência"
          value={String(RESUMO.semEvidencia)}
          detail="Faltam provas para defender"
          icon={<FileWarning className="size-5" aria-hidden="true" />}
          tone="error"
        />
        <StatTile
          label="Enviados no mês"
          value={RESUMO.enviadosMes.toLocaleString('pt-BR')}
          detail="Defesas já enviadas"
          icon={<Send className="size-5" aria-hidden="true" />}
          tone="success"
        />
      </div>
      <IntakeChartTile />
      <NeedsYouTile />
    </motion.div>
  );
}
