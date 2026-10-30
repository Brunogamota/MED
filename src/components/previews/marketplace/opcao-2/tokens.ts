import type { CSSProperties } from 'react';

/**
 * Opção 2 — Editorial Âmbar.
 *
 * Papel quente, fios finos e tipografia no lugar de sombra. As variáveis
 * ficam no wrapper do layout (e não no :root) para que só esta prévia mude:
 * as primitivas do shadcn dentro dela leem a mesma paleta, e o `.dark` do
 * <html> não alcança os valores, porque estão definidos direto no elemento.
 */
export const EDITORIAL_VARS = {
  // Paleta própria
  '--ed-paper': '#FBF7F0',
  '--ed-desk': '#F2EBDF',
  '--ed-surface': '#FFFDF9',
  '--ed-letter': '#FFFAF2',
  '--ed-rule': '#E9E1D3',
  '--ed-rule-strong': '#D8CCB8',
  '--ed-ink': '#1A1714',
  '--ed-ink-2': '#5C544A',
  '--ed-ink-3': '#8A8073',
  '--ed-muted': '#F4EDE1',
  '--ed-hover': '#F7F1E7',
  '--ed-brand': '#C2410C',
  '--ed-brand-hover': '#9A3412',
  '--ed-brand-soft': '#FBEADC',
  '--ed-amber': '#F59E0B',
  '--ed-amber-soft': '#FDF0D3',
  '--ed-amber-ink': '#8A4B08',
  '--ed-olive': '#4D7C0F',
  '--ed-olive-soft': '#EEF2DF',
  '--ed-error': '#B91C1C',
  '--ed-error-soft': '#FBE7E3',

  // Famílias (as variáveis --font-ed-* vêm do next/font, no mesmo elemento)
  '--ed-serif': 'var(--font-ed-fraunces), Georgia, "Times New Roman", serif',
  '--font-sans': 'var(--font-ed-instrument), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': 'var(--font-ed-plex), ui-monospace, "SF Mono", monospace',

  // Tokens do shadcn, para as primitivas herdarem a paleta
  '--background': '#FBF7F0',
  '--foreground': '#1A1714',
  '--card': '#FFFDF9',
  '--card-foreground': '#1A1714',
  '--popover': '#FFFDF9',
  '--popover-foreground': '#1A1714',
  '--primary': '#C2410C',
  '--primary-foreground': '#FFFDF9',
  '--secondary': '#F4EDE1',
  '--secondary-foreground': '#1A1714',
  '--muted': '#F4EDE1',
  '--muted-foreground': '#5C544A',
  '--accent': '#F7F1E7',
  '--accent-foreground': '#1A1714',
  '--destructive': '#B91C1C',
  '--border': '#E9E1D3',
  '--input': '#D8CCB8',
  '--ring': '#C2410C',
  '--radius': '6px',
  '--chart-1': '#C2410C',
  '--chart-2': '#F59E0B',
  '--chart-3': '#5C544A',
  '--chart-4': '#8A8073',
  '--chart-5': '#4D7C0F',
  '--sidebar': '#FBF7F0',
  '--sidebar-foreground': '#1A1714',
  '--sidebar-primary': '#C2410C',
  '--sidebar-primary-foreground': '#FFFDF9',
  '--sidebar-accent': '#F4EDE1',
  '--sidebar-accent-foreground': '#1A1714',
  '--sidebar-border': '#E9E1D3',
  '--sidebar-ring': '#C2410C',
  colorScheme: 'light',
} as CSSProperties;

/** Fraunces: títulos e números grandes. */
export const serif = 'font-(family-name:--ed-serif)';

/** Rótulo em versalete: legenda de coluna, eyebrow, termo de lista. */
export const eyebrow =
  'text-[11px] font-medium uppercase tracking-[0.12em] text-(--ed-ink-2)';

export const BASE_HREF = '/preview/marketplace/opcao-2';
