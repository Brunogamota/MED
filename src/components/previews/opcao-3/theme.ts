/**
 * Paleta da Opção 3 ("Banking App"), como variáveis num invólucro.
 *
 * As primitivas do shadcn leem `--background`, `--primary` e companhia. Redefinir
 * esses nomes na classe `.op3-theme` faz tudo abaixo dela vestir esta paleta sem
 * tocar no `globals.css`. A classe também vai no conteúdo de Sheet, que é
 * renderizado num portal fora do invólucro.
 *
 * O ambiente Bulls Cash do console (`html[data-skin='bulls']`) estiliza cartão,
 * botão, tabela e título com regras fora de camada, que ganham de qualquer
 * utilitário do Tailwind. Aqui essas peças voltam ao que as camadas dizem
 * (`revert-layer`), então a prévia mostra só esta direção visual.
 */
export const OP3_THEME_CLASS = 'op3-theme';

export const OP3_CSS = `
.op3-theme {
  color-scheme: light;
  font-family: var(--font-op3), ui-sans-serif, system-ui, sans-serif;
  letter-spacing: normal;
  font-feature-settings: 'cv11', 'ss01';

  --op3-page: #f8f7fc;
  --op3-ink: #1c1530;
  --op3-ink-2: #4a4163;
  --op3-ink-3: #6e6589;
  --op3-violet: #7c3aed;
  --op3-purple: #a855f7;
  --op3-lilac: #c084fc;
  --op3-lilac-soft: #f3ecfe;
  --op3-success: #10b981;
  --op3-success-ink: #047857;
  --op3-warning: #f59e0b;
  --op3-warning-ink: #b45309;
  --op3-error: #ef4444;
  --op3-error-ink: #b91c1c;
  --op3-line: #ebe7f3;

  --radius: 0.875rem;
  --font-sans: var(--font-op3), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, 'SF Mono', monospace;

  --background: #f8f7fc;
  --foreground: #1c1530;
  --card: #ffffff;
  --card-foreground: #1c1530;
  --popover: #ffffff;
  --popover-foreground: #1c1530;
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --secondary: #f3ecfe;
  --secondary-foreground: #1c1530;
  --muted: #f4f2f9;
  --muted-foreground: #6e6589;
  --accent: #f3ecfe;
  --accent-foreground: #4a4163;
  --destructive: #ef4444;
  --border: #ebe7f3;
  --input: #e3ddef;
  --ring: #a855f7;
  --chart-1: #7c3aed;
  --chart-2: #a855f7;
  --chart-3: #c084fc;
  --chart-4: #10b981;
  --chart-5: #f59e0b;
  --sidebar: #ffffff;
  --sidebar-foreground: #1c1530;
  --sidebar-primary: #7c3aed;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f3ecfe;
  --sidebar-accent-foreground: #1c1530;
  --sidebar-border: #ebe7f3;
  --sidebar-ring: #a855f7;
}

html[data-skin] .op3-theme :is(h1, h2, h3, .font-heading, [data-slot='card'], [data-slot='card-title'], [data-slot='button'], [data-slot='input'], [data-slot='textarea'], select, [data-slot='table-head'], thead th, [data-slot='badge']),
html[data-skin] .op3-theme :is([data-slot='table-row'], tbody tr):hover {
  all: revert-layer;
}

/* Em camada: os utilitários do Tailwind (hover, print) ainda ganham destas. */
@layer components {
  .op3-elev {
    box-shadow: 0 1px 2px rgb(28 21 48 / 0.04), 0 12px 32px -16px rgb(28 21 48 / 0.12);
  }

  .op3-hero {
    background:
      radial-gradient(640px 320px at 88% -20%, rgb(255 255 255 / 0.16), transparent 70%),
      radial-gradient(520px 280px at 0% 120%, rgb(192 132 252 / 0.35), transparent 70%),
      linear-gradient(135deg, #7c3aed 0%, #8b45ef 55%, #a855f7 100%);
  }

  .op3-hero-glass {
    background: rgb(255 255 255 / 0.1);
    border: 1px solid rgb(255 255 255 / 0.18);
  }
}

@media print {
  .op3-elev { box-shadow: none; }
  .op3-theme { background: #ffffff; }
}
`;
