'use client';

/*
 * Indicadores. Base: 21st.dev #4157 "Stats Widget" — cartão com número grande,
 * variação e linha de tendência desenhada por stroke-dashoffset. Adaptado: sem
 * dado aleatório nem atualização falsa; a única série histórica que existe é a
 * entrada diária, então só o cartão "Em aberto" carrega linha de tendência. Os
 * demais mostram a fatia que representam das contestações em aberto.
 */

import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlarmClock, ArrowDownRight, ArrowUpRight, CircleCheck, FileWarning, Inbox, Send } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO, brl } from '@/components/previews/marketplace/fixtures';

const W = 160;
const H = 48;

function smoothPath(points: number[]): string {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);
  const xy = points.map((p, i) => [i * step, H - ((p - min) / span) * (H * 0.78) - H * 0.11] as const);
  const first = xy[0];
  if (!first) return '';
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const a = xy[i];
    const b = xy[i + 1];
    if (!a || !b) continue;
    const [x1, y1] = a;
    const [x2, y2] = b;
    const mx = (x1 + x2) / 2;
    d += ` C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  return d;
}

function Sparkline({ points }: { points: number[] }) {
  const reduced = useReducedMotion();
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const line = useMemo(() => smoothPath(points), [points]);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  useEffect(() => {
    const path = lineRef.current;
    const fill = areaRef.current;
    if (!path || !fill || reduced) return;
    const length = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = `${length} ${length}`;
    path.style.strokeDashoffset = `${length}`;
    fill.style.transition = 'none';
    fill.style.opacity = '0';
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.23,1,0.32,1)';
    path.style.strokeDashoffset = '0';
    fill.style.transition = 'opacity 0.9s ease 0.3s';
    fill.style.opacity = '1';
  }, [line, reduced]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-12 w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="nc-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nc-coral)" stopOpacity={0.32} />
          <stop offset="100%" stopColor="var(--nc-coral)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path ref={areaRef} d={area} fill="url(#nc-spark)" />
      <path
        ref={lineRef}
        d={line}
        fill="none"
        stroke="var(--nc-coral)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ShareBar({ value, total, tone }: { value: number; total: number; tone: string }) {
  const reduced = useReducedMotion();
  const pct = (value / total) * 100;
  return (
    <div className="mt-auto space-y-2 pt-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-(--nc-surface-3)">
        <motion.div
          className={cn('h-full rounded-full', tone)}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        />
      </div>
      <p className="text-xs text-(--nc-text-3)">
        <span className="font-mono text-(--nc-text-2) tabular-nums">
          {pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
        </span>{' '}
        das contestações em aberto
      </p>
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'group relative flex min-h-[168px] flex-col overflow-hidden rounded-(--radius) border border-(--nc-line) bg-(--nc-surface) p-5 transition-colors hover:border-(--nc-surface-3)',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardHead({ icon: Icon, label, tone }: { icon: typeof Inbox; label: string; tone: string }) {
  return (
    <header className="flex items-center gap-2 text-[13px] text-(--nc-text-2)">
      <span className={cn('grid size-6 place-items-center rounded-md', tone)}>
        <Icon aria-hidden className="size-3.5" />
      </span>
      <h3 className="font-medium">{label}</h3>
    </header>
  );
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

export function KpiCards() {
  const serie = RESUMO.entradaDiaria;
  const anterior = serie.slice(0, 7).reduce((a, b) => a + b, 0);
  const recente = serie.slice(7).reduce((a, b) => a + b, 0);
  const variacao = ((recente - anterior) / anterior) * 100;
  const subiu = variacao >= 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.55fr_1fr_1fr_1fr_1fr]">
      <Card className="sm:col-span-2 lg:col-span-1">
        <CardHead icon={Inbox} label="Em aberto" tone="bg-(--nc-coral)/12 text-(--nc-coral)" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{fmt(RESUMO.emAberto)}</p>
            <p className="mt-2 font-mono text-[13px] text-(--nc-text-2) tabular-nums">{brl(RESUMO.valorEmAberto)}</p>
          </div>
          <div className="w-[46%] max-w-[180px] shrink-0">
            <Sparkline points={serie} />
          </div>
        </div>
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-(--nc-text-3)">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono tabular-nums',
              subiu ? 'bg-(--nc-coral)/12 text-(--nc-coral)' : 'bg-(--nc-success)/12 text-(--nc-success)',
            )}
          >
            {subiu ? <ArrowUpRight aria-hidden className="size-3" /> : <ArrowDownRight aria-hidden className="size-3" />}
            {Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </span>
          entrada nos últimos 7 dias vs. 7 anteriores
        </p>
      </Card>

      <Card className="border-(--nc-warning)/25">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--nc-warning)/60 to-transparent" />
        <CardHead icon={AlarmClock} label="Vencendo em 24h" tone="bg-(--nc-warning)/12 text-(--nc-warning)" />
        <p className="mt-4 text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{fmt(RESUMO.vencendo24h)}</p>
        <ShareBar value={RESUMO.vencendo24h} total={RESUMO.emAberto} tone="bg-(--nc-warning)" />
      </Card>

      <Card>
        <CardHead icon={CircleCheck} label="Prontos para envio" tone="bg-(--nc-success)/12 text-(--nc-success)" />
        <p className="mt-4 text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{fmt(RESUMO.prontos)}</p>
        <ShareBar value={RESUMO.prontos} total={RESUMO.emAberto} tone="bg-(--nc-success)" />
      </Card>

      <Card>
        <CardHead icon={FileWarning} label="Sem evidência" tone="bg-(--nc-error)/12 text-(--nc-error)" />
        <p className="mt-4 text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{fmt(RESUMO.semEvidencia)}</p>
        <ShareBar value={RESUMO.semEvidencia} total={RESUMO.emAberto} tone="bg-(--nc-error)" />
      </Card>

      <Card>
        <CardHead icon={Send} label="Enviados no mês" tone="bg-(--nc-sand)/12 text-(--nc-sand)" />
        <p className="mt-4 text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{fmt(RESUMO.enviadosMes)}</p>
        <p className="mt-auto pt-4 text-xs text-(--nc-text-3)">Acumulado do mês corrente</p>
      </Card>
    </div>
  );
}
