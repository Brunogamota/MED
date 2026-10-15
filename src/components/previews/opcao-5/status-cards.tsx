'use client';

import { motion } from 'motion/react';
import { CheckCircle2, FileWarning, Inbox, TimerReset, type LucideIcon } from 'lucide-react';
import { RESUMO, brl } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { GLASS, HEADING, MONO, TONE_BG, TONE_CHIP, TONE_TEXT, type Tone } from './theme';

interface Cartao {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: Tone;
  note: string;
  /** Participação na fila em aberto, quando faz sentido. */
  share?: number;
}

const pct = (n: number) => Math.round((n / RESUMO.emAberto) * 100);

const CARTOES: Cartao[] = [
  {
    label: 'Em aberto',
    value: RESUMO.emAberto,
    icon: Inbox,
    tone: 'brand',
    note: `${brl(RESUMO.valorEmAberto)} em disputa`,
  },
  {
    label: 'Vencendo 24h',
    value: RESUMO.vencendo24h,
    icon: TimerReset,
    tone: 'warning',
    note: 'Prazo de resposta abaixo de 24h',
    share: pct(RESUMO.vencendo24h),
  },
  {
    label: 'Prontos',
    value: RESUMO.prontos,
    icon: CheckCircle2,
    tone: 'success',
    note: 'Defesa pronta para envio',
    share: pct(RESUMO.prontos),
  },
  {
    label: 'Sem evidência',
    value: RESUMO.semEvidencia,
    icon: FileWarning,
    tone: 'error',
    note: 'Precisam de coleta antes da defesa',
    share: pct(RESUMO.semEvidencia),
  },
];

/**
 * Cartões de situação do Stocks Dashboard (21st.dev 29424): rótulo, ícone,
 * número grande e nota. Aqui cada um carrega o tom do que representa e a fatia
 * da fila em aberto.
 */
export function StatusCards() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARTOES.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.li
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={cn(GLASS, 'group relative overflow-hidden p-5')}
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-6 top-0 h-px opacity-70',
                'bg-linear-to-r from-transparent to-transparent',
                c.tone === 'brand' && 'via-(--o5-lilac)',
                c.tone === 'warning' && 'via-(--o5-warning)',
                c.tone === 'success' && 'via-(--o5-success)',
                c.tone === 'error' && 'via-(--o5-error)',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute -top-16 -right-16 size-40 rounded-full opacity-[0.10] blur-3xl transition-opacity duration-500 group-hover:opacity-20',
                TONE_BG[c.tone],
              )}
            />
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold text-(--o5-text-2)">{c.label}</p>
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl border',
                  TONE_CHIP[c.tone],
                )}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
            </div>
            <div className="relative mt-3 flex items-baseline gap-2.5">
              <span className={cn(HEADING, 'text-[34px] leading-none font-semibold text-foreground tabular-nums')}>
                {c.value}
              </span>
              {c.share !== undefined && (
                <span
                  className={cn(
                    MONO,
                    'rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                    TONE_CHIP[c.tone],
                  )}
                >
                  {c.share}% da fila
                </span>
              )}
            </div>
            <p className={cn('relative mt-2.5 text-xs', c.tone === 'brand' ? TONE_TEXT.neutral : 'text-muted-foreground')}>
              {c.note}
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}
