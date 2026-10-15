/**
 * Tokens da Opção 4. Um só lugar define a paleta; as telas usam os papéis
 * (`bg-card`, `text-muted-foreground`, `bg-(--o4-raised)`…), nunca a cor.
 *
 * O seletor leva duas classes para vencer o `.dark` do `globals.css`, que tem
 * a mesma especificidade de uma classe só e poderia chegar depois na cascata.
 * A classe `dark` no mesmo nó liga as variantes `dark:` das primitivas.
 */
export const O4_ROOT_CLASS = 'o4-root dark';

export const O4_TOKENS_CSS = `
.o4-root.dark {
  color-scheme: dark;
  --radius: 0.5rem;

  --background: #0A0A0F;
  --foreground: #FAFAFA;
  --card: #111118;
  --card-foreground: #FAFAFA;
  --popover: #17171F;
  --popover-foreground: #FAFAFA;
  --primary: #A855F7;
  --primary-foreground: #FAFAFA;
  --secondary: #17171F;
  --secondary-foreground: #FAFAFA;
  --muted: #17171F;
  --muted-foreground: #A1A1AA;
  --accent: #1C1C26;
  --accent-foreground: #FAFAFA;
  --destructive: #EF4444;
  --border: #26262F;
  --input: #26262F;
  --ring: #9333EA;

  --chart-1: #A855F7;
  --chart-2: #8B5CF6;
  --chart-3: #C084FC;
  --chart-4: #9333EA;
  --chart-5: #71717A;

  --sidebar: #0D0D13;
  --sidebar-foreground: #FAFAFA;
  --sidebar-primary: #A855F7;
  --sidebar-primary-foreground: #FAFAFA;
  --sidebar-accent: #17171F;
  --sidebar-accent-foreground: #FAFAFA;
  --sidebar-border: #26262F;
  --sidebar-ring: #9333EA;

  --o4-raised: #17171F;
  --o4-subtle: #71717A;
  --o4-brand: #A855F7;
  --o4-brand-strong: #9333EA;
  --o4-violet: #8B5CF6;
  --o4-lilac: #C084FC;
  --o4-success: #10B981;
  --o4-warning: #F59E0B;
  --o4-error: #EF4444;

  --font-sans: var(--font-o4-sans), 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-o4-mono), 'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;
}
`;
