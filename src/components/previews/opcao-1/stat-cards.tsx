'use client';

/**
 * Indicadores — adaptado de 21st.dev #4157 "Stats Widget".
 *
 * Do original ficam o cartão com valor grande, o selo de variação e a linha
 * de tendência que se desenha ao entrar. O que sai: os dados aleatórios e a
 * troca automática a cada 3s. Toda série e todo percentual aqui são calculados
 * a partir de `RESUMO`; nada é sorteado.
 */

import { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { AlarmClock, ArrowDown, ArrowUp, FileSearch, Send, ShieldAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO, brl } from '@/components/previews/fixtures';

type Tone = 'brand' | 'warning' | 'success' | 'error';

const TONE: Record<Tone, { text: string; bg: string; stroke: string }> = {
  brand: { text: 'text-(--o1-lilac)', bg: 'bg-primary/12', stroke: '#A855F7' },
  warning: { text: 'text-(--o1-warning)', bg: 'bg-(--o1-warning)/12', stroke: '#F59E0B' },
  success: { text: 'text-(--o1-success)', bg: 'bg-(--o1-success)/12', stroke: '#10B981' },
  error: { text: 'text-(--o1-error)', bg: 'bg-(--o1-error)/12', stroke: '#EF4444' },
};

/** Curva suave pelos pontos — a mesma interpolação cúbica do componente original. */
function smoothPath(points: number[], width: number, height: number): string {
  if (points.length < 2) return `M 0 ${height}`;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const xy = points.map((p, i) => [i * step, height - ((p - min) / span) * height * 0.78 - height * 0.11] as const);
  let d = '';
  let prev: readonly [number, number] | null = null;
  for (const [x2, y2] of xy) {
    if (!prev) {
      d = `M ${x2} ${y2}`;
    } else {
      const [x1, y1] = prev;
      const mx = (x1 + x2) / 2;
      d += ` C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    }
    prev = [x2, y2];
  }
  return d;
}

function Sparkline({ points, stroke, label }: { points: number[]; stroke: string; label: string }) {
  const id = useId().replace(/:/g, '');
  const w = 150;
  const h = 56;
  const line = useMemo(() => smoothPath(points, w, h), [points]);
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`o1-spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#o1-spark-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

/** Régua de 32 traços: a fatia do total em aberto, preenchida em sequência. */
function ShareMeter({ share, tone, label }: { share: number; tone: Tone; label: string }) {
  const total = 32;
  const filled = Math.max(1, Math.round(share * total));
  return (
    <div className="flex h-14 flex-col justify-end gap-2">
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} className="flex h-6 items-end gap-[3px]">
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className={cn('h-full flex-1 origin-bottom rounded-[1.5px]', i < filled ? '' : 'bg-white/[0.07]')}
            style={i < filled ? { backgroundColor: TONE[tone].stroke } : undefined}
            initial={{ scaleY: 0.25, opacity: 0 }}
            animate={{ scaleY: 1, opacity: i < filled ? 1 : 0.9 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.018, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  chip,
  children,
  index,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
  chip?: { text: string; up: boolean };
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-white/[0.07] bg-card p-5 shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex size-7 items-center justify-center rounded-md', TONE[tone].bg)}>
            <Icon className={cn('size-3.5', TONE[tone].text)} strokeWidth={2} />
          </span>
          <h3 className="text-[13px] font-medium text-(--o1-text-2)">{label}</h3>
        </div>
        {chip && (
          <span
            title="Entrada dos últimos 7 dias contra os 7 anteriores"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
              chip.up ? 'bg-primary/12 text-(--o1-lilac)' : 'bg-(--o1-success)/12 text-(--o1-success)',
            )}
          >
            {chip.up ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
            <span className="font-mono tabular-nums">{chip.text}</span>
            <span className="opacity-70">entrada 7d</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-end gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[32px] leading-none font-medium tracking-[-0.03em] text-foreground tabular-nums">{value}</p>
          <p className="mt-2 truncate text-[12px] text-muted-foreground">{detail}</p>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

function percent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function StatCards() {
  const serie = RESUMO.entradaDiaria;
  const ultimos7 = serie.slice(-7).reduce((a, b) => a + b, 0);
  const anteriores7 = serie.slice(0, 7).reduce((a, b) => a + b, 0);
  const variacao = anteriores7 ? (ultimos7 - anteriores7) / anteriores7 : 0;
  const total = RESUMO.emAberto;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        index={0}
        label="Em aberto"
        value={String(total)}
        detail={`${brl(RESUMO.valorEmAberto)} em disputa`}
        icon={ShieldAlert}
        tone="brand"
        chip={{ text: percent(Math.abs(variacao)), up: variacao >= 0 }}
      >
        <Sparkline
          points={serie}
          stroke={TONE.brand.stroke}
          label={`Entrada diária nos últimos 14 dias; ${ultimos7} nos últimos 7, contra ${anteriores7} nos 7 anteriores`}
        />
      </StatCard>
      <StatCard index={1} label="Vencendo em 24h" value={String(RESUMO.vencendo24h)} detail={`${percent(RESUMO.vencendo24h / total)} dos em aberto`} icon={AlarmClock} tone="warning">
        <ShareMeter share={RESUMO.vencendo24h / total} tone="warning" label="Parcela dos em aberto que vence em 24h" />
      </StatCard>
      <StatCard index={2} label="Prontos para envio" value={String(RESUMO.prontos)} detail={`${percent(RESUMO.prontos / total)} dos em aberto`} icon={Send} tone="success">
        <ShareMeter share={RESUMO.prontos / total} tone="success" label="Parcela dos em aberto pronta para envio" />
      </StatCard>
      <StatCard index={3} label="Sem evidência" value={String(RESUMO.semEvidencia)} detail={`${percent(RESUMO.semEvidencia / total)} dos em aberto`} icon={FileSearch} tone="error">
        <ShareMeter share={RESUMO.semEvidencia / total} tone="error" label="Parcela dos em aberto sem evidência" />
      </StatCard>
    </div>
  );
}
