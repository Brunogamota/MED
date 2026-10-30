'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Opção 1 — "Selo Azul". Paleta clara e institucional.
 *
 * As variáveis vão direto no invólucro (não em `:root` nem em `.dark`), então
 * vencem o tema global para tudo o que estiver dentro. Menus e popovers são
 * portados para dentro deste mesmo invólucro — fora dele perderiam a paleta.
 */
const TOKENS: Record<string, string> = {
  '--radius': '10px',
  '--background': '#F6F8FB',
  '--foreground': '#0B1F3A',
  '--card': '#FFFFFF',
  '--card-foreground': '#0B1F3A',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#0B1F3A',
  '--primary': '#1D4ED8',
  '--primary-foreground': '#FFFFFF',
  '--secondary': '#EEF2F7',
  '--secondary-foreground': '#0B1F3A',
  '--muted': '#F1F4F9',
  '--muted-foreground': '#6B7C93',
  '--accent': '#EEF3FF',
  '--accent-foreground': '#1E40AF',
  '--destructive': '#DC2626',
  '--border': '#E3E8EF',
  '--input': '#D5DCE6',
  '--ring': '#1D4ED8',
  '--chart-1': '#1D4ED8',
  '--chart-2': '#0EA5E9',
  '--chart-3': '#425466',
  '--chart-4': '#93A4BA',
  '--chart-5': '#C9D3E0',
  '--o1-ink-2': '#425466',
  '--o1-ink-3': '#6B7C93',
  '--o1-hover': '#1E40AF',
  '--o1-sky': '#0EA5E9',
  '--o1-success': '#059669',
  '--o1-success-bg': '#ECFDF5',
  '--o1-warning': '#D97706',
  '--o1-warning-bg': '#FFFBEB',
  '--o1-error': '#DC2626',
  '--o1-error-bg': '#FEF2F2',
  '--o1-info-bg': '#EFF6FF',
  '--o1-sky-bg': '#F0F9FF',
  '--o1-sky-ink': '#0369A1',
  '--o1-shadow':
    '0 1px 2px rgba(11, 31, 58, 0.04), 0 1px 3px rgba(11, 31, 58, 0.06)',
  '--o1-shadow-lg':
    '0 12px 32px -12px rgba(11, 31, 58, 0.18), 0 2px 6px rgba(11, 31, 58, 0.06)',
  '--font-sans': 'var(--font-o1-sans), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': "var(--font-o1-mono), ui-monospace, 'SF Mono', monospace",
  colorScheme: 'light',
};

const PortalContext = React.createContext<HTMLElement | null>(null);

/** Nó onde menus e popovers desta prévia devem ser montados. */
export function usePortalContainer(): HTMLElement | null {
  return React.useContext(PortalContext);
}

export function ThemeRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const style = { ...TOKENS } as React.CSSProperties;
  return (
    <div
      ref={setNode}
      data-preview="opcao-1"
      style={style}
      className={cn(
        'min-h-screen bg-background font-sans text-foreground antialiased',
        className,
      )}
    >
      <PortalContext.Provider value={node}>{children}</PortalContext.Provider>
    </div>
  );
}
