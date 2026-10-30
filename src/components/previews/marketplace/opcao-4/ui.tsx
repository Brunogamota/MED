import * as React from 'react';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, type PreviewStatus } from '@/components/previews/marketplace/fixtures';

/*
 * Opção 4 — Suíço Amarelo. Primitivos de tipografia e de forma.
 *
 * Toda cor sai das variáveis definidas no layout da opção (`--o4-*`). Nada de
 * hex solto aqui: trocar a paleta é editar um lugar só.
 */

/** Títulos e números: Space Grotesk, apertada. */
export const display = 'font-[family-name:var(--o4-display)] tracking-[-0.025em]';

/** Ids, valores técnicos e rótulos: JetBrains Mono. */
export const mono = 'font-[family-name:var(--o4-mono)]';

/** Rótulo de campo: mono, caixa alta, espaçado. */
export const eyebrow = cn(
  mono,
  'text-[10.5px] font-medium uppercase leading-none tracking-[0.14em] text-(--o4-ink-3)',
);

/** Foco visível: contorno preto, sem brilho. */
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--o4-ink)';

/* ---------- Botões ---------- */

type Tone = 'brand' | 'ink' | 'plain';

const TONE: Record<Tone, string> = {
  brand: cn(
    'border-2 border-(--o4-ink) bg-(--o4-yellow) text-(--o4-ink)',
    'shadow-[4px_4px_0_var(--o4-ink)] hover:bg-(--o4-yellow) hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_var(--o4-ink)]',
    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_var(--o4-ink)]',
  ),
  ink: cn(
    'border-2 border-(--o4-ink) bg-(--o4-ink) text-(--o4-yellow)',
    'shadow-[4px_4px_0_var(--o4-yellow-deep)] hover:bg-(--o4-ink) hover:-translate-x-px hover:-translate-y-px',
    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
  ),
  plain: cn(
    'border-2 border-(--o4-ink) bg-(--o4-paper) text-(--o4-ink) shadow-none',
    'hover:bg-(--o4-panel)',
  ),
};

/**
 * Classes do botão da opção, aplicadas sobre o `Button` do shadcn (que já
 * resolve `asChild`, desabilitado e foco). Canto vivo, borda de 2px e sombra
 * dura deslocada.
 */
export function hardButton(tone: Tone, className?: string) {
  return cn(
    'h-10 gap-2 rounded-none px-4 text-[13px] font-semibold tracking-[-0.005em]',
    'not-disabled:inset-shadow-none transition-[transform,box-shadow,background-color] duration-100',
    'focus-visible:border-(--o4-ink) focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-(--o4-ink)',
    'disabled:opacity-100 disabled:border-(--o4-ink-4) disabled:bg-(--o4-panel) disabled:text-(--o4-ink-3) disabled:shadow-none',
    TONE[tone],
    className,
  );
}

/* ---------- Status ---------- */

const STATUS_SWATCH: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--o4-success)',
  SEM_ENVIO: 'bg-(--o4-error)',
  DEFESA: 'bg-(--o4-ink)',
  COLETANDO: 'bg-(--o4-warning)',
  ENVIADO: 'bg-(--o4-paper) ring-[1.5px] ring-inset ring-(--o4-ink)',
};

export function StatusSwatch({ status, className }: { status: PreviewStatus; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2.5 shrink-0', STATUS_SWATCH[status], className)} />;
}

export function StatusChip({ status, className }: { status: PreviewStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap border-[1.5px] border-(--o4-ink) bg-(--o4-paper) px-2',
        mono,
        'text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-(--o4-ink)',
        className,
      )}
    >
      <StatusSwatch status={status} className="size-2" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- Score ---------- */

export type ScoreTier = { label: string; fill: string; text: string };

/** Faixas do score de evidência. Regra única, usada na fila e no detalhe. */
export function scoreTier(score: number): ScoreTier {
  if (score >= 70) return { label: 'Forte', fill: 'bg-(--o4-success)', text: 'text-(--o4-success)' };
  if (score >= 40) return { label: 'Parcial', fill: 'bg-(--o4-warning)', text: 'text-(--o4-warning)' };
  return { label: 'Fraco', fill: 'bg-(--o4-error)', text: 'text-(--o4-error)' };
}

/** Barra de score: grossa, com marcas a cada 25 pontos. */
export function ScoreBar({
  score,
  size = 'sm',
  className,
}: {
  score: number;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const tier = scoreTier(score);
  const lg = size === 'lg';
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={`Score de evidência ${score} de 100, ${tier.label.toLowerCase()}`}
      className={cn(
        'relative overflow-hidden bg-(--o4-paper)',
        lg ? 'h-6 border-2 border-(--o4-ink)' : 'h-2 border-[1.5px] border-(--o4-ink)',
        className,
      )}
    >
      <div className={cn('absolute inset-y-0 left-0', tier.fill)} style={{ width: `${score}%` }} />
      {lg ? (
        [25, 50, 75].map((t) => (
          <span
            key={t}
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-(--o4-ink)"
            style={{ left: `calc(${t}% - 1px)` }}
          />
        ))
      ) : null}
    </div>
  );
}

/* ---------- Helpers de formato ---------- */

/** End-to-end encurtado para caber numa linha da fila. */
export function e2eCurto(e2e: string): string {
  return `${e2e.slice(0, 10)}…${e2e.slice(-6)}`;
}

const NUM = new Intl.NumberFormat('pt-BR');
export function inteiro(n: number): string {
  return NUM.format(n);
}

const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
export function pct(parte: number, todo: number): string {
  return PCT.format(parte / todo);
}
