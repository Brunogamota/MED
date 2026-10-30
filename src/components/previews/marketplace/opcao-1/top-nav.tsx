'use client';

import * as React from 'react';
import Link from 'next/link';
import { NavigationMenu as Nav } from 'radix-ui';
import { motion } from 'motion/react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  FileSpreadsheetIcon,
  MailCheckIcon,
  SearchIcon,
  Settings2Icon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { BrandSeal } from './brand-seal';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from './menu';

/**
 * Barra superior (a partir do "Tab Navbar", 21st.dev 18092): marca + conta,
 * navegação horizontal com um menu "Importar", busca. Sem trilho lateral.
 */

const COMPROVANTE_HREF = '/preview/marketplace/opcao-1/comprovante';

type NavLink = {
  id: string;
  label: string;
  href: string;
  count?: number;
  tone?: 'neutral' | 'warning';
};

const LINKS_ANTES: NavLink[] = [
  { id: 'visao', label: 'Visão geral', href: '#' },
  { id: 'contestacoes', label: 'Contestações', href: '#', count: RESUMO.emAberto },
  { id: 'vencendo', label: 'Vencendo', href: '#', count: RESUMO.vencendo24h, tone: 'warning' },
];

const LINKS_DEPOIS: NavLink[] = [
  { id: 'comprovantes', label: 'Comprovantes', href: COMPROVANTE_HREF },
  { id: 'conexoes', label: 'Conexões', href: '#' },
  { id: 'equipe', label: 'Equipe', href: '#' },
];

const IMPORTAR = [
  {
    label: 'Importar MEDs',
    descricao: 'Arquivo da adquirente com as contestações recebidas.',
    icon: FileSpreadsheetIcon,
  },
  {
    label: 'Importar envios',
    descricao: 'Registros de e-mail enviados ao comprador, por pedido.',
    icon: MailCheckIcon,
  },
];

const linkClass =
  'relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-medium whitespace-nowrap text-(--o1-ink-2) transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[active=true]:text-foreground';

function Count({ value, tone = 'neutral' }: { value: number; tone?: NavLink['tone'] }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] leading-none font-medium tabular-nums',
        tone === 'warning'
          ? 'bg-(--o1-warning-bg) text-(--o1-warning) ring-1 ring-(--o1-warning)/25'
          : 'bg-secondary text-(--o1-ink-2)',
      )}
    >
      {value.toLocaleString('pt-BR')}
    </span>
  );
}

function ActiveBar() {
  return (
    <motion.span
      layoutId="o1-nav-active"
      aria-hidden="true"
      className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-primary"
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    />
  );
}

function NavItemLink({
  link,
  active,
  compact = false,
}: {
  link: NavLink;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Nav.Item>
      <Nav.Link asChild active={active}>
        <Link
          href={link.href}
          data-active={active}
          aria-current={active ? 'page' : undefined}
          className={cn(linkClass, compact && 'data-[active=true]:bg-accent data-[active=true]:text-primary')}
        >
          {link.label}
          {link.count !== undefined ? <Count value={link.count} tone={link.tone} /> : null}
          {active && !compact ? <ActiveBar /> : null}
        </Link>
      </Nav.Link>
    </Nav.Item>
  );
}

function AccountSwitcher() {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="group flex min-w-0 items-center gap-2.5 rounded-[10px] py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Trocar de conta. Conta ativa: Marketplace Verificado"
        >
          <BrandSeal />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              Marketplace Verificado
            </span>
            <span className="text-[11.5px] text-(--o1-ink-3)">Defesa de MED</span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-(--o1-ink-3) group-hover:text-foreground" />
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        <MenuLabel>Conta ativa</MenuLabel>
        <MenuItem className="py-2">
          <BrandSeal className="size-6 rounded-md [&_svg]:size-4" />
          <span className="flex-1 font-medium">Marketplace Verificado</span>
          <CheckIcon className="text-primary!" />
        </MenuItem>
        <MenuSeparator />
        <MenuItem>
          <Settings2Icon />
          Gerenciar contas
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function SearchBox({ className }: { className?: string }) {
  return (
    <form role="search" className={cn('relative', className)} onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="o1-busca-global" className="sr-only">
        Buscar contestações
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--o1-ink-3)" />
      <input
        id="o1-busca-global"
        type="search"
        placeholder="Buscar E2E, pagador ou pedido"
        className="h-9 w-full rounded-[9px] border border-border bg-muted/70 pr-10 pl-8.5 text-[13px] text-foreground transition-colors outline-none placeholder:text-(--o1-ink-3) hover:border-input focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/15"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 font-mono text-[10.5px] text-(--o1-ink-3) sm:inline-block">
        /
      </kbd>
    </form>
  );
}

function ImportarMenu() {
  return (
    <Nav.Item className="relative">
      <Nav.Trigger className={cn(linkClass, 'group data-[state=open]:bg-muted')}>
        Importar
        <ChevronDownIcon
          aria-hidden="true"
          className="size-3.5 text-(--o1-ink-3) transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </Nav.Trigger>
      <Nav.Content className="absolute top-full left-0 z-50 mt-2 w-[340px] rounded-[12px] border border-border bg-popover p-1.5 shadow-(--o1-shadow-lg) data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out">
        <ul className="grid gap-0.5">
          {IMPORTAR.map((item) => (
            <li key={item.label}>
              <Nav.Link asChild>
                <a
                  href="#"
                  className="flex items-start gap-3 rounded-[9px] p-2.5 transition-colors outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/10">
                    <item.icon className="size-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                    <span className="text-[12.5px] leading-snug text-(--o1-ink-3)">
                      {item.descricao}
                    </span>
                  </span>
                </a>
              </Nav.Link>
            </li>
          ))}
        </ul>
      </Nav.Content>
    </Nav.Item>
  );
}

function NavList({ active, compact = false }: { active: string; compact?: boolean }) {
  return (
    <Nav.List className="flex items-center gap-0.5">
      {LINKS_ANTES.map((link) => (
        <NavItemLink key={link.id} link={link} active={active === link.id} compact={compact} />
      ))}
      {compact ? (
        IMPORTAR.map((item) => (
          <NavItemLink
            key={item.label}
            link={{ id: item.label, label: item.label, href: '#' }}
            active={false}
            compact
          />
        ))
      ) : (
        <ImportarMenu />
      )}
      {LINKS_DEPOIS.map((link) => (
        <NavItemLink key={link.id} link={link} active={active === link.id} compact={compact} />
      ))}
    </Nav.List>
  );
}

export function TopNav({ active = 'visao' }: { active?: string }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <AccountSwitcher />
        <span aria-hidden="true" className="hidden h-6 w-px bg-border xl:block" />
        <Nav.Root aria-label="Principal" className="relative hidden min-w-0 flex-1 xl:block">
          <NavList active={active} />
        </Nav.Root>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-[260px] md:block" />
          <button
            type="button"
            aria-label="Buscar"
            className="inline-flex size-9 items-center justify-center rounded-[9px] border border-border text-(--o1-ink-2) hover:bg-muted md:hidden"
          >
            <SearchIcon className="size-4" />
          </button>
        </div>
      </div>
      {/* Abaixo de 1280 a navegação desce para uma faixa própria, rolável. */}
      <Nav.Root
        aria-label="Principal (compacta)"
        className="mx-auto max-w-[1440px] overflow-x-auto px-2 pb-2.5 [scrollbar-width:none] sm:px-4 xl:hidden"
      >
        <NavList active={active} compact />
      </Nav.Root>
    </div>
  );
}
