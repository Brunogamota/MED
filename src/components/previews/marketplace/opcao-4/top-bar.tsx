'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { BrandMark } from './brand-mark';
import { display, focusRing, inteiro, mono } from './ui';

type NavItem = {
  label: string;
  href: string;
  count?: number;
  tone?: 'ink' | 'warning';
  active?: boolean;
};

const NAV: NavItem[] = [
  { label: 'Visão geral', href: '#visao-geral' },
  { label: 'Contestações', href: '#fila', count: RESUMO.emAberto, tone: 'ink', active: true },
  { label: 'Vencendo', href: '#fila', count: RESUMO.vencendo24h, tone: 'warning' },
  { label: 'Importar MEDs', href: '#' },
  { label: 'Importar envios', href: '#' },
  { label: 'Comprovantes', href: '/preview/marketplace/opcao-4/comprovante' },
  { label: 'Conexões', href: '#' },
  { label: 'Equipe', href: '#' },
];

function NavLink({ item }: { item: NavItem }) {
  const cls = cn(
    'group relative flex h-full shrink-0 items-center gap-2 px-3',
    mono,
    'text-[11px] font-medium uppercase tracking-[0.1em]',
    item.active ? 'text-(--o4-ink)' : 'text-(--o4-ink-2) hover:text-(--o4-ink)',
    focusRing,
    'focus-visible:outline-offset-[-4px]',
  );
  const inner = (
    <>
      {item.label}
      {item.count !== undefined ? (
        <span
          className={cn(
            'inline-flex h-[18px] min-w-[22px] items-center justify-center px-1 text-[10px] font-semibold tabular-nums tracking-normal',
            item.tone === 'warning' ? 'bg-(--o4-warning) text-(--o4-paper)' : 'bg-(--o4-ink) text-(--o4-paper)',
          )}
        >
          {inteiro(item.count)}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-3 bottom-0 h-[3px] bg-(--o4-ink) transition-transform duration-150',
          item.active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        )}
      />
    </>
  );
  if (item.href.startsWith('/')) {
    return (
      <Link href={item.href} className={cls} aria-current={item.active ? 'page' : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={item.href} className={cls} aria-current={item.active ? 'page' : undefined}>
      {inner}
    </a>
  );
}

function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative h-full">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="o4-contas"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-full items-center gap-3 border-l-2 border-(--o4-ink) px-3 text-left transition-colors hover:bg-(--o4-panel) sm:px-4',
          open && 'bg-(--o4-panel)',
          focusRing,
          'focus-visible:outline-offset-[-4px]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center border-2 border-(--o4-ink) bg-(--o4-yellow) text-[12px] font-bold',
            display,
          )}
        >
          MV
        </span>
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className={cn(mono, 'text-[9.5px] uppercase tracking-[0.14em] text-(--o4-ink-3)')}>Conta</span>
          <span className="truncate text-[13px] font-semibold leading-tight">Marketplace Verificado</span>
        </span>
        <span className="sr-only sm:hidden">Conta: Marketplace Verificado</span>
        <ChevronsUpDown className="size-4 shrink-0 text-(--o4-ink-2)" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="o4-contas"
          className="absolute right-0 top-[calc(100%+2px)] z-50 w-72 border-2 border-(--o4-ink) bg-(--o4-paper) shadow-[6px_6px_0_var(--o4-ink)]"
        >
          <p className={cn('border-b-2 border-(--o4-ink) bg-(--o4-panel) px-3 py-2', mono, 'text-[10px] uppercase tracking-[0.14em] text-(--o4-ink-3)')}>
            Conta ativa
          </p>
          <a
            href="#"
            aria-current="true"
            className={cn('flex items-center gap-3 px-3 py-3 hover:bg-(--o4-yellow)', focusRing, 'focus-visible:outline-offset-[-3px]')}
            onClick={() => setOpen(false)}
          >
            <span className={cn('grid size-7 place-items-center border-2 border-(--o4-ink) bg-(--o4-yellow) text-[11px] font-bold', display)} aria-hidden="true">
              MV
            </span>
            <span className="flex-1 text-[13px] font-semibold">Marketplace Verificado</span>
            <Check className="size-4" aria-hidden="true" />
          </a>
          <a
            href="#"
            className={cn(
              'flex items-center gap-3 border-t-2 border-(--o4-ink) px-3 py-2.5 text-[13px] text-(--o4-ink-2) hover:bg-(--o4-panel) hover:text-(--o4-ink)',
              focusRing,
              'focus-visible:outline-offset-[-3px]',
            )}
            onClick={() => setOpen(false)}
          >
            <Settings2 className="size-4" aria-hidden="true" />
            Gerenciar contas
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-(--o4-ink) bg-(--o4-paper)">
      <div className="flex h-14 items-stretch">
        <Link
          href="/preview/marketplace/opcao-4"
          className={cn(
            'flex shrink-0 items-center gap-2.5 border-r-2 border-(--o4-ink) bg-(--o4-yellow) px-4 sm:px-5',
            focusRing,
            'focus-visible:outline-offset-[-4px]',
          )}
          aria-label="Defesa MED, início"
        >
          <BrandMark size={28} />
          <span className="flex flex-col leading-none">
            <span className={cn(display, 'text-[17px] font-bold')}>Defesa MED</span>
            <span className={cn(mono, 'mt-1 text-[9px] uppercase tracking-[0.16em] text-(--o4-ink)/70')}>Console</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] xl:flex">
          {NAV.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>
        <div className="flex-1 xl:hidden" />

        <AccountSwitcher />
      </div>

      {/* Celular e tablet: a mesma navegação numa faixa rolável. */}
      <nav
        aria-label="Principal"
        className="flex h-11 items-stretch overflow-x-auto border-t-2 border-(--o4-ink) [scrollbar-width:none] xl:hidden"
      >
        {NAV.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>
    </header>
  );
}
