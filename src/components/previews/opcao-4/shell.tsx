'use client';

import {
  ChevronsUpDown,
  FileCheck2,
  FolderInput,
  LayoutDashboard,
  PanelLeft,
  Plug,
  Scale,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { RESUMO } from '@/components/previews/fixtures';
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
} from './animated-sidebar';

interface NavLeaf {
  label: string;
  badge?: number;
}
interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  children?: NavLeaf[];
}

const OPERACAO: NavItem[] = [
  { label: 'Visão geral', icon: LayoutDashboard },
  {
    label: 'Contestações',
    icon: Scale,
    badge: RESUMO.emAberto,
    children: [
      { label: 'Vencendo', badge: RESUMO.vencendo24h },
      { label: 'Prontos', badge: RESUMO.prontos },
      { label: 'Sem evidência', badge: RESUMO.semEvidencia },
      { label: 'Enviados' },
    ],
  },
  { label: 'Importar', icon: FolderInput, children: [{ label: 'MEDs' }, { label: 'Envios' }] },
  { label: 'Comprovantes', icon: FileCheck2 },
];

const CONTA: NavItem[] = [
  { label: 'Conexões', icon: Plug },
  { label: 'Equipe', icon: Users },
];

function Marca() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-md bg-(--o4-brand-strong) font-mono text-[11px] font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]"
    >
      BC
    </span>
  );
}

function NavGroup({
  items,
  active,
  setActive,
  openSection,
  setOpenSection,
}: {
  items: NavItem[];
  active: string;
  setActive: (v: string) => void;
  openSection: string | null;
  setOpenSection: (v: string | null) => void;
}) {
  return (
    <AnimatedSidebarMenu>
      {items.map(({ label, icon: Icon, badge, children }) => (
        <AnimatedSidebarMenuItem key={label}>
          <AnimatedSidebarMenuButton
            label={label}
            isActive={active === label || children?.some((c) => `${label}/${c.label}` === active) === true}
            ariaExpanded={children ? openSection === label : undefined}
            badge={badge}
            icon={<Icon className="size-4" strokeWidth={1.75} />}
            onSelect={() => {
              if (!children) {
                setActive(label);
                return;
              }
              setOpenSection(openSection === label ? null : label);
            }}
          >
            {label}
          </AnimatedSidebarMenuButton>
          {children ? (
            <AnimatedSidebarMenuSub open={openSection === label}>
              {children.map((child) => (
                <AnimatedSidebarMenuSubItem key={child.label}>
                  <AnimatedSidebarMenuSubButton
                    badge={child.badge}
                    isActive={active === `${label}/${child.label}`}
                    onSelect={() => setActive(`${label}/${child.label}`)}
                  >
                    {child.label}
                  </AnimatedSidebarMenuSubButton>
                </AnimatedSidebarMenuSubItem>
              ))}
            </AnimatedSidebarMenuSub>
          ) : null}
        </AnimatedSidebarMenuItem>
      ))}
    </AnimatedSidebarMenu>
  );
}

function AtalhoRecolher() {
  const { state } = useAnimatedSidebar();
  if (state === 'collapsed') return null;
  return (
    <p className="hidden px-2 py-1 text-[11px] text-(--o4-subtle) md:block">
      <kbd className="rounded-[4px] border border-border bg-(--o4-raised) px-1 font-mono text-[10px] text-muted-foreground">
        Ctrl B
      </kbd>{' '}
      recolhe o menu
    </p>
  );
}

export function O4Shell({ children, breadcrumb }: { children: ReactNode; breadcrumb: string }) {
  const [active, setActive] = useState('Visão geral');
  const [openSection, setOpenSection] = useState<string | null>('Contestações');

  return (
    <AnimatedSidebarProvider>
      <AnimatedSidebar ariaLabel="Navegação Bulls Cash" collapsible="icon">
        <AnimatedSidebarHeader className="h-12 justify-center border-b border-border py-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              type="button"
              aria-label="Trocar de conta — conta atual: Bulls Cash"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-0.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Marca />
              <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
                <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">Bulls Cash</span>
                <span className="block truncate text-[11px] leading-4 text-(--o4-subtle)">Defesa de MED</span>
              </span>
              <ChevronsUpDown
                aria-hidden="true"
                className="size-3.5 shrink-0 text-(--o4-subtle) group-data-[state=collapsed]/sidebar:hidden"
              />
            </button>
            <AnimatedSidebarClose className="text-muted-foreground hover:bg-accent md:hidden">
              <X aria-hidden="true" className="size-4" />
            </AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="pt-2">
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Operação</AnimatedSidebarGroupLabel>
            <NavGroup
              items={OPERACAO}
              active={active}
              setActive={setActive}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
          </AnimatedSidebarGroup>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Conta</AnimatedSidebarGroupLabel>
            <NavGroup
              items={CONTA}
              active={active}
              setActive={setActive}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter>
          <AtalhoRecolher />
        </AnimatedSidebarFooter>
        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset>
        <header
          data-print-hide
          className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-4"
        >
          <AnimatedSidebarTrigger className="text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <PanelLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </AnimatedSidebarTrigger>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <nav aria-label="Trilha" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <li className="hidden text-(--o4-subtle) sm:block">Bulls Cash</li>
              <li aria-hidden="true" className="hidden text-(--o4-subtle) sm:block">
                /
              </li>
              <li className="truncate font-medium text-foreground" aria-current="page">
                {breadcrumb}
              </li>
            </ol>
          </nav>
          <label className="relative hidden md:block">
            <span className="sr-only">Buscar por pagador ou end-to-end</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--o4-subtle)"
            />
            <input
              type="search"
              placeholder="Buscar pagador ou end-to-end"
              className="h-8 w-72 rounded-md border border-border bg-card pl-8 pr-12 text-[13px] text-foreground outline-none transition-colors placeholder:text-(--o4-subtle) hover:border-[color-mix(in_oklab,var(--border),white_8%)] focus-visible:border-(--o4-brand-strong) focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] border border-border bg-(--o4-raised) px-1 font-mono text-[10px] text-(--o4-subtle)">
              /
            </kbd>
          </label>
          <button
            type="button"
            aria-label="Buscar"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <Search aria-hidden="true" className="size-4" />
          </button>
        </header>
        {children}
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
