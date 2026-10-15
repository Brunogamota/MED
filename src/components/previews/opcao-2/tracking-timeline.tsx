'use client';

/**
 * Linha do tempo do pedido (21st.dev #7710 "Order History"), adaptada:
 * framer-motion -> motion/react, `@/lib/utils` -> `@/lib/cn`, cores da opção.
 * Mostra só as etapas recebidas; uma etapa sem data mostra o texto que veio,
 * nunca uma data presumida.
 */

import { motion, type Variants } from 'motion/react';
import { Check, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TimelineItem {
  id: string | number;
  title: string;
  date: string;
  status: 'completed' | 'in-progress' | 'pending';
}

/** "02/10/2026 20:50" -> "2026-10-02T20:50". Sem padrão reconhecido, sem atributo. */
export function toIsoDateTime(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}(?::\d{2})?)$/.exec(value);
  if (!match) return undefined;
  const [, dd, mm, yyyy, hora] = match;
  return `${yyyy}-${mm}-${dd}T${hora}`;
}

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const row: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
};

function StatusIcon({ status }: { status: TimelineItem['status'] }) {
  if (status === 'completed') return <Check className="size-4 text-white" strokeWidth={2.5} aria-hidden="true" />;
  if (status === 'in-progress') return <CircleDot className="size-4 text-[var(--o2-brand-strong)]" aria-hidden="true" />;
  return <Circle className="size-4 text-[var(--o2-ink-4)]" aria-hidden="true" />;
}

const STATUS_SR: Record<TimelineItem['status'], string> = {
  completed: 'concluída',
  'in-progress': 'em andamento',
  pending: 'pendente',
};

export function TrackingTimeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <motion.ol
      className={cn('relative ml-4 border-l-2 border-[var(--o2-line)]', className)}
      initial="hidden"
      animate="visible"
      variants={list}
    >
      {items.map((item, index) => {
        const iso = toIsoDateTime(item.date);
        const last = index === items.length - 1;
        return (
          <motion.li
            key={item.id}
            variants={row}
            className={cn('relative ml-8 print:opacity-100', last ? 'mb-0' : 'mb-7')}
            aria-current={item.status === 'in-progress' ? 'step' : undefined}
          >
            <span
              className={cn(
                'absolute top-0 -left-[49px] flex size-8 items-center justify-center rounded-full ring-[6px] ring-card',
                item.status === 'completed' && 'bg-[var(--o2-brand-strong)]',
                item.status === 'in-progress' && 'bg-[var(--o2-brand-soft)]',
                item.status === 'pending' && 'bg-[var(--o2-neutral-soft)]',
              )}
            >
              {item.status === 'in-progress' && (
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--o2-lilac)] opacity-50 motion-reduce:hidden print:hidden" />
              )}
              <StatusIcon status={item.status} />
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <h3
                className={cn(
                  'text-[14.5px] font-semibold',
                  item.status === 'pending' ? 'text-[var(--o2-ink-3)]' : 'text-foreground',
                )}
              >
                {item.title}
                <span className="sr-only"> — etapa {STATUS_SR[item.status]}</span>
              </h3>
              {iso ? (
                <time dateTime={iso} className="text-[13px] text-[var(--o2-ink-3)] tabular-nums">
                  {item.date}
                </time>
              ) : (
                <span
                  className={cn(
                    'text-[13px]',
                    item.status === 'in-progress' ? 'font-semibold text-[var(--o2-brand-strong)]' : 'text-[var(--o2-ink-3)]',
                  )}
                >
                  {item.date}
                </span>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
