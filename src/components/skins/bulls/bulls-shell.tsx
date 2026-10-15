'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Suspense, useSyncExternalStore, type ReactNode } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  CircleGauge,
  FileStack,
  FolderInput,
  LogOut,
  MoonStar,
  PackageCheck,
  Plug,
  Search,
  SunMedium,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { BullsMark } from '@/components/skins/bulls/bulls-mark';
import { SearchTrigger } from '@/components/layout/search-dialog';
import { switchAccountAction } from '@/app/(console)/contas/actions';
import { signOutAction } from '@/app/login/actions';

/* ==========================================================================
   Ambiente Bulls Cash

   Nada aqui vem do ambiente Jade. Lá é trilho lateral em dois níveis; aqui a
   navegação é uma barra de comando no topo, com a régua de situação logo
   abaixo (abertos, vencendo, enviados) e, no celular, um dock no rodapé.
   Fontes Sora e Manrope, raio largo, roxo sobre azul-noite.
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

interface NavItem {
  href: string;
  label: string;
  icon: typeof CircleGauge;
  match: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Visão geral', icon: CircleGauge, match: (p) => p === '/' },
  {
    href: '/meds',
    label: 'Contestações',
    icon: FileStack,
    match: (p) =>
      p.startsWith('/meds') && !p.startsWith('/meds/import') && !p.startsWith('/meds/entregas'),
  },
  { href: '/meds/import', label: 'Importar', icon: FolderInput, match: (p) => p.startsWith('/meds/import') },
  {
    href: '/meds/entregas',
    label: 'Envios',
    icon: PackageCheck,
    match: (p) => p.startsWith('/meds/entregas'),
  },
  { href: '/integracoes', label: 'Conexões', icon: Plug, match: (p) => p.startsWith('/integracoes') },
  { href: '/equipe', label: 'Equipe', icon: UsersRound, match: (p) => p.startsWith('/equipe') },
];

const noop = () => () => {};

/** "Bulls Cash" → "BC"; uma palavra só → as duas primeiras letras. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map((word) => word[0]) : [...(words[0] ?? '').slice(0, 2)];
  return letters.join('').toUpperCase();
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const dark = hydrated ? resolvedTheme !== 'light' : true;
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      className="bulls-icon-button"
    >
      {dark ? <SunMedium className="size-[18px]" /> : <MoonStar className="size-[18px]" />}
    </button>
  );
}

function AccountMenu({ accounts }: { accounts: BullsAccount[] }) {
  const current = accounts.find((account) => account.active);
  return (
    <details className="bulls-account group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[color:var(--bulls-line)] bg-[color:var(--bulls-chip)] pr-3 pl-1.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary font-heading font-semibold text-primary-foreground text-xs">
          {initials(current?.name ?? '')}
        </span>
        <span className="hidden max-w-36 truncate sm:inline">{current?.name}</span>
        <ChevronDown className="size-4 opacity-60 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[color:var(--bulls-line)] bg-popover p-1.5 text-popover-foreground shadow-2xl">
        <p className="px-3 pt-2 pb-1 font-heading text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          Trocar de conta
        </p>
        {accounts.map((account) => (
          <form key={account.id} action={switchAccountAction}>
            <input type="hidden" name="conta" value={account.id} />
            <button
              type="submit"
              disabled={account.active}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-100"
            >
              <span className="truncate">{account.name}</span>
              {account.active ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                  em uso
                </span>
              ) : null}
            </button>
          </form>
        ))}
        <div className="my-1 h-px bg-border" />
        <Link
          href="/contas"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent"
        >
          <ArrowLeftRight className="size-4" />
          Gerenciar contas
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}

function Ribbon({ counts }: { counts: BullsCounts }) {
  const view = useSearchParams().get('view');
  const chips = [
    { href: '/meds', label: 'Em aberto', value: counts.open, active: false, tone: 'base' },
    {
      href: '/meds?view=vencendo',
      label: 'Vencendo em 72h',
      value: counts.dueSoon,
      active: view === 'vencendo',
      tone: counts.hasUrgent ? 'hot' : 'base',
    },
    { href: '/meds?view=prontos', label: 'Prontos', value: null, active: view === 'prontos', tone: 'base' },
    { href: '/meds?view=bloqueados', label: 'Sem evidência', value: null, active: view === 'bloqueados', tone: 'base' },
    {
      href: '/meds?view=enviados',
      label: 'Enviados',
      value: counts.submitted,
      active: view === 'enviados',
      tone: 'base',
    },
  ] as const;
  return (
    <div className="border-[color:var(--bulls-line)] border-b">
      <div className="mx-auto flex max-w-[1320px] items-center gap-2 overflow-x-auto px-4 py-2.5 md:px-8 [scrollbar-width:none]">
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
              chip.active
                ? 'border-primary bg-primary/12 text-foreground'
                : 'border-[color:var(--bulls-line)] text-muted-foreground hover:text-foreground',
            )}
          >
            {chip.tone === 'hot' ? <span className="size-1.5 rounded-full bg-destructive" /> : null}
            {chip.label}
            {chip.value !== null ? (
              <span className="font-heading font-semibold text-foreground tabular-nums">{chip.value}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
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
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  return (
    <div className="bulls-floor flex min-h-svh flex-col">
      <header data-print-hide className="sticky top-0 z-40 bg-[color:var(--bulls-bar)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${accountName} — início`}>
            <BullsMark size={34} />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-heading font-bold text-[15px] uppercase tracking-[0.18em]">
                {accountName}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground uppercase tracking-[0.22em]">
                Defesa de MED
              </span>
            </span>
          </Link>

          <nav aria-label="Seções" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-0.5 rounded-2xl border border-[color:var(--bulls-line)] bg-[color:var(--bulls-chip)] p-1">
              {NAV.map((item) => {
                const active = item.match(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] transition-all',
                        active
                          ? 'bg-primary font-semibold text-primary-foreground shadow-[0_6px_20px_-6px_var(--primary)]'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            {demoMode ? (
              <span className="hidden rounded-full border border-dashed border-[color:var(--bulls-line)] px-2.5 py-1 text-[11px] text-muted-foreground xl:inline">
                demo
              </span>
            ) : null}
            <SearchTrigger
              trigger={(open) => (
                <button type="button" onClick={open} aria-label="Buscar" className="bulls-icon-button">
                  <Search className="size-[18px]" />
                </button>
              )}
            />
            <ThemeToggle />
            <AccountMenu accounts={accounts} />
          </div>
        </div>
        {/* A régua lê `?view=`, e useSearchParams exige limite de Suspense. */}
        <Suspense fallback={<div className="h-[45px] border-[color:var(--bulls-line)] border-b" />}>
          <Ribbon counts={counts} />
        </Suspense>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-[1320px] flex-1 px-4 pt-6 pb-28 md:px-8 lg:pb-12">
        {children}
      </main>

      <nav
        aria-label="Seções"
        data-print-hide
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-[color:var(--bulls-line)] bg-[color:var(--bulls-bar)] p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.slice(0, 4).map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px]',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
