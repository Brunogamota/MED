'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlarmClock,
  ArrowLeftRight,
  Check,
  ChevronsUpDown,
  FileUp,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Plug,
  ReceiptText,
  Search,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { SearchTrigger } from '@/components/layout/search-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { switchAccountAction } from '@/app/(console)/contas/actions';
import { signOutAction } from '@/app/login/actions';
import { bullsInitials } from '@/components/skins/bulls/parts';
import { activeNavFor, type NavId } from '@/components/skins/nav';
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

/* ==========================================================================
   Ambiente Bulls Cash — "Bento Claro"

   Barra lateral flutuante e recolhível (vira trilho de ícones no desktop),
   barra superior com gaveta no celular. Toda contagem vem do layout, que lê
   os MEDs da conta: nada aqui é número de exemplo.
   ========================================================================== */

export interface BullsCounts {
  open: number;
  dueSoon: number;
  hasUrgent: boolean;
  submitted: number;
}

export interface BullsAccount {
  id: string;
  name: string;
  active: boolean;
}

interface NavEntry {
  id: NavId;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: { value: number; tone: 'brand' | 'warning' };
}

const iconProps = { className: 'size-[18px]', strokeWidth: 1.75, 'aria-hidden': true } as const;

function sections(counts: BullsCounts): { label: string; items: NavEntry[] }[] {
  return [
    {
      label: 'Operação',
      items: [
        { id: 'visao-geral', label: 'Visão geral', href: '/', icon: <LayoutGrid {...iconProps} /> },
        {
          id: 'contestacoes',
          label: 'Contestações',
          href: '/meds',
          icon: <Inbox {...iconProps} />,
          badge: counts.open > 0 ? { value: counts.open, tone: 'brand' } : undefined,
        },
        {
          id: 'vencendo',
          label: 'Vencendo',
          href: '/meds?view=vencendo',
          icon: <AlarmClock {...iconProps} />,
          badge: counts.dueSoon > 0 ? { value: counts.dueSoon, tone: 'warning' } : undefined,
        },
      ],
    },
    {
      label: 'Dados',
      items: [
        { id: 'importar-meds', label: 'Importar MEDs', href: '/meds/import', icon: <FileUp {...iconProps} /> },
        { id: 'importar-envios', label: 'Importar envios', href: '/meds/entregas', icon: <Truck {...iconProps} /> },
        { id: 'comprovantes', label: 'Comprovantes', href: '/meds/comprovantes/gerados', icon: <ReceiptText {...iconProps} /> },
      ],
    },
    {
      label: 'Ajustes',
      items: [
        { id: 'conexoes', label: 'Conexões', href: '/integracoes', icon: <Plug {...iconProps} /> },
        { id: 'equipe', label: 'Equipe', href: '/equipe', icon: <Users {...iconProps} /> },
      ],
    },
  ];
}

function CountBadge({ value, tone }: { value: number; tone: 'brand' | 'warning' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-[11px] leading-none font-semibold tabular-nums',
        tone === 'warning' ? 'bg-bulls-warning-soft text-bulls-warning-ink' : 'bg-bulls-neutral-soft text-bulls-ink-2',
      )}
    >
      {value}
    </span>
  );
}

function ProductMark({ size = 'default' }: { size?: 'default' | 'sm' }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br from-bulls-lilac via-bulls-brand to-bulls-brand-deep text-bulls-on-brand shadow-bulls-brand',
        size === 'sm' ? 'size-8 rounded-[10px]' : 'size-9 rounded-[12px]',
      )}
    >
      <ShieldCheck className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2} aria-hidden="true" />
    </div>
  );
}

function Brand() {
  const { collapsed } = useSidebar();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ProductMark />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-tight font-bold tracking-tight text-foreground">Defesa MED</p>
          <p className="truncate text-[12px] leading-tight text-bulls-ink-3">Console de MED</p>
        </div>
      )}
    </Link>
  );
}

function SearchButton() {
  const { collapsed } = useSidebar();
  return (
    <SearchTrigger
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          aria-label="Buscar MED ou tela"
          title={collapsed ? 'Buscar (⌘K)' : undefined}
          className={cn(
            'flex h-10 items-center gap-2.5 rounded-2xl border border-bulls-line bg-bulls-bg-2 text-[13px] text-bulls-ink-3 outline-none',
            'transition-colors hover:border-bulls-line-strong hover:bg-bulls-brand-wash hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            collapsed ? 'mx-auto w-10 justify-center' : 'mx-3 w-[calc(100%-1.5rem)] px-3',
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">Buscar MED ou CPF</span>
              <kbd className="rounded-md border border-bulls-line bg-card px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-bulls-ink-3">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      )}
    />
  );
}

