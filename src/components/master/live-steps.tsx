'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { CompanyAvatar } from './parts';

/**
 * Lista ao vivo do que está rodando, uma linha por empresa (a partir do
 * "Task Steps", 21st.dev 23569): pendente, rodando (com o rótulo brilhando),
 * feito e com erro, e o número de cada uma à direita.
 */

export type LiveStatus = 'pending' | 'active' | 'done' | 'error';

export interface LiveRow {
  id: string;
  name: string;
  color: string;
  status: LiveStatus;
  /** "12 de 40" enquanto roda; o resultado quando termina. */
  meta: string;
  /** 0–1, para a barrinha da empresa. */
  progress: number;
}

const POP = { type: 'spring', stiffness: 640, damping: 22, mass: 0.7 } as const;

function Icon({ status, reduced }: { status: LiveStatus; reduced: boolean }) {
  return (
    <span className="relative grid size-5 shrink-0 place-items-center">
      <AnimatePresence initial={false}>
        {status === 'done' ? (
          <motion.span
            key="done"
            className="col-start-1 row-start-1 grid size-5 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={POP}
          >
            <svg viewBox="0 0 256 256" width="12" height="12" fill="none" aria-hidden="true">
              <polyline points="216 72 104 184 48 128" stroke="currentColor" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        ) : status === 'error' ? (
          <motion.span
            key="error"
            className="col-start-1 row-start-1 grid size-5 place-items-center rounded-md bg-destructive/12 text-destructive"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={POP}
          >
            <svg viewBox="0 0 256 256" width="11" height="11" fill="none" aria-hidden="true">
              <path d="M200 56 56 200 M56 56l144 144" stroke="currentColor" strokeWidth="26" strokeLinecap="round" />
            </svg>
          </motion.span>
        ) : status === 'active' ? (
          <motion.svg
            key="active"
            viewBox="0 0 16 16"
            className="col-start-1 row-start-1 size-4 text-primary"
            aria-hidden="true"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
          >
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <path d="M8 2 a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </motion.svg>
        ) : (
          <motion.span key="pending" className="col-start-1 row-start-1 size-1.5 rounded-full bg-muted-foreground/40" />
        )}
      </AnimatePresence>
    </span>
  );
}

export function LiveSteps({ rows, label }: { rows: LiveRow[]; label: string }) {
  const reduced = useReducedMotion() === true;
  return (
    <ol aria-label={label} className="divide-y rounded-xl border bg-card">
      {rows.map((row) => (
        <li
          key={row.id}
          aria-current={row.status === 'active' ? 'step' : undefined}
          className="flex items-center gap-3 px-4 py-3"
        >
          <Icon status={row.status} reduced={reduced} />
          <CompanyAvatar name={row.name} color={row.color} size="sm" />
          <span className="min-w-0 flex-1">
            {row.status === 'active' && !reduced ? (
              <motion.span
                className="block truncate bg-[linear-gradient(90deg,var(--color-muted-foreground)_38%,var(--color-foreground)_50%,var(--color-muted-foreground)_62%)] bg-clip-text text-[13.5px] font-medium text-transparent [background-size:220%_100%]"
                animate={{ backgroundPosition: ['120% 0', '-120% 0'] }}
                transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
              >
                {row.name}
              </motion.span>
            ) : (
              <span
                className={cn(
                  'block truncate text-[13.5px]',
                  row.status === 'pending' ? 'text-muted-foreground' : 'font-medium text-foreground',
                  row.status === 'error' && 'text-destructive',
                )}
              >
                {row.name}
              </span>
            )}
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <motion.span
                className={cn('block h-full rounded-full', row.status === 'error' ? 'bg-destructive' : 'bg-primary')}
                initial={false}
                animate={{ width: `${Math.round(row.progress * 100)}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
              />
            </span>
          </span>
          <span className="shrink-0 text-right font-mono text-[12px] text-muted-foreground tabular-nums">{row.meta}</span>
        </li>
      ))}
    </ol>
  );
}
