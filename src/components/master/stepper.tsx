'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Trilho das etapas da Central Master (a partir do "Animated Progress
 * Stepper", 21st.dev 28558): linha que avança com mola, ponto que viaja até a
 * etapa atual, anel pulsando nela e o ícone virando check quando a etapa
 * termina. Cada etapa é clicável — a ordem é sugestão, não trava.
 */

export interface MasterStep {
  title: string;
  description: string;
  icon: LucideIcon;
  done: boolean;
}

export function MasterStepper({
  steps,
  active,
  onSelect,
}: {
  steps: MasterStep[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const progress = steps.length > 1 ? active / (steps.length - 1) : 0;
  const insetPct = 50 / steps.length;
  const inset = `${insetPct}%`;
  const dot = insetPct + (100 - 2 * insetPct) * progress;

  return (
    <nav aria-label="Etapas" className="relative">
      <div className="absolute top-5 h-0.5 bg-border" style={{ left: inset, right: inset }} />
      <motion.div
        className="absolute top-5 h-0.5 origin-left bg-primary"
        style={{ left: inset, right: inset }}
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute size-2 rounded-full bg-primary"
        style={{ top: 21, x: '-50%', y: '-50%' }}
        initial={false}
        animate={{ left: `${dot}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 24 }}
      />
      <ol className="relative flex items-start justify-between">
        {steps.map((step, index) => {
          const isActive = index === active;
          const filled = isActive || step.done;
          return (
            <li key={step.title} className="flex flex-1 flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Etapa ${index + 1}: ${step.title}${step.done ? ' (feita)' : ''}`}
                className="group relative z-10 flex size-10 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'absolute inset-0 rounded-full transition-colors duration-300',
                    filled ? 'bg-primary' : 'border bg-card group-hover:bg-muted',
                  )}
                />
                {isActive && !reduced ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                    animate={{ scale: [1, 1.45, 1], opacity: [1, 0.15, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : null}
                <AnimatePresence mode="wait" initial={false}>
                  {step.done && !isActive ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="relative text-primary-foreground"
                    >
                      <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="relative"
                    >
                      <step.icon
                        className={cn('size-[18px]', filled ? 'text-primary-foreground' : 'text-muted-foreground')}
                        aria-hidden="true"
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <span className="px-1">
                <span className={cn('block text-[13px] font-semibold', filled ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.title}
                </span>
                <span className="hidden text-[12px] text-muted-foreground sm:block">{step.description}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
