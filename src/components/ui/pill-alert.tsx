import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Aviso em pilula: um rotulo solido a esquerda e a frase ao lado.
 *
 * Ocupa uma linha e cabe acima do conteudo que ele qualifica, ao contrario do
 * bloco de alerta, que interrompe a leitura da pagina.
 *
 * O vermelho sai do token `destructive`, nao de uma cor literal: o tema escuro
 * usa um vermelho mais claro, e um `red-500` fixo ficaria ilegivel la.
 */

export type PillAlertTone = 'danger' | 'neutral';

const OUTER: Record<PillAlertTone, string> = {
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted text-foreground',
};

const LABEL: Record<PillAlertTone, string> = {
  // No claro o `destructive` e escuro e pede texto branco; no escuro ele e um
  // vermelho claro, e branco sobre ele ficaria abaixo do contraste minimo —
  // dai o texto virar a cor do fundo da pagina.
  danger: 'border-destructive/30 bg-destructive text-white dark:text-background',
  neutral: 'border-border bg-background text-foreground',
};

export function PillAlert({
  tone = 'neutral',
  label,
  icon,
  children,
  className,
}: {
  tone?: PillAlertTone;
  label: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-fit max-w-full items-center gap-2.5 rounded-full border p-1 text-sm',
        OUTER[tone],
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-medium',
          LABEL[tone],
        )}
      >
        {icon}
        {label}
      </span>
      <span className="min-w-0 pr-3">{children}</span>
    </div>
  );
}
