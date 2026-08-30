import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig } from '@/lib/env';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'MED Defense',
  description: 'Automação de defesa de MED com rastreabilidade de evidências',
};

/**
 * Shell de console: topbar de 52px + sidebar fixa de 280px.
 * O aviso de modo demo e um badge discreto na topbar, nao uma faixa.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[var(--color-bg)]">
        <header className="fixed inset-x-0 top-0 z-20 flex h-[52px] items-center gap-3 border-b border-[var(--color-border)] bg-white px-4">
          <Link href="/meds" className="flex items-center gap-1 text-[13px] font-semibold">
            <span aria-hidden className="mr-1 h-5 w-5 rounded bg-[var(--color-primary)]" />
            MED Defense
          </Link>
          <span aria-hidden className="text-[var(--color-text-muted)]">/</span>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            {config.demoMode ? 'Organização demo' : 'Minha organização'}
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            {config.demoMode ? (
              <span
                className="inline-flex h-5 items-center rounded bg-[var(--color-warning-subtle)] px-1.5 text-[11px] font-medium text-[var(--color-warning)]"
                title="Sem banco configurado: os dados vivem em memória e se perdem a cada reinício."
              >
                Modo demo
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              Operacional
            </span>
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-active)] text-[11px] font-medium text-[var(--color-text-secondary)]"
            >
              {config.demoMode ? 'D' : 'M'}
            </span>
          </div>
        </header>

        <Sidebar />

        <main className="pt-[52px] lg:pl-[280px]">
          <div className="mx-auto max-w-[1440px] px-8 py-6 max-md:px-4">{children}</div>
        </main>
      </body>
    </html>
  );
}
