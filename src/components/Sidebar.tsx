'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/**
 * Sidebar do console: 280px, fundo subtle, borda direita hairline.
 * Rotulo de grupo e o unico lugar da interface com caixa alta.
 *
 * Regras do briefing 2.3: item sem tela pronta aparece com badge "Em breve"
 * (nunca opacidade de desabilitado); "Importar lote" e acao, nao navegacao
 * (vive como botao na fila); itens com volume mostram contador a direita;
 * o rodape "Recolher menu" e sticky e funcional.
 */

export interface SidebarCounts {
  open: number;
  dueSoon: number;
  hasUrgent: boolean;
  submitted: number;
}

interface Item {
  label: string;
  href?: string;
  /** Query "view" que marca o item como ativo. */
  view?: string;
  icon: React.ReactNode;
  count?: number;
  countDanger?: boolean;
}

interface Group {
  label: string;
  items: Item[];
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

function buildGroups(counts: SidebarCounts): Group[] {
  return [
    {
      label: 'MEDs',
      items: [
        {
          label: 'Todos',
          href: '/meds',
          icon: <Icon path="M3 6h18M3 12h18M3 18h18" />,
          count: counts.open,
        },
        {
          label: 'Vencendo',
          href: '/meds?view=vencendo',
          view: 'vencendo',
          icon: <Icon path="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />,
          count: counts.dueSoon,
          countDanger: counts.hasUrgent,
        },
        {
          label: 'Enviados',
          href: '/meds?view=enviados',
          view: 'enviados',
          icon: <Icon path="m22 2-7 20-4-9-9-4Zm0 0L11 13" />,
          count: counts.submitted,
        },
      ],
    },
    {
      label: 'Defesa',
      items: [
        { label: 'Modelos', icon: <Icon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6" /> },
        { label: 'Regras de evidência', icon: <Icon path="M9 12l2 2 4-4m5.6 2A9 9 0 1 1 3.4 8.6 9 9 0 0 1 20.6 12Z" /> },
      ],
    },
    {
      label: 'Configuração',
      items: [
        { label: 'Instituições', icon: <Icon path="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /> },
        {
          label: 'Integrações',
          href: '/integracoes',
          icon: <Icon path="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />,
        },
        { label: 'Equipe', icon: <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
      ],
    },
  ];
}

function SidebarItems({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const currentView = search.get('view');

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {buildGroups(counts).map((group) => (
        <div key={group.label} className="mt-4">
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              if (!item.href) {
                return (
                  <li key={item.label}>
                    <span className="flex h-8 cursor-default items-center gap-2.5 rounded-md px-3 text-[13px] font-medium text-[var(--color-text-secondary)]">
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      <span className="inline-flex h-5 items-center rounded bg-[var(--color-surface-active)] px-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                        Em breve
                      </span>
                    </span>
                  </li>
                );
              }
              const [basePath] = item.href.split('?');
              const active =
                pathname === basePath &&
                (item.view ? currentView === item.view : !currentView || basePath !== '/meds');
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-[120ms] ${
                      active
                        ? 'bg-[var(--color-surface-active)] text-[var(--color-text)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {typeof item.count === 'number' && item.count > 0 ? (
                      <span
                        className={`tabular text-[11px] ${
                          item.countDanger
                            ? 'font-medium text-[var(--color-danger)]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function storedCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('sidebar-collapsed') === '1';
  } catch {
    // Sem storage disponível: começa expandida.
    return false;
  }
}

export function Sidebar({ counts }: { counts: SidebarCounts }) {
  // Nasce expandida no servidor e no primeiro paint (sem mismatch de
  // hidratação); a preferência guardada entra num frame seguinte.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (storedCollapsed()) setCollapsed(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.body.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    try {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    } catch {
      // Preferência não persistida; segue o estado da sessão.
    }
  }, [collapsed]);

  if (collapsed) {
    return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[44px] flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] pt-[60px] lg:flex">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expandir menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-[280px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] pt-[52px] lg:flex">
      <Suspense fallback={<div className="flex-1" />}>
        <SidebarItems counts={counts} />
      </Suspense>
      <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Recolher menu
        </button>
      </footer>
    </aside>
  );
}
