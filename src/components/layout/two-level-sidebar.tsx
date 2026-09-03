'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from '@carbon/icons-react';
import { NavUserMenu } from '@/components/layout/nav-user-menu';
import { SearchTrigger } from '@/components/layout/search-dialog';
import { BrandMarkOnDark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/cn';
import {
  RAIL_SECTIONS,
  sectionForPath,
  type PanelItem,
  type RailSection,
} from '@/navigation/sidebar-sections';

/**
 * Navegação de dois níveis: trilho de ícones + painel da seção.
 *
 * O trilho escolhe a área e o painel mostra o que existe dentro dela. A seção
 * aberta segue a rota, mas o operador pode espiar outra área sem sair da
 * página — por isso a seção é estado local, e não derivada só do pathname.
 *
 * A peça é escura nos dois temas, de propósito: o cromo fica constante
 * enquanto a área de conteúdo acompanha o tema, e a fronteira entre navegação
 * e trabalho não depende de qual tema está ativo.
 */

const SPRING = 'cubic-bezier(0.25, 1.1, 0.4, 1)';

export interface NavCounts {
  open: number;
  dueSoon: number;
  submitted: number;
  /** Algum MED com menos de 24h — tinge o contador de "Vencendo". */
  hasUrgent: boolean;
}

/* ------------------------------- Trilho ---------------------------------- */

function RailButton({
  children,
  isActive,
  label,
  onClick,
  href,
}: {
  children: ReactNode;
  isActive: boolean;
  label: string;
  onClick: () => void;
  href?: string;
}) {
  const className = cn(
    'flex size-10 min-w-10 items-center justify-center rounded-lg transition-colors duration-500',
    isActive
      ? 'bg-neutral-800 text-neutral-50'
      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200',
  );

  if (href) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        onClick={onClick}
        className={className}
        style={{ transitionTimingFunction: SPRING }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={className}
      style={{ transitionTimingFunction: SPRING }}
    >
      {children}
    </button>
  );
}

function IconRail({
  activeId,
  onSelect,
  collapsed,
  onExpand,
}: {
  activeId: string;
  collapsed: boolean;
  onExpand: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Áreas"
      className="flex w-16 shrink-0 flex-col items-center gap-2 border-neutral-800 border-r bg-black p-4"
    >
      <div className="mb-2 flex size-10 items-center justify-center">
        <BrandMarkOnDark size={32} />
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        {RAIL_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <RailButton
              key={section.id}
              label={section.title}
              href={section.href}
              isActive={activeId === section.id}
              onClick={() => {
                onSelect(section.id);
                // Escolher uma área com o painel fechado reabre: o trilho
                // sozinho diz a área, nunca o que existe dentro dela.
                if (collapsed) onExpand();
              }}
            >
              <Icon size={16} />
            </RailButton>
          );
        })}
      </div>

      {collapsed ? (
        <>
          <span aria-hidden className="my-1 h-px w-6 bg-neutral-800" />
          <button
            type="button"
            aria-label="Abrir o painel"
            title="Abrir o painel"
            onClick={onExpand}
            className="flex size-10 min-w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </>
      ) : null}

      <div className="flex-1" />
    </nav>
  );
}

/* -------------------------------- Painel --------------------------------- */

function PanelHeader({ title, onToggle }: { title: string; onToggle: () => void }) {
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Recolher o painel"
      className="flex size-10 min-w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-500 hover:bg-neutral-800 hover:text-neutral-200"
      style={{ transitionTimingFunction: SPRING }}
    >
      {/* A seta aponta para onde o painel vai. Quem reabre é o trilho. */}
      <ChevronDown size={16} className="rotate-90" />
    </button>
  );

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2 px-2">
        <BrandMarkOnDark size={22} />
        <span className="font-semibold text-[15px] text-neutral-50">{title}</span>
      </div>
      {toggle}
    </div>
  );
}

function CountBadge({ value, urgent }: { value: number; urgent: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto shrink-0 text-xs tabular-nums',
        urgent ? 'font-medium text-red-400' : 'text-neutral-400',
      )}
    >
      {value}
    </span>
  );
}

function SoonBadge() {
  return (
    <span className="ml-auto shrink-0 rounded-sm border border-neutral-700 px-1.5 py-px text-[10px] text-neutral-400">
      em breve
    </span>
  );
}

