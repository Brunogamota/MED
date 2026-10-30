import type { CSSProperties, ReactNode } from 'react';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/cn';

/*
 * Opção 4 — Suíço Amarelo. Branco puro, tinta preta, amarelo de sinal.
 *
 * As variáveis vivem no wrapper, não no globals.css: o que está aqui dentro
 * (inclusive as primitivas do shadcn) lê esta paleta, e o `.dark` do <html>
 * não alcança porque a variável mais próxima vence.
 */

const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--o4-font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--o4-font-body', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--o4-font-mono', display: 'swap' });

type Tokens = CSSProperties & Record<`--${string}`, string>;

const tokens: Tokens = {
  colorScheme: 'light',

  /* Paleta da opção. */
  '--o4-paper': '#FFFFFF',
  '--o4-ink': '#0A0A0A',
  '--o4-ink-2': '#3D3D3A',
  '--o4-ink-3': '#5E5E5A',
  '--o4-ink-4': '#A3A39E',
  '--o4-panel': '#F2F2F0',
  '--o4-rule': '#E4E4E0',
  '--o4-yellow': '#FFD60A',
  '--o4-yellow-deep': '#FFD60A',
  '--o4-success': '#16A34A',
  '--o4-warning': '#EA580C',
  '--o4-error': '#DC2626',

  /* Famílias. */
  '--o4-display': 'var(--o4-font-display), ui-sans-serif, system-ui, sans-serif',
  '--o4-mono': 'var(--o4-font-mono), ui-monospace, monospace',
  '--font-sans': 'var(--o4-font-body), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': 'var(--o4-font-mono), ui-monospace, monospace',

  /* Tokens do shadcn, para as primitivas herdarem a paleta. */
  '--radius': '0rem',
  '--background': '#FFFFFF',
  '--foreground': '#0A0A0A',
  '--card': '#FFFFFF',
  '--card-foreground': '#0A0A0A',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#0A0A0A',
  '--primary': '#FFD60A',
  '--primary-foreground': '#0A0A0A',
  '--secondary': '#F2F2F0',
  '--secondary-foreground': '#0A0A0A',
  '--muted': '#F2F2F0',
  '--muted-foreground': '#5E5E5A',
  '--accent': '#FFD60A',
  '--accent-foreground': '#0A0A0A',
  '--destructive': '#DC2626',
  '--border': '#0A0A0A',
  '--input': '#0A0A0A',
  '--ring': '#0A0A0A',
  '--chart-1': '#FFD60A',
  '--chart-2': '#0A0A0A',
  '--chart-3': '#EA580C',
  '--chart-4': '#16A34A',
  '--chart-5': '#5E5E5A',
};

export default function Opcao4Layout({ children }: { children: ReactNode }) {
  return (
    <div
      style={tokens}
      className={cn(
        grotesk.variable,
        inter.variable,
        jetbrains.variable,
        'min-h-screen bg-(--o4-paper) font-sans text-(--o4-ink) antialiased',
        'selection:bg-(--o4-yellow) selection:text-(--o4-ink)',
      )}
    >
      {children}
    </div>
  );
}
