'use client';

import { motion } from 'motion/react';
import {
  AlarmClockIcon,
  CircleCheckIcon,
  FileWarningIcon,
  InboxIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import { RESUMO, brl } from '@/components/previews/marketplace/fixtures';
import { cn } from '@/lib/cn';

type Tom = 'brand' | 'warning' | 'success' | 'error' | 'neutral';

const TOM: Record<Tom, { chip: string; bar: string }> = {
  brand: { chip: 'bg-accent text-primary', bar: 'bg-primary' },
  warning: { chip: 'bg-(--o1-warning-bg) text-(--o1-warning)', bar: 'bg-(--o1-warning)' },
  success: { chip: 'bg-(--o1-success-bg) text-(--o1-success)', bar: 'bg-(--o1-success)' },
  error: { chip: 'bg-(--o1-error-bg) text-(--o1-error)', bar: 'bg-(--o1-error)' },
  neutral: { chip: 'bg-secondary text-(--o1-ink-2)', bar: 'bg-(--o1-ink-3)' },
};

/** Fração do em aberto, só para dar escala ao número. */
function parcela(n: number): number {
  return n / RESUMO.emAberto;
}

function pct(fr: number): string {
  return fr.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type Kpi = {
  label: string;
  valor: string;
  icon: LucideIcon;
  tom: Tom;
  nota: string;
  fracao?: number;
};

const KPIS: Kpi[] = [
  {
    label: 'Em aberto',
    valor: RESUMO.emAberto.toLocaleString('pt-BR'),
    icon: InboxIcon,
    tom: 'brand',
    nota: `${brl(RESUMO.valorEmAberto)} em disputa`,
  },
  {
    label: 'Vencendo em 24h',
    valor: RESUMO.vencendo24h.toLocaleString('pt-BR'),
    icon: AlarmClockIcon,
    tom: 'warning',
    nota: `${pct(parcela(RESUMO.vencendo24h))} do em aberto`,
    fracao: parcela(RESUMO.vencendo24h),
  },
  {
    label: 'Prontos para envio',
    valor: RESUMO.prontos.toLocaleString('pt-BR'),
    icon: CircleCheckIcon,
    tom: 'brand',
    nota: `${pct(parcela(RESUMO.prontos))} do em aberto`,
    fracao: parcela(RESUMO.prontos),
  },
  {
    label: 'Sem evidência',
    valor: RESUMO.semEvidencia.toLocaleString('pt-BR'),
    icon: FileWarningIcon,
    tom: 'error',
    nota: `${pct(parcela(RESUMO.semEvidencia))} do em aberto`,
    fracao: parcela(RESUMO.semEvidencia),
  },
  {
    label: 'Enviados no mês',
    valor: RESUMO.enviadosMes.toLocaleString('pt-BR'),
    icon: SendIcon,
    tom: 'success',
    nota: 'Defesas enviadas no mês corrente',
  },
];

export function KpiStrip() {
  return (
    <section
      aria-label="Indicadores"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border bg-border shadow-(--o1-shadow) lg:grid-cols-5"
    >
      {KPIS.map((kpi, i) => {
        const tom = TOM[kpi.tom];
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'flex min-w-0 flex-col gap-3 bg-card p-4 sm:p-5',
              i === 0 && 'col-span-2 lg:col-span-1',
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('flex size-7 items-center justify-center rounded-lg', tom.chip)}>
                <kpi.icon className="size-[15px]" />
              </span>
              <span className="truncate text-[13px] font-medium text-(--o1-ink-2)">{kpi.label}</span>
            </div>
            <div className="text-[30px] leading-none font-semibold tracking-[-0.025em] text-foreground tabular-nums">
              {kpi.valor}
            </div>
            <div className="mt-auto flex flex-col gap-2">
              {kpi.fracao !== undefined ? (
                <div className="h-1 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className={cn('h-full rounded-full', tom.bar)} style={{ width: `${kpi.fracao * 100}%` }} />
                </div>
              ) : null}
              <p className="truncate text-[12.5px] text-(--o1-ink-3)">{kpi.nota}</p>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
