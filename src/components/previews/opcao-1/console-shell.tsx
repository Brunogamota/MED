'use client';

/**
 * Shell do console — adaptado de 21st.dev #14941 "Dashboard Sidebar".
 *
 * Mantém a estrutura do original (seletor de conta no topo, grupos com
 * cabeçalho, item com filhos recolhíveis, rodapé fixo, trilho recolhível) e
 * troca as `div` clicáveis por botões e links reais. Abaixo de `lg` o trilho
 * some e a mesma navegação abre numa folha lateral.
 */

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Receipt,
  ShieldAlert,
  Timer,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RESUMO } from '@/components/previews/fixtures';
import { O1_SCOPE } from './theme';

const BASE = '/preview/bulls/opcao-1';

type NavItemData = {
  id: string;
  title: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
  tone?: 'warning';
  children?: NavItemData[];
};

type NavGroupData = { heading?: string; items: NavItemData[] };

const NAV_GROUPS: NavGroupData[] = [
  {
    items: [{ id: 'visao-geral', title: 'Visão geral', icon: LayoutDashboard, href: BASE }],
  },
  {
    heading: 'Operação',
    items: [
      {
        id: 'contestacoes',
        title: 'Contestações',
        icon: ShieldAlert,
        href: `${BASE}#fila`,
        badge: RESUMO.emAberto,
        children: [
          { id: 'vencendo', title: 'Vencendo', icon: Timer, href: `${BASE}#vencendo`, badge: RESUMO.vencendo24h, tone: 'warning' },
          { id: 'comprovantes', title: 'Comprovantes', icon: Receipt, href: `${BASE}/comprovante` },
        ],
      },
    ],
  },
  {
    heading: 'Importação',
    items: [
      { id: 'importar-meds', title: 'Importar MEDs', icon: FileUp },
      { id: 'importar-envios', title: 'Importar envios', icon: Truck },
    ],
  },
  {
    heading: 'Configuração',
    items: [
      { id: 'conexoes', title: 'Conexões', icon: Plug },
      { id: 'equipe', title: 'Equipe', icon: Users },
    ],
  },
];

function findTitle(id: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === id) return item.title;
      const child = item.children?.find((c) => c.id === id);
      if (child) return child.title;
    }
  }
  return 'Visão geral';
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-(--o1-violet) text-[13px] font-semibold text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset,0_6px_16px_-6px_rgb(168_85_247/0.7)]',
        className,
      )}
    >
      B
    </span>
  );
}

function AccountSwitcher({ collapsed }: { collapsed: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Trocar de conta. Conta atual: Bulls Cash"
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring/60',
            collapsed && 'justify-center',
          )}
        >
          <BrandMark />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold leading-tight text-foreground">Bulls Cash</span>
                <span className="truncate text-[11px] leading-tight text-muted-foreground">Defesa de MED</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" strokeWidth={1.5} />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn(O1_SCOPE, 'w-56 border border-border/70')}>
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Contas</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2.5 py-1.5">
          <BrandMark className="size-6 rounded-md text-[11px]" />
          <span className="flex-1 text-[13px]">Bulls Cash</span>
          <Check className="size-4 text-primary" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CountBadge({ value, tone, active }: { value: number; tone?: 'warning'; active?: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] font-medium tabular-nums',
        tone === 'warning'
          ? 'bg-(--o1-warning)/12 text-(--o1-warning)'
          : active
            ? 'bg-primary/20 text-(--o1-lilac)'
            : 'bg-white/[0.06] text-(--o1-text-2)',
      )}
    >
      {value}
    </span>
  );
}

const ROW =
  'group relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60';

