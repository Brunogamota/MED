import type { CSSProperties } from 'react';

/**
 * Opção 5 — "Vidro Noturno".
 *
 * Os tokens do shadcn são redefinidos aqui, no elemento que envolve a prévia,
 * para que Dialog, Table, Badge e Button herdem a paleta sem tocar em
 * `globals.css`. Conteúdo em portal (Dialog, DropdownMenu) sai dessa árvore,
 * então recebe o mesmo objeto por `style`.
 */
type CSSVars = CSSProperties & Record<`--${string}`, string>;

export const O5_VARS: CSSVars = {
  '--radius': '1rem',
  '--font-sans': 'var(--o5-manrope), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': 'var(--o5-mono), ui-monospace, monospace',

  '--background': '#020617',
  '--foreground': '#F8FAFC',
  '--card': 'rgb(255 255 255 / 0.045)',
  '--card-foreground': '#F8FAFC',
  '--popover': 'rgb(10 14 34 / 0.92)',
  '--popover-foreground': '#F8FAFC',
  '--primary': '#A855F7',
  '--primary-foreground': '#FFFFFF',
  '--secondary': 'rgb(255 255 255 / 0.06)',
  '--secondary-foreground': '#F8FAFC',
  '--muted': 'rgb(255 255 255 / 0.06)',
  '--muted-foreground': '#94A3B8',
  '--accent': 'rgb(168 85 247 / 0.14)',
  '--accent-foreground': '#F8FAFC',
  '--destructive': '#EF4444',
  '--border': 'rgb(255 255 255 / 0.10)',
  '--input': 'rgb(255 255 255 / 0.12)',
  '--ring': '#A855F7',
  '--chart-1': '#A855F7',
  '--chart-2': '#8B5CF6',
  '--chart-3': '#C084FC',
  '--chart-4': '#10B981',
  '--chart-5': '#F59E0B',

  /* Papéis próprios da opção, fora do vocabulário do shadcn. */
  '--o5-text-2': '#CBD5E1',
  '--o5-brand': '#A855F7',
  '--o5-violet': '#8B5CF6',
  '--o5-lilac': '#C084FC',
  '--o5-success': '#10B981',
  '--o5-warning': '#F59E0B',
  '--o5-error': '#EF4444',

  colorScheme: 'dark',
  color: 'var(--foreground)',
  fontFamily: 'var(--o5-manrope), ui-sans-serif, system-ui, sans-serif',
};

/** Títulos em Sora. */
export const HEADING = 'font-[family-name:var(--o5-sora)] tracking-[-0.02em]';

/** Números, prazos e identificadores em JetBrains Mono. */
export const MONO = 'font-[family-name:var(--o5-mono)] tabular-nums';

/** Superfície de vidro: 4–6% de branco, desfoque, borda de 10%. */
export const GLASS =
  'rounded-2xl border border-border bg-card backdrop-blur-xl shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_24px_64px_-32px_rgb(0_0_0/0.8)]';

export type Tone = 'brand' | 'success' | 'warning' | 'error' | 'neutral';

export const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-(--o5-lilac)',
  success: 'text-(--o5-success)',
  warning: 'text-(--o5-warning)',
  error: 'text-(--o5-error)',
  neutral: 'text-(--o5-text-2)',
};

/** Selo colorido no estilo da tabela de mercados: fundo 10%, borda 30%. */
export const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-(--o5-brand)/10 border-(--o5-brand)/30 text-(--o5-lilac)',
  success: 'bg-(--o5-success)/10 border-(--o5-success)/30 text-(--o5-success)',
  warning: 'bg-(--o5-warning)/10 border-(--o5-warning)/30 text-(--o5-warning)',
  error: 'bg-(--o5-error)/10 border-(--o5-error)/30 text-(--o5-error)',
  neutral: 'bg-white/[0.04] border-border text-(--o5-text-2)',
};

export const TONE_BG: Record<Tone, string> = {
  brand: 'bg-(--o5-brand)',
  success: 'bg-(--o5-success)',
  warning: 'bg-(--o5-warning)',
  error: 'bg-(--o5-error)',
  neutral: 'bg-(--o5-text-2)',
};

export function scoreTone(score: number): Tone {
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

export function prazoTone(horas: number): Tone {
  if (horas <= 12) return 'error';
  if (horas < 24) return 'warning';
  return 'neutral';
}
