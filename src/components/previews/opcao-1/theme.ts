/**
 * Opção 1 — "Pro Dark".
 *
 * A paleta mora numa classe (`.o1-theme`) e não num estilo inline do wrapper
 * porque menus, folhas e tooltips do Radix renderizam num portal no <body>,
 * fora do wrapper. Esses conteúdos recebem `O1_SCOPE` e herdam o mesmo tema.
 * `dark` liga as variantes `dark:` das primitivas (o variant é `.dark *`).
 */
export const O1_SCOPE = 'o1-theme dark font-sans';

export function o1ThemeCss(sans: string, mono: string): string {
  return `
.o1-theme {
  color-scheme: dark;
  --font-sans: ${sans}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${mono}, ui-monospace, 'SF Mono', monospace;
  --radius: 0.625rem;

  --background: #020617;
  --foreground: #F8FAFC;
  --card: color-mix(in oklab, #1E293B 46%, #020617);
  --card-foreground: #F8FAFC;
  --popover: #0F172A;
  --popover-foreground: #F8FAFC;
  --primary: #A855F7;
  --primary-foreground: #FFFFFF;
  --secondary: #1E293B;
  --secondary-foreground: #F8FAFC;
  --muted: #1E293B;
  --muted-foreground: #94A3B8;
  --accent: #1E293B;
  --accent-foreground: #F8FAFC;
  --destructive: #EF4444;
  --border: #334155;
  --input: #334155;
  --ring: #A855F7;
  --chart-1: #A855F7;
  --chart-2: #8B5CF6;
  --chart-3: #C084FC;
  --chart-4: #10B981;
  --chart-5: #F59E0B;
  --sidebar: #0F172A;
  --sidebar-foreground: #CBD5E1;
  --sidebar-primary: #A855F7;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #1E293B;
  --sidebar-accent-foreground: #F8FAFC;
  --sidebar-border: #1E293B;
  --sidebar-ring: #A855F7;

  --o1-text-2: #CBD5E1;
  --o1-surface: #1E293B;
  --o1-brand-hover: #9333EA;
  --o1-violet: #8B5CF6;
  --o1-lilac: #C084FC;
  --o1-success: #10B981;
  --o1-warning: #F59E0B;
  --o1-error: #EF4444;
}
.o1-theme ::selection { background: #A855F744; }
@media print {
  .o1-theme { background: #FFFFFF !important; }
}
`;
}
