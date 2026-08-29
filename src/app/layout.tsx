import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: 'MED Defense',
  description: 'Automacao de defesa de MED com rastreabilidade de evidencias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <header className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
            <Link href="/meds" className="text-sm font-semibold tracking-tight">
              MED<span className="text-[var(--color-brand)]">Defense</span>
            </Link>
            <nav className="flex gap-4 text-sm text-[var(--color-ink-muted)]">
              <Link href="/meds" className="hover:text-[var(--color-ink)]">
                MEDs
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
              <span className="rounded border border-[var(--color-border-subtle)] px-2 py-0.5 uppercase">
                {config.appEnv}
              </span>
              {config.demoMode ? (
                <span
                  className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
                  title="Sem DATABASE_URL: os dados sao mantidos em memoria e se perdem a cada cold start."
                >
                  modo demo - dados nao persistidos
                </span>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
