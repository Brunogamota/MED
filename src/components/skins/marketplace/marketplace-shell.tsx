'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronsUpDown,
  FileSpreadsheet,
  LogOut,
  MailCheck,
  Search,
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
import { switchAccountAction } from '@/app/(console)/contas/actions';
import { signOutAction } from '@/app/login/actions';
import { activeNavFor, type NavId } from '@/components/skins/nav';
import { BrandSeal } from './parts';

/* ==========================================================================
   Ambiente Marketplace Verificado — "Selo Azul"

   Sem barra lateral: marca e conta à esquerda, navegação horizontal com um
   menu "Importar", busca à direita. Abaixo de 1280px a navegação desce para
   uma faixa própria, rolável. Toda contagem vem do layout, que lê os MEDs da
   conta: nada aqui é número de exemplo.
   ========================================================================== */

export interface MarketplaceCounts {
  open: number;
  dueSoon: number;
  hasUrgent: boolean;
  submitted: number;
}

export interface MarketplaceAccount {
  id: string;
  name: string;
  active: boolean;
}

interface NavLink {
  id: NavId;
  label: string;
  href: string;
  count?: number;
  tone?: 'neutral' | 'warning';
}

const IMPORTAR: { id: NavId; label: string; description: string; href: string; icon: typeof FileSpreadsheet }[] = [
  {
    id: 'importar-meds',
    label: 'Importar MEDs',
    description: 'Arquivo da adquirente com as contestações recebidas.',
    href: '/meds/import',
    icon: FileSpreadsheet,
  },
  {
    id: 'importar-envios',
    label: 'Importar envios',
    description: 'Registros de e-mail enviados ao comprador, por pedido.',
    href: '/meds/entregas',
    icon: MailCheck,
  },
];

function linksBefore(counts: MarketplaceCounts): NavLink[] {
  return [
    { id: 'visao-geral', label: 'Visão geral', href: '/' },
    { id: 'contestacoes', label: 'Contestações', href: '/meds', count: counts.open },
    {
      id: 'vencendo',
      label: 'Vencendo',
      href: '/meds?view=vencendo',
      count: counts.dueSoon,
      tone: counts.hasUrgent ? 'warning' : 'neutral',
    },
  ];
}

const LINKS_AFTER: NavLink[] = [
  { id: 'comprovantes', label: 'Comprovantes', href: '/meds/comprovantes/gerados' },
  { id: 'conexoes', label: 'Conexões', href: '/integracoes' },
  { id: 'equipe', label: 'Equipe', href: '/equipe' },
];

const linkClass =
  'relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-medium whitespace-nowrap text-(--mkv-ink-2) transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[active=true]:text-foreground';

function Count({ value, tone = 'neutral' }: { value: number; tone?: NavLink['tone'] }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] leading-none font-medium tabular-nums',
        tone === 'warning'
          ? 'bg-(--mkv-warning-soft) text-(--mkv-warning-ink) ring-1 ring-(--mkv-warning)/25'
          : 'bg-secondary text-(--mkv-ink-2)',
      )}
    >
      {value.toLocaleString('pt-BR')}
    </span>
  );
}

function ActiveBar() {
  return (
    <motion.span
      layoutId="mkv-nav-active"
      aria-hidden="true"
      className="absolute inset-x-3 -bottom-[14px] h-[2px] rounded-full bg-primary"
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    />
  );
}

function NavItemLink({ link, active, compact }: { link: NavLink; active: boolean; compact: boolean }) {
  return (
    <li>
      <Link
        href={link.href}
        data-active={active}
        aria-current={active ? 'page' : undefined}
        className={cn(linkClass, compact && 'data-[active=true]:bg-accent data-[active=true]:text-primary')}
      >
        {link.label}
        {link.count !== undefined && link.count > 0 ? <Count value={link.count} tone={link.tone} /> : null}
        {active && !compact ? <ActiveBar /> : null}
      </Link>
    </li>
  );
}

