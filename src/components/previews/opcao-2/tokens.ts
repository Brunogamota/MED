import type { CSSProperties } from 'react';

/**
 * Paleta da Opção 2 — "Bento Claro".
 *
 * Fica num objeto, e não numa folha de estilo, porque precisa ir para dois
 * lugares: o invólucro do layout e o conteúdo que o Radix porta para o <body>
 * (a gaveta do celular), que nasce fora do invólucro e não herdaria nada.
 *
 * Sobrescreve os papéis do shadcn (--background, --primary, --border…) para que
 * as primitivas de `components/ui` saiam nesta paleta sem edição, e também as
 * variáveis do ambiente Bulls (--font-bulls-heading, --bulls-line) para que a
 * folha global não puxe outra tipografia quando o ambiente estiver ativo.
 * Sempre claro: os valores não mudam com `.dark` no <html>.
 */
const vars: Record<`--${string}`, string> = {
  /* Paleta própria */
  '--o2-bg': '#F7F5FF',
  '--o2-bg-2': '#FAF7FF',
  '--o2-surface': '#FFFFFF',
  '--o2-ink': '#1B1030',
  '--o2-ink-2': '#4A3D63',
  /* #8A7BA8 não passa de 3,8:1 no branco: fica para eixo e ornamento.
     Texto auxiliar usa o tom acima, que passa de 5,7:1. */
  '--o2-ink-3': '#6E5F8D',
  '--o2-ink-4': '#8A7BA8',
  '--o2-line': '#ECE6F8',
  '--o2-line-strong': '#DDD2F3',
  '--o2-brand': '#A855F7',
  '--o2-brand-strong': '#9333EA',
  '--o2-brand-deep': '#7C3AED',
  '--o2-lilac': '#C084FC',
  '--o2-brand-soft': '#F3E8FF',
  '--o2-brand-wash': '#FAF5FF',
  '--o2-success': '#10B981',
  '--o2-success-soft': '#ECFDF5',
  '--o2-success-ink': '#047857',
  '--o2-warning': '#F59E0B',
  '--o2-warning-soft': '#FFFBEB',
  '--o2-warning-ink': '#B45309',
  '--o2-error': '#EF4444',
  '--o2-error-soft': '#FEF2F2',
  '--o2-error-ink': '#B91C1C',
  '--o2-neutral-soft': '#F3F0F9',
  /* Fundos de avatar (decorativos) */
  '--o2-av-1': '#F3E8FF',
  '--o2-av-1-ink': '#7C3AED',
  '--o2-av-2': '#EDE9FE',
  '--o2-av-2-ink': '#5B21B6',
  '--o2-av-3': '#FCE7F3',
  '--o2-av-3-ink': '#9D174D',
  '--o2-av-4': '#E0F2FE',
  '--o2-av-4-ink': '#075985',
  '--o2-av-5': '#FEF3C7',
  '--o2-av-5-ink': '#92400E',
  '--o2-av-6': '#DCFCE7',
  '--o2-av-6-ink': '#166534',
  '--o2-shadow':
    '0 1px 2px rgba(27, 16, 48, 0.04), 0 14px 36px -18px rgba(91, 33, 182, 0.22)',
  '--o2-shadow-hover':
    '0 2px 4px rgba(27, 16, 48, 0.05), 0 22px 48px -20px rgba(91, 33, 182, 0.32)',

  /* Papéis do shadcn */
  '--radius': '1rem',
  '--background': '#F7F5FF',
  '--foreground': '#1B1030',
  '--card': '#FFFFFF',
  '--card-foreground': '#1B1030',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#1B1030',
  '--primary': '#9333EA',
  '--primary-foreground': '#FFFFFF',
  '--secondary': '#F3EEFF',
  '--secondary-foreground': '#3B1670',
  '--muted': '#F4F0FC',
  '--muted-foreground': '#6E5F8D',
  '--accent': '#F3E8FF',
  '--accent-foreground': '#3B1670',
  '--destructive': '#EF4444',
  '--border': '#ECE6F8',
  '--input': '#E4DAF7',
  '--ring': '#A855F7',
  '--chart-1': '#A855F7',
  '--chart-2': '#C084FC',
  '--chart-3': '#7C3AED',
  '--chart-4': '#10B981',
  '--chart-5': '#F59E0B',
  '--sidebar': '#FFFFFF',
  '--sidebar-foreground': '#1B1030',
  '--sidebar-primary': '#9333EA',
  '--sidebar-primary-foreground': '#FFFFFF',
  '--sidebar-accent': '#F3E8FF',
  '--sidebar-accent-foreground': '#3B1670',
  '--sidebar-border': '#ECE6F8',
  '--sidebar-ring': '#A855F7',

  /* Tipografia: Plus Jakarta Sans para tudo, vinda do layout da opção. */
  '--font-sans': 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif',
  '--font-bulls-heading': 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif',
  '--font-mono': 'var(--font-jetbrains), ui-monospace, "SF Mono", monospace',

  /* Variáveis do ambiente Bulls, caso a folha global as use aqui dentro. */
  '--bulls-line': '#ECE6F8',
  '--bulls-chip': '#FFFFFFB3',
  '--bulls-bar': '#FAF7FFD9',
  '--bulls-glow': '#A855F72E',
};

export const o2Vars = { ...vars, colorScheme: 'light' } as CSSProperties;
