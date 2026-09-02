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
}: {
  activeId: string;
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
              onClick={() => onSelect(section.id)}
            >
              <Icon size={16} />
            </RailButton>
          );
        })}
      </div>

      <div className="flex-1" />
    </nav>
  );
}

/* -------------------------------- Painel --------------------------------- */

function PanelHeader({
  title,
  collapsed,
  onToggle,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expandir o painel' : 'Recolher o painel'}
      className="flex size-10 min-w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-500 hover:bg-neutral-800 hover:text-neutral-200"
      style={{ transitionTimingFunction: SPRING }}
    >
      {/* A seta aponta para onde o painel vai: esquerda recolhe, direita abre. */}
      <ChevronDown size={16} className={collapsed ? '-rotate-90' : 'rotate-90'} />
    </button>
  );

  if (collapsed) return <div className="flex w-full justify-center">{toggle}</div>;

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
  collapsed,
  counts,
  expanded,
  onToggleExpand,
}: {
  item: PanelItem;
  isActive: boolean;
  collapsed: boolean;
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

      <span
        className={cn(
          'flex-1 truncate text-left text-sm transition-opacity duration-500',
          collapsed ? 'w-0 opacity-0' : 'ml-3 opacity-100',
        )}
        style={{ transitionTimingFunction: SPRING }}
      >
        {item.label}
      </span>

      {!collapsed && !item.href ? <SoonBadge /> : null}
      {!collapsed && item.href && count > 0 ? (
        <CountBadge value={count} urgent={Boolean(item.countUrgent) && counts.hasUrgent} />
      ) : null}
      {!collapsed && hasChildren ? (
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
    'flex h-10 items-center rounded-lg transition-colors duration-500',
    collapsed ? 'w-10 min-w-10 justify-center' : 'w-full px-3',
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
        title={collapsed ? item.label : undefined}
        aria-expanded={expanded}
      >
        {body}
      </button>
    );
  }

  if (!item.href) {
    return (
      <span className={className} title={collapsed ? item.label : undefined}>
        {body}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      style={{ transitionTimingFunction: SPRING }}
      title={collapsed ? item.label : undefined}
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
        'hidden shrink-0 flex-col gap-4 bg-black p-4 transition-[width] duration-500 md:flex',
        collapsed ? 'w-16 items-center px-2' : 'w-72',
      )}
      style={{ transitionTimingFunction: SPRING }}
    >
      <PanelHeader title={section.title} collapsed={collapsed} onToggle={onToggleCollapse} />

      <SearchTrigger collapsed={collapsed} />

      <div
        className={cn(
          'flex w-full flex-1 flex-col overflow-y-auto',
          collapsed ? 'items-center gap-2' : 'gap-4',
        )}
      >
        {section.groups.map((group) => (
          <div key={group.title} className="flex w-full flex-col gap-0.5">
            {!collapsed ? (
              <p className="flex h-8 items-center px-3 text-neutral-500 text-xs">{group.title}</p>
            ) : null}

            {group.items.map((item) => {
              const key = `${group.title}-${item.id}`;
              return (
                <div key={key} className="flex w-full flex-col">
                  <PanelRow
                    item={item}
                    isActive={isActive(item)}
                    collapsed={collapsed}
                    counts={counts}
                    expanded={expanded.has(key)}
                    onToggleExpand={() => toggleExpand(key)}
                  />

                  {expanded.has(key) && item.children && !collapsed ? (
                    <div className="mb-1 flex flex-col">
                      {item.children.map((child) => (
                        <PanelRow
                          key={`${key}-${child.id}`}
                          item={child}
                          isActive={isActive(child)}
                          collapsed={false}
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

      <NavUserMenu
        organization={organization}
        demoMode={demoMode}
        collapsed={collapsed}
      />
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
      <IconRail activeId={active.id} onSelect={setPicked} />
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