function NavRow({
  item,
  activeId,
  onSelect,
  collapsed,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  level?: number;
}) {
  const [open, setOpen] = useState(true);
  const isActive = activeId === item.id;
  const hasChildren = !!item.children?.length && !collapsed;
  const Icon = item.icon;

  const rowClass = cn(
    ROW,
    collapsed && 'justify-center px-0',
    isActive
      ? 'bg-white/[0.07] font-medium text-foreground'
      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-(--o1-text-2)',
  );

  const content = (
    <>
      {isActive && (
        <motion.span
          layoutId="o1-nav-active"
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <Icon
        className={cn('size-4 shrink-0 transition-colors', isActive ? 'text-(--o1-lilac)' : 'text-muted-foreground/80 group-hover:text-(--o1-text-2)')}
        strokeWidth={1.6}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
      {!collapsed && item.badge !== undefined && <CountBadge value={item.badge} tone={item.tone} active={isActive} />}
      {collapsed && item.badge !== undefined && (
        <span aria-hidden="true" className={cn('absolute top-1.5 right-2 size-1.5 rounded-full', item.tone === 'warning' ? 'bg-(--o1-warning)' : 'bg-primary')} />
      )}
    </>
  );

  const label = item.badge !== undefined ? `${item.title}, ${item.badge}` : item.title;

  const row = item.href ? (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={() => onSelect(item.id)}
      className={rowClass}
      style={!collapsed ? { paddingLeft: level * 14 + 10 } : undefined}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={() => onSelect(item.id)}
      className={rowClass}
      style={!collapsed ? { paddingLeft: level * 14 + 10 } : undefined}
    >
      {content}
    </button>
  );

  return (
    <li className="flex flex-col">
      <div className="relative flex items-center">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className={O1_SCOPE}>
              {label}
            </TooltipContent>
          </Tooltip>
        ) : (
          row
        )}
        {hasChildren && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Recolher ${item.title}` : `Expandir ${item.title}`}
            onClick={() => setOpen((v) => !v)}
            className="absolute right-[38px] flex size-5 items-center justify-center rounded text-muted-foreground/60 outline-none hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ChevronRight className={cn('size-3.5 transition-transform duration-200', open && 'rotate-90')} strokeWidth={2} />
          </button>
        )}
      </div>
      {hasChildren && (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <ul className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden" aria-label={`Seções de ${item.title}`} inert={!open}>
            <span aria-hidden="true" className="absolute top-0 bottom-0 border-l border-white/[0.06]" style={{ left: level * 14 + 17.5 }} />
            {item.children!.map((child) => (
              <NavRow key={child.id} item={child} activeId={activeId} onSelect={onSelect} collapsed={collapsed} level={level + 1} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function SidebarNav({
  activeId,
  onSelect,
  collapsed = false,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <AccountSwitcher collapsed={collapsed} />
      <nav aria-label="Navegação do console" className="-mx-1 mt-3 flex flex-1 flex-col gap-5 overflow-y-auto px-1 [scrollbar-width:none]">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.heading ?? i} className="flex flex-col gap-0.5">
            {group.heading &&
              (collapsed ? (
                <span aria-hidden="true" className="mx-auto mb-1 h-px w-5 bg-white/[0.08]" />
              ) : (
                <span className="mb-1 px-2.5 text-[10.5px] font-medium tracking-[0.08em] text-muted-foreground/60 uppercase">{group.heading}</span>
              ))}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavRow key={item.id} item={item} activeId={activeId} onSelect={onSelect} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] pt-2">
        <button
          type="button"
          aria-label={collapsed ? 'Sair' : undefined}
          className={cn(ROW, 'text-muted-foreground hover:bg-white/[0.04] hover:text-(--o1-text-2)', collapsed && 'justify-center px-0')}
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.6} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}

export function ConsoleShell({
  initialActive = 'visao-geral',
  actions,
  children,
}: {
  initialActive?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState(initialActive);

  const select = (id: string) => {
    setActiveId(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar lg:block"
      >
        <SidebarNav activeId={activeId} onSelect={select} collapsed={collapsed} />
      </motion.aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className={cn(O1_SCOPE, 'w-[272px] max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0')}>
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SheetDescription className="sr-only">Seções do console da Bulls Cash</SheetDescription>
          <SidebarNav activeId={activeId} onSelect={select} />
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-[18px] -right-11 bg-sidebar text-foreground ring-1 ring-white/10" aria-label="Fechar navegação">
              <X />
            </Button>
          </SheetClose>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground lg:hidden"
            aria-label="Abrir navegação"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground lg:inline-flex"
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <PanelLeftOpen strokeWidth={1.6} /> : <PanelLeftClose strokeWidth={1.6} />}
          </Button>
          <nav aria-label="Trilha" className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="hidden text-muted-foreground sm:inline">Bulls Cash</span>
            <span aria-hidden="true" className="hidden text-muted-foreground/40 sm:inline">/</span>
            <span className="truncate font-medium text-foreground">{findTitle(activeId)}</span>
          </nav>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
