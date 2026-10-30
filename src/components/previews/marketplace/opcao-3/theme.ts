import type { CSSProperties } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

/**
 * Opção 3 — "Noite Coral". Paleta e fontes num lugar só: o layout aplica no
 * invólucro da página, e o que vai para portal (Sheet, tooltip) recebe o mesmo
 * estilo, porque o portal nasce no <body> e não herda as variáveis do invólucro.
 */

const geist = Geist({
  subsets: ['latin'],
  variable: '--nc-font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--nc-font-geist-mono',
  display: 'swap',
});

/** Classes das fontes: precisam estar em todo nó que redefine --font-sans. */
export const NOITE_FONT_CLASS = `${geist.variable} ${geistMono.variable}`;

const VARS: Record<string, string> = {
  colorScheme: 'dark',
  '--radius': '12px',
  '--background': '#0B0D12',
  '--foreground': '#F4F1EC',
  '--card': '#12151C',
  '--card-foreground': '#F4F1EC',
  '--popover': '#171B24',
  '--popover-foreground': '#F4F1EC',
  '--primary': '#FF6B57',
  '--primary-foreground': '#170906',
  '--secondary': '#171B24',
  '--secondary-foreground': '#F4F1EC',
  '--muted': '#171B24',
  '--muted-foreground': '#9A968E',
  '--accent': '#1D2230',
  '--accent-foreground': '#F4F1EC',
  '--destructive': '#F87171',
  '--border': '#232836',
  '--input': '#2A3040',
  '--ring': '#FF6B57',
  '--chart-1': '#FF6B57',
  '--chart-2': '#F2C48D',
  '--font-sans': 'var(--nc-font-geist), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': "var(--nc-font-geist-mono), ui-monospace, 'SF Mono', monospace",
  // Papéis próprios da opção.
  '--nc-bg': '#0B0D12',
  '--nc-surface': '#12151C',
  '--nc-surface-2': '#171B24',
  '--nc-surface-3': '#1D2230',
  '--nc-line': '#232836',
  '--nc-text': '#F4F1EC',
  '--nc-text-2': '#B9B4AA',
  '--nc-text-3': '#7D7A73',
  '--nc-coral': '#FF6B57',
  '--nc-coral-hover': '#FF5038',
  '--nc-sand': '#F2C48D',
  '--nc-success': '#34D399',
  '--nc-warning': '#FBBF24',
  '--nc-error': '#F87171',
};

/** Variáveis da opção como `style` — para o invólucro e para conteúdo em portal. */
export const NOITE_STYLE = VARS as CSSProperties;
