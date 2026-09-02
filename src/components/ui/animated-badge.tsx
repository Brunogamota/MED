'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Circle,
  Info,
  LoaderCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, type HTMLMotionProps, type Variants } from 'motion/react';

import { cn } from '@/lib/cn';

/**
 * Selo com troca animada de estado.
 *
 * O icone e o texto rolam de baixo para cima quando o status muda, de modo que
 * a transicao seja visivel numa tela que ja estava aberta — o operador percebe
 * que o caso andou sem precisar recarregar e comparar.
 *
 * Na primeira renderizacao nada anima (`initial={false}` no `AnimatePresence`):
 * abrir a fila com trinta linhas nao dispara trinta animacoes.
 *
 * Quem pediu menos movimento no sistema e atendido pelo `MotionProvider` da
 * raiz, que descarta as transformacoes e deixa so a opacidade. O componente
 * nao consulta a preferencia por conta propria: o servidor nao a conhece, e
 * ramificar a marcacao por ela quebraria a hidratacao.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Mola da troca de conteudo: rapida, com pouco excesso no fim. */
const SPRING_SWAP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const;

/** Mola da mudanca de largura quando o rotulo novo e mais longo que o antigo. */
const SPRING_LAYOUT = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const;

export type AnimatedBadgeStatus =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'loading';

export type AnimatedBadgeSize = 'sm' | 'md';

export interface AnimatedBadgeProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  status?: AnimatedBadgeStatus;
  size?: AnimatedBadgeSize;
  children?: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  pulse?: boolean;
  contentKey?: string | number;
}

// Mesma paleta dos outros selos do sistema (`TONE_SUBTLE` em `ui.tsx`):
// emerald e amber existem nos dois temas, o resto sai dos tokens. `loading`
// fica neutro de proposito — o primario deste tema e quase preto, e um selo
// preto sobre cinza leria como desabilitado; quem diz "em andamento" e o giro.
const STATUS_CLASS: Record<AnimatedBadgeStatus, string> = {
  neutral: 'border-transparent bg-secondary text-secondary-foreground',
  info: 'border-border text-foreground',
  success: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  danger: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
  loading: 'border-border bg-muted text-foreground',
};

const SIZE_CLASS: Record<AnimatedBadgeSize, string> = {
  sm: 'h-5 gap-1 px-2 text-[11px]',
  md: 'h-6 gap-1.5 px-2.5 text-xs',
};

const ICON_CLASS: Record<AnimatedBadgeSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
};

const ICONS: Record<AnimatedBadgeStatus, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: Check,
  warning: AlertTriangle,
  danger: X,
  loading: LoaderCircle,
};

const ICON_ROLL_VARIANTS: Variants = {
  initial: { opacity: 0.72, y: '80%', scale: 0.92, rotate: -8, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: '0%',
    scale: 1,
    rotate: 0,
    filter: 'blur(0px)',
    transition: {
      y: SPRING_SWAP,
      scale: SPRING_SWAP,
      rotate: { duration: 0.28, ease: EASE_OUT },
      opacity: { duration: 0.28, ease: EASE_OUT },
      filter: { duration: 0.42, ease: EASE_OUT },
    },
  },
  exit: {
    opacity: 0.5,
    y: '-80%',
    scale: 0.96,
    rotate: 8,
    filter: 'blur(6px)',
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

const TEXT_ROLL_VARIANTS: Variants = {
  initial: { opacity: 0.76, y: '85%', filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: '0%',
    filter: 'blur(0px)',
    transition: {
      y: SPRING_SWAP,
      opacity: { duration: 0.3, ease: EASE_OUT },
      filter: { duration: 0.42, ease: EASE_OUT },
    },
  },
  exit: {
    opacity: 0.5,
    y: '-85%',
    filter: 'blur(6px)',
    transition: { duration: 0.2, ease: EASE_OUT },
  },
};

export function AnimatedBadge({
  status = 'neutral',
  size = 'md',
  children,
  icon,
  showIcon = true,
  pulse = status === 'loading',
  contentKey,
  className,
  ...rest
}: AnimatedBadgeProps) {
  const Icon = ICONS[status];

  const resolvedContentKey =
    contentKey ??
    (typeof children === 'string' || typeof children === 'number' ? children : status);

  return (
    <motion.span
      layout
      transition={SPRING_LAYOUT}
      className={cn(
        'relative inline-flex w-fit shrink-0 items-center overflow-hidden whitespace-nowrap rounded-full border font-medium tabular-nums',
        'transition-colors duration-300',
        STATUS_CLASS[status],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {pulse ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-current opacity-[0.07]"
          animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: EASE_IN_OUT }}
        />
      ) : null}

      {showIcon ? (
        <span className="relative z-10 inline-flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status}
              aria-hidden
              data-badge-icon
              variants={ICON_ROLL_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="inline-flex will-change-transform"
            >
              {status === 'loading' && !icon ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-flex"
                >
                  <Icon className={ICON_CLASS[size]} />
                </motion.span>
              ) : (
                (icon ?? <Icon className={ICON_CLASS[size]} />)
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}

      {children != null ? (
        <span className="relative z-10 inline-flex overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={resolvedContentKey}
              data-badge-label
              variants={TEXT_ROLL_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="inline-block will-change-transform"
            >
              {children}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
    </motion.span>
  );
}
