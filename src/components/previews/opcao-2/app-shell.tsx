'use client';

import * as React from 'react';
import {
  AlarmClock,
  ChevronsUpDown,
  FileUp,
  Inbox,
  LayoutGrid,
  Menu,
  Plug,
  ReceiptText,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/fixtures';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  SidebarSection,
  SidebarToggle,
  useSidebar,
  type SidebarVariant,
} from './sidebar';
import { o2Vars } from './tokens';

const COMPROVANTE_HREF = '/preview/bulls/opcao-2/comprovante';

type NavId =
  | 'visao-geral'
  | 'contestacoes'
  | 'vencendo'
  | 'importar-meds'
  | 'importar-envios'
  | 'comprovantes'
  | 'conexoes'
  | 'equipe';

interface NavEntry {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  badge?: { value: number; tone: 'brand' | 'warning' };
  href?: string;
}

const iconProps = { className: 'size-[18px]', strokeWidth: 1.75 } as const;

const SECTIONS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Operação',
    items: [
      { id: 'visao-geral', label: 'Visão geral', icon: <LayoutGrid {...iconProps} /> },
      { id: 'contestacoes', label: 'Contestações', icon: <Inbox {...iconProps} />, badge: { value: RESUMO.emAberto, tone: 'brand' } },
      { id: 'vencendo', label: 'Vencendo', icon: <AlarmClock {...iconProps} />, badge: { value: RESUMO.vencendo24h, tone: 'warning' } },
    ],
  },
  {
    label: 'Dados',
    items: [
      { id: 'importar-meds', label: 'Importar MEDs', icon: <FileUp {...iconProps} /> },
      { id: 'importar-envios', label: 'Importar envios', icon: <Truck {...iconProps} /> },
      { id: 'comprovantes', label: 'Comprovantes', icon: <ReceiptText {...iconProps} />, href: COMPROVANTE_HREF },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { id: 'conexoes', label: 'Conexões', icon: <Plug {...iconProps} /> },
      { id: 'equipe', label: 'Equipe', icon: <Users {...iconProps} /> },
    ],
  },
];

function CountBadge({ value, tone }: { value: number; tone: 'brand' | 'warning' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-[11px] leading-none font-semibold tabular-nums',
        tone === 'warning'
          ? 'bg-[var(--o2-warning-soft)] text-[var(--o2-warning-ink)]'
          : 'bg-[var(--o2-neutral-soft)] text-[var(--o2-ink-2)]',
      )}
    >
      {value}
    </span>
  );
}

function ProductMark() {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[var(--o2-lilac)] via-[var(--o2-brand)] to-[var(--o2-brand-deep)] text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.7)]">
        <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-tight font-bold tracking-tight text-foreground">Defesa MED</p>
          <p className="truncate text-[12px] leading-tight text-[var(--o2-ink-3)]">Console de contestações</p>
        </div>
      )}
    </div>
  );
}

function AccountSwitcher() {
  const { collapsed } = useSidebar();
  return (
    <button
      type="button"
      aria-label="Conta ativa: Bulls Cash. Trocar de conta"
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-[var(--o2-line)] bg-[var(--o2-bg-2)] p-2 text-left outline-none',
        'transition-colors hover:border-[var(--o2-line-strong)] hover:bg-[var(--o2-brand-wash)] focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'w-auto justify-center border-transparent bg-transparent p-1',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--o2-ink)] text-[12px] font-bold tracking-wide text-white">
        BC
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] leading-tight font-semibold text-foreground">Bulls Cash</span>
            <span className="block truncate text-[12px] leading-tight text-[var(--o2-ink-3)]">Conta ativa</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-[var(--o2-ink-3)]" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

function NavTree({
  variant,
  active,
  onSelect,
  className,
}: {
  variant: SidebarVariant;
  active: NavId;
  onSelect: (id: NavId) => void;
  className?: string;
}) {
  return (
    <Sidebar variant={variant} className={className}>
      <SidebarHeader>
        <ProductMark />
        <SidebarToggle className="ml-auto" />
      </SidebarHeader>
      <SidebarNav>
        {SECTIONS.map((section) => (
          <SidebarSection key={section.label} label={section.label}>
            {section.items.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                active={active === item.id}
                href={item.href}
                badge={item.badge ? <CountBadge value={item.badge.value} tone={item.badge.tone} /> : undefined}
                onClick={() => onSelect(item.id)}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarSection>
        ))}
      </SidebarNav>
      <SidebarFooter>
        <AccountSwitcher />
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<NavId>('visao-geral');

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop: barra flutuante, recolhível até virar trilho de ícones. */}
      <aside className="sticky top-0 hidden h-screen shrink-0 p-3 pr-0 md:block">
        <NavTree
          variant="collapsible"
          active={active}
          onSelect={setActive}
          className="rounded-[28px] border border-[var(--o2-line)] bg-card shadow-[var(--o2-shadow)]"
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: barra superior com gaveta. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--o2-line)] bg-[var(--o2-bg)]/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--o2-lilac)] via-[var(--o2-brand)] to-[var(--o2-brand-deep)] text-white">
              <ShieldCheck className="size-4" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-bold tracking-tight">Defesa MED</p>
              <p className="text-[11.5px] text-[var(--o2-ink-3)]">Bulls Cash</p>
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className="flex size-10 items-center justify-center rounded-2xl border border-[var(--o2-line)] bg-card text-[var(--o2-ink-2)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              style={o2Vars}
              className="w-[300px] gap-0 border-[var(--o2-line)] bg-card p-0 font-sans text-foreground"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navegação do console da Bulls Cash</SheetDescription>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  className="absolute top-5 right-4 z-10 flex size-8 items-center justify-center rounded-xl text-[var(--o2-ink-3)] hover:bg-[var(--o2-brand-wash)]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </SheetClose>
              <NavTree variant="default" active={active} onSelect={setActive} className="h-full w-full!" />
            </SheetContent>
          </Sheet>
        </div>

        <main className="min-w-0 flex-1 px-4 pt-5 pb-12 sm:px-6 md:px-8 md:pt-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