function ImportarMenu({ active }: { active: NavId | null }) {
  const isActive = IMPORTAR.some((item) => item.id === active);
  return (
    <li>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" data-active={isActive} className={cn(linkClass, 'group data-[state=open]:bg-muted')}>
            Importar
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 text-(--mkv-ink-3) transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
            {isActive ? <ActiveBar /> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={10} className="w-[340px] p-1.5">
          {IMPORTAR.map((item) => (
            <DropdownMenuItem key={item.id} asChild className="items-start gap-3 rounded-[9px] p-2.5">
              <Link href={item.href}>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/10">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                  <span className="text-[12.5px] leading-snug text-(--mkv-ink-3)">{item.description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function NavList({
  active,
  counts,
  compact = false,
}: {
  active: NavId | null;
  counts: MarketplaceCounts;
  compact?: boolean;
}) {
  return (
    <ul className="flex items-center gap-0.5">
      {linksBefore(counts).map((link) => (
        <NavItemLink key={link.id} link={link} active={active === link.id} compact={compact} />
      ))}
      {compact ? (
        // Na faixa compacta o menu suspenso seria cortado pela rolagem: os
        // dois destinos viram links soltos.
        IMPORTAR.map((item) => (
          <NavItemLink
            key={item.id}
            link={{ id: item.id, label: item.label, href: item.href }}
            active={active === item.id}
            compact
          />
        ))
      ) : (
        <ImportarMenu active={active} />
      )}
      {LINKS_AFTER.map((link) => (
        <NavItemLink key={link.id} link={link} active={active === link.id} compact={compact} />
      ))}
    </ul>
  );
}

function AccountSwitcher({ accounts, demoMode }: { accounts: MarketplaceAccount[]; demoMode: boolean }) {
  const current = accounts.find((account) => account.active);
  const name = current?.name ?? '';
  const [pending, startTransition] = React.useTransition();

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
            'group flex min-w-0 items-center gap-2.5 rounded-[10px] py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40',
            pending && 'opacity-70',
          )}
        >
          <BrandSeal />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">{name}</span>
            <span className="truncate text-[11.5px] text-(--mkv-ink-3)">
              {pending ? 'Trocando…' : demoMode ? 'Defesa de MED · modo demo' : 'Defesa de MED'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-(--mkv-ink-3) group-hover:text-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-medium tracking-wide text-(--mkv-ink-3) uppercase">
          Trocar de conta
        </DropdownMenuLabel>
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            disabled={account.active || pending}
            onSelect={() => switchTo(account.id)}
            className="gap-2.5 py-2 data-disabled:opacity-100"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
            {account.active ? <Check className="size-4 text-primary" aria-label="em uso" /> : null}
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

function SearchBox() {
  return (
    <SearchTrigger
      trigger={(open) => (
        <>
          <button
            type="button"
            onClick={open}
            aria-label="Buscar MED, pagador ou CPF"
            className="hidden h-9 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-muted/70 px-2.5 text-left text-[13px] text-(--mkv-ink-3) transition-colors outline-none hover:border-input hover:bg-card focus-visible:ring-3 focus-visible:ring-primary/15 md:flex"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">Buscar MED, pagador ou CPF</span>
            <kbd className="rounded border border-border bg-card px-1.5 font-mono text-[10.5px] text-(--mkv-ink-3)">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={open}
            aria-label="Buscar"
            className="inline-flex size-9 items-center justify-center rounded-[9px] border border-border bg-card text-(--mkv-ink-2) outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 md:hidden"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
    />
  );
}

interface ShellData {
  accounts: MarketplaceAccount[];
  counts: MarketplaceCounts;
  demoMode: boolean;
}

function TopBar({ active, data }: { active: NavId | null; data: ShellData }) {
  return (
    <header data-print-hide className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <AccountSwitcher accounts={data.accounts} demoMode={data.demoMode} />
        <span aria-hidden="true" className="hidden h-6 w-px bg-border xl:block" />
        <nav aria-label="Principal" className="relative hidden min-w-0 flex-1 xl:block">
          <NavList active={active} counts={data.counts} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox />
        </div>
      </div>
      <nav
        aria-label="Principal (compacta)"
        className="mx-auto max-w-[1440px] overflow-x-auto px-2 pb-2.5 [scrollbar-width:none] sm:px-4 xl:hidden"
      >
        <NavList active={active} counts={data.counts} compact />
      </nav>
    </header>
  );
}

/** A visão da fila (`?view=`) decide entre Contestações e Vencendo. */
function TopBarWithView({ data }: { data: ShellData }) {
  const pathname = usePathname() ?? '/';
  const view = useSearchParams().get('view');
  return <TopBar active={activeNavFor(pathname, view)} data={data} />;
}

function TopBarPathOnly({ data }: { data: ShellData }) {
  const pathname = usePathname() ?? '/';
  return <TopBar active={activeNavFor(pathname, null)} data={data} />;
}

export function MarketplaceShell({
  accounts,
  counts,
  demoMode,
  children,
}: {
  accounts: MarketplaceAccount[];
  counts: MarketplaceCounts;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const data: ShellData = { accounts, counts, demoMode };
  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      {/* A barra lê `?view=`, e useSearchParams exige limite de Suspense. */}
      <React.Suspense fallback={<TopBarPathOnly data={data} />}>
        <TopBarWithView data={data} />
      </React.Suspense>
      <main className="min-w-0 flex-1 px-4 pt-6 pb-16 sm:px-6 md:pt-8 lg:px-8 print:p-0">
        <div className="mx-auto w-full max-w-[1376px]">{children}</div>
      </main>
    </div>
  );
}