function PanelRow({
  item,
  isActive,
  counts,
  expanded,
  onToggleExpand,
}: {
  item: PanelItem;
  isActive: boolean;
  counts: NavCounts;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = item.icon;
  const count = item.countKey ? counts[item.countKey] : 0;
  const hasChildren = Boolean(item.children?.length);

  const body = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {Icon ? <Icon size={16} /> : null}
      </span>

      <span className="ml-3 flex-1 truncate text-left text-sm">{item.label}</span>

      {!item.href ? <SoonBadge /> : null}
      {item.href && count > 0 ? (
        <CountBadge value={count} urgent={Boolean(item.countUrgent) && counts.hasUrgent} />
      ) : null}
      {hasChildren ? (
        <ChevronDown
          size={16}
          className="ml-2 shrink-0 transition-transform duration-500"
          style={{
            transitionTimingFunction: SPRING,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      ) : null}
    </>
  );

  const className = cn(
    'flex h-10 w-full items-center rounded-lg px-3 transition-colors duration-500',
    isActive ? 'bg-neutral-800 text-neutral-50' : 'text-neutral-300 hover:bg-neutral-800',
    !item.href && !hasChildren && 'cursor-default text-neutral-500 hover:bg-transparent',
  );

  if (hasChildren) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className={className}
        style={{ transitionTimingFunction: SPRING }}
        aria-expanded={expanded}
      >
        {body}
      </button>
    );
  }

  if (!item.href) {
    return (
      <span className={className}>{body}</span>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      style={{ transitionTimingFunction: SPRING }}
      aria-current={isActive ? 'page' : undefined}
    >
      {body}
    </Link>
  );
}

function SectionPanel({
  section,
  collapsed,
  counts,
  onToggleCollapse,
  organization,
  demoMode,
}: {
  section: RailSection;
  collapsed: boolean;
  counts: NavCounts;
  onToggleCollapse: () => void;
  organization: string;
  demoMode: boolean;
}) {
  const pathname = usePathname();
  const view = useSearchParams().get('view');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isActive = (item: PanelItem): boolean => {
    if (!item.href) return false;
    const [path, query] = item.href.split(/[?#]/);
    if (pathname !== path) return false;
    if (item.href.includes('#')) return false;
    return (item.view ?? null) === (query ? view : path === '/meds' ? view : null);
  };

  const toggleExpand = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div
      className={cn(
        // Abaixo de md o painel sai: trilho (64px) + painel (288px) nao cabem
        // num telefone, e o trilho sozinho ja navega.
        // Fechado, o painel vai a zero e sai de cena. Antes ele encolhia para
        // 64px e virava uma segunda fileira de ícones ao lado do trilho: duas
        // colunas iguais, nenhuma delas dizendo o que era. Quem reabre é o
        // próprio trilho.
        'hidden shrink-0 flex-col gap-4 overflow-hidden bg-black transition-[width,padding] duration-500 md:flex',
        collapsed ? 'w-0 p-0' : 'w-72 p-4',
      )}
      style={{ transitionTimingFunction: SPRING }}
      aria-hidden={collapsed}
      inert={collapsed}
    >
      <PanelHeader title={section.title} onToggle={onToggleCollapse} />

      <SearchTrigger />

      <div className="flex w-full flex-1 flex-col gap-4 overflow-y-auto">
        {section.groups.map((group) => (
          <div key={group.title} className="flex w-full flex-col gap-0.5">
            <p className="flex h-8 items-center px-3 text-neutral-500 text-xs">{group.title}</p>

            {group.items.map((item) => {
              const key = `${group.title}-${item.id}`;
              return (
                <div key={key} className="flex w-full flex-col">
                  <PanelRow
                    item={item}
                    isActive={isActive(item)}
                    counts={counts}
                    expanded={expanded.has(key)}
                    onToggleExpand={() => toggleExpand(key)}
                  />

                  {expanded.has(key) && item.children ? (
                    <div className="mb-1 flex flex-col">
                      {item.children.map((child) => (
                        <PanelRow
                          key={`${key}-${child.id}`}
                          item={child}
                          isActive={isActive(child)}
                          counts={counts}
                          expanded={false}
                          onToggleExpand={() => undefined}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <NavUserMenu organization={organization} demoMode={demoMode} />
    </div>
  );
}

/* -------------------------------- Shell ---------------------------------- */

export function TwoLevelSidebar({
  counts,
  organization,
  demoMode,
  defaultCollapsed,
}: {
  counts: NavCounts;
  organization: string;
  demoMode: boolean;
  /** Com login ligado, o rodapé ganha "Sair". */
  defaultCollapsed: boolean;
}) {
  const pathname = usePathname();
  // A seção segue a rota, mas o clique no trilho manda enquanto durar a
  // navegação — dá para espiar outra área sem sair da página.
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const routeSection = sectionForPath(pathname);
  const active = RAIL_SECTIONS.find((section) => section.id === picked) ?? routeSection;

  return (
    <aside
      data-print-hide
      className="sticky top-0 flex h-svh shrink-0 self-start border-neutral-800 border-r"
    >
      <IconRail
        activeId={active.id}
        onSelect={setPicked}
        collapsed={collapsed}
        onExpand={() => setCollapsed(false)}
      />
      <SectionPanel
        section={active}
        collapsed={collapsed}
        counts={counts}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        organization={organization}
        demoMode={demoMode}
      />
    </aside>
  );
}
