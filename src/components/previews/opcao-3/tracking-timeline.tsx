'use client';

import { motion, type Variants } from 'motion/react';
import { Check, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/cn';

/*
 * Base: 21st.dev 7710 "Order History" — linha do tempo de rastreio. Etapa
 * concluída leva o check; a etapa em andamento pulsa (e para de pulsar na
 * impressão). Nada aqui inventa etapa: só desenha as que recebe.
 */

export interface TimelineItem {
  titulo: string;
  data: string;
  status: 'completed' | 'in-progress' | 'pending';
}

const list: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const row: Variants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

function StatusIcon({ status }: { status: TimelineItem['status'] }) {
  if (status === 'completed') return <Check className="size-4 text-white" strokeWidth={3} />;
  if (status === 'in-progress') return <CircleDot className="size-4 text-(--op3-violet)" />;
  return <Circle className="size-4 text-(--op3-ink-3)/50" />;
}

export function Op3TrackingTimeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <motion.ol initial="hidden" animate="visible" variants={list} className={cn('relative', className)}>
      {items.map((step, index) => {
        const ultimo = index === items.length - 1;
        const proximo = items[index + 1];
        const trilhoCheio = step.status === 'completed' && proximo !== undefined && proximo.status !== 'pending';
        return (
          <motion.li
            key={`${step.titulo}-${index}`}
            variants={row}
            aria-current={step.status === 'in-progress' ? 'step' : undefined}
            className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-4"
          >
            {!ultimo ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-8 bottom-0 left-[15px] w-0.5 rounded-full',
                  trilhoCheio ? 'bg-(--op3-violet)' : 'bg-(--op3-line)',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 grid size-8 place-items-center rounded-full ring-4 ring-white',
                step.status === 'completed' && 'bg-(--op3-violet)',
                step.status === 'in-progress' && 'bg-(--op3-lilac-soft)',
                step.status === 'pending' && 'bg-muted',
              )}
            >
              {step.status === 'in-progress' ? (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-(--op3-lilac)/50 motion-reduce:animate-none print:hidden"
                />
              ) : null}
              <StatusIcon status={step.status} />
            </span>
            <div className={cn('min-w-0 pt-1', ultimo ? 'pb-0' : 'pb-7')}>
              <p
                className={cn(
                  'text-[15px] leading-snug font-semibold',
                  step.status === 'pending' ? 'text-(--op3-ink-3)' : 'text-foreground',
                )}
              >
                {step.titulo}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm tabular-nums',
                  step.status === 'in-progress' ? 'font-medium text-(--op3-violet)' : 'text-(--op3-ink-3)',
                )}
              >
                {step.data}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