function AccountSwitcher({ accounts, demoMode }: { accounts: BullsAccount[]; demoMode: boolean }) {
  const { collapsed } = useSidebar();
  const current = accounts.find((account) => account.active);
  const [pending, startTransition] = React.useTransition();
  const name = current?.name ?? '';

  const switchTo = (id: string) => {
    const form = new FormData();
    form.set('conta', id);
    startTransition(async () => {
      await switchAccountAction(form);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Conta ativa: ${name}. Trocar de conta`}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl border border-bulls-line bg-bulls-bg-2 p-2 text-left outline-none',
            'transition-colors hover:border-bulls-line-strong hover:bg-bulls-brand-wash focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'w-auto justify-center border-transparent bg-transparent p-1',
            pending && 'opacity-70',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-bulls-ink text-[12px] font-bold tracking-wide text-bulls-on-brand">
            {bullsInitials(name)}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] leading-tight font-semibold text-foreground">{name}</span>
                <span className="block truncate text-[12px] leading-tight text-bulls-ink-3">
                  {pending ? 'Trocando…' : demoMode ? 'Conta ativa · modo demo' : 'Conta ativa'}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-bulls-ink-3" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-semibold tracking-[0.08em] text-bulls-ink-3 uppercase">
          Trocar de conta
        </DropdownMenuLabel>
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            disabled={account.active || pending}
            onSelect={() => switchTo(account.id)}
            className="gap-2.5 py-2 data-disabled:opacity-100"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-bulls-brand-soft text-[11px] font-bold text-bulls-brand-deep">
              {bullsInitials(account.name)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
            {account.active ? <Check className="size-4 text-bulls-brand-strong" aria-label="em uso" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2.5 py-2">
          <Link href="/contas">
            <ArrowLeftRight className="size-4" aria-hidden="true" />
            Gerenciar contas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2.5 py-2"
          onSelect={() => {
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ShellData {
  accounts: BullsAccount[];
  counts: BullsCounts;
  demoMode: boolean;
}

function NavTree({
  variant,
  active,
  data,
  onNavigate,
  className,
}: {
  variant: SidebarVariant;
  active: NavId | null;
  data: ShellData;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Sidebar variant={variant} className={className}>
      <SidebarHeader>
        <Brand />
        <SidebarToggle className="ml-auto" />
      </SidebarHeader>
      <div className="pb-2">
        <SearchButton />
      </div>
      <SidebarNav onClick={onNavigate}>
        {sections(data.counts).map((section) => (
          <SidebarSection key={section.label} label={section.label}>
            {section.items.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                active={active === item.id}
                href={item.href}
                badge={item.badge ? <CountBadge value={item.badge.value} tone={item.badge.tone} /> : undefined}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarSection>
        ))}
      </SidebarNav>
      <SidebarFooter>
        <AccountSwitcher accounts={data.accounts} demoMode={data.demoMode} />
      </SidebarFooter>
    </Sidebar>
  );
}

/** A visão da fila (`?view=`) decide entre Contestações e Vencendo. */
function useActiveNav(): NavId | null {
  const pathname = usePathname() ?? '/';
  const view = useSearchParams().get('view');
  return activeNavFor(pathname, view);
}

function DesktopNav({ data }: { data: ShellData }) {
  const active = useActiveNav();
  return <NavTree variant="collapsible" active={active} data={data} className={DESKTOP_CLASS} />;
}

function PathOnlyDesktopNav({ data }: { data: ShellData }) {
  const pathname = usePathname() ?? '/';
  return <NavTree variant="collapsible" active={activeNavFor(pathname, null)} data={data} className={DESKTOP_CLASS} />;
}

const DESKTOP_CLASS = 'rounded-[28px] border border-bulls-line bg-card shadow-bulls';

function MobileNav({ data, accountName }: { data: ShellData; accountName: string }) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = React.useState(false);
  return (
    <div
      data-print-hide
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-bulls-line bg-bulls-bg/90 px-4 py-3 backdrop-blur md:hidden"
    >
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <ProductMark size="sm" />
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-bold tracking-tight">Defesa MED</p>
          <p className="truncate text-[11.5px] text-bulls-ink-3">{accountName}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <SearchTrigger
          trigger={(openSearch) => (
            <button
              type="button"
              onClick={openSearch}
              aria-label="Buscar"
              className="flex size-10 items-center justify-center rounded-2xl border border-bulls-line bg-card text-bulls-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-[18px]" aria-hidden="true" />
            </button>
          )}
        />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu"
              className="flex size-10 items-center justify-center rounded-2xl border border-bulls-line bg-card text-bulls-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[300px] gap-0 border-bulls-line bg-card p-0 font-sans text-foreground"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navegação do console</SheetDescription>
            <SheetClose asChild>
              <button
                type="button"
                aria-label="Fechar menu"
                className="absolute top-5 right-4 z-10 flex size-8 items-center justify-center rounded-xl text-bulls-ink-3 hover:bg-bulls-brand-wash"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </SheetClose>
            <React.Suspense
              fallback={
                <NavTree variant="default" active={activeNavFor(pathname, null)} data={data} className="h-full w-full!" />
              }
            >
              <MobileNavTree data={data} onNavigate={() => setOpen(false)} />
            </React.Suspense>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function MobileNavTree({ data, onNavigate }: { data: ShellData; onNavigate: () => void }) {
  const active = useActiveNav();
  return (
    <NavTree
      variant="default"
      active={active}
      data={data}
      className="h-full w-full!"
      onNavigate={() => onNavigate()}
    />
  );
}

export function BullsShell({
  accountName,
  accounts,
  counts,
  demoMode,
  children,
}: {
  accountName: string;
  accounts: BullsAccount[];
  counts: BullsCounts;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const data: ShellData = { accounts, counts, demoMode };
  return (
    <div className="flex min-h-svh w-full bg-bulls-bg">
      {/* Desktop: barra flutuante, recolhível até virar trilho de ícones. */}
      <aside data-print-hide className="sticky top-0 hidden h-svh shrink-0 p-3 pr-0 md:block">
        {/* A barra lê `?view=`, e useSearchParams exige limite de Suspense. */}
        <React.Suspense fallback={<PathOnlyDesktopNav data={data} />}>
          <DesktopNav data={data} />
        </React.Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav data={data} accountName={accountName} />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-16 sm:px-6 md:px-8 md:pt-8 lg:px-10 print:p-0">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
