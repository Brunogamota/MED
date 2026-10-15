'use client';

import Link from 'next/link';
import { useId, useState, type ComponentType } from 'react';
import {
  AlarmClock,
  FileUp,
  LayoutDashboard,
  Menu,
  Plug,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { RESUMO } from '@/components/previews/fixtures';
import { OP3_THEME_CLASS } from '@/components/previews/opcao-3/theme';
import { cn } from '@/lib/cn';

/*
 * Base: 21st.dev 28489 "Sidebar with Search and Profile" — busca no topo,
 * navegação com contador, seção de configurações e perfil no rodapé. Sem o
 * cartão de "upgrade": aqui não se vende nada.
 */

export type Op3NavId =
  | 'visao-geral'
  | 'contestacoes'
  | 'vencendo'
  | 'importar-meds'
  | 'importar-envios'
  | 'comprovantes'
  | 'conexoes'
  | 'equipe';

interface NavItem {
  id: Op3NavId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  badge?: { value: number; tone: 'neutral' | 'warning' };
}

const BASE = '/preview/bulls/opcao-3';

const MAIN_NAV: NavItem[] = [
  { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard, href: BASE },
  {
    id: 'contestacoes',
    label: 'Contestações',
    icon: ShieldAlert,
    href: `${BASE}#fila`,
    badge: { value: RESUMO.emAberto, tone: 'neutral' },
  },
  {
    id: 'vencendo',
    label: 'Vencendo',
    icon: AlarmClock,
    href: `${BASE}#fila`,
    badge: { value: RESUMO.vencendo24h, tone: 'warning' },
  },
  { id: 'importar-meds', label: 'Importar MEDs', icon: FileUp },
  { id: 'importar-envios', label: 'Importar envios', icon: Truck },
  { id: 'comprovantes', label: 'Comprovantes', icon: ReceiptText, href: `${BASE}/comprovante` },
];

const SETTINGS_NAV: NavItem[] = [
  { id: 'conexoes', label: 'Conexões', icon: Plug },
  { id: 'equipe', label: 'Equipe', icon: Users },
];

function NavRow({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (id: Op3NavId) => void;
}) {
  const Icon = item.icon;
  const className = cn(
    'group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors',
    'focus-visible:ring-3 focus-visible:ring-ring/40',
    active
      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
      : 'text-(--op3-ink-2) hover:bg-accent hover:text-foreground',
  );
  const content = (
    <>
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-transform group-hover:scale-110',
          active ? 'text-primary-foreground' : 'text-(--op3-ink-3) group-hover:text-primary',
        )}
      />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            'ml-auto inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
            active
              ? 'bg-white/20 text-primary-foreground'
              : item.badge.tone === 'warning'
                ? 'bg-(--op3-warning)/15 text-(--op3-warning-ink)'
                : 'bg-secondary text-primary',
          )}
        >
          {item.badge.value}
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => onSelect(item.id)}
        className={className}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item.id)}
      className={className}
    >
      {content}
    </button>
  );
}

function NavGroup({
  label,
  items,
  active,
  onSelect,
}: {
  label: string;
  items: NavItem[];
  active: Op3NavId;
  onSelect: (id: Op3NavId) => void;
}) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p
        id={headingId}
        className="px-3 text-[11px] font-semibold tracking-[0.08em] text-(--op3-ink-3)/80 uppercase"
      >
        {label}
      </p>
      <ul aria-labelledby={headingId} className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <NavRow item={item} active={active === item.id} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarBody({
  initialActive,
  onNavigate,
}: {
  initialActive: Op3NavId;
  onNavigate?: () => void;
}) {
  const [active, setActive] = useState<Op3NavId>(initialActive);
  const [query, setQuery] = useState('');
  const searchId = useId();

  const term = query.trim().toLocaleLowerCase('pt-BR');
  const match = (item: NavItem) => !term || item.label.toLocaleLowerCase('pt-BR').includes(term);
  const main = MAIN_NAV.filter(match);
  const settings = SETTINGS_NAV.filter(match);

  const select = (id: Op3NavId) => {
    setActive(id);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="op3-hero grid size-9 place-items-center rounded-xl text-sm font-bold text-white shadow-md shadow-primary/30"
          >
            BC
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold text-foreground">Bulls Cash</p>
            <p className="truncate text-xs text-(--op3-ink-3)">Defesa de MED</p>
          </div>
        </div>
        <div className="relative mt-5">
          <label htmlFor={searchId} className="sr-only">
            Buscar no menu
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--op3-ink-3)"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            className="h-10 rounded-xl border-transparent bg-muted pl-9 shadow-none focus-visible:bg-card dark:bg-muted"
          />
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        <NavGroup label="Menu" items={main} active={active} onSelect={select} />
        <NavGroup label="Configurações" items={settings} active={active} onSelect={select} />
        {main.length === 0 && settings.length === 0 ? (
          <p className="px-3 text-sm text-(--op3-ink-3)">Nenhum item encontrado para “{query.trim()}”.</p>
        ) : null}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar className="size-9 after:border-none">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-primary">BC</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">Bulls Cash</p>
            <p className="truncate text-xs text-(--op3-ink-3)">Conta ativa</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Configurações da conta"
            className="text-(--op3-ink-3) hover:bg-accent hover:text-foreground dark:hover:bg-accent"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Barra lateral fixa do desktop (a partir de `lg`). */
export function Op3Sidebar({ active }: { active: Op3NavId }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-r border-border bg-sidebar lg:block">
      <SidebarBody initialActive={active} />
    </aside>
  );
}

/**
 * No celular a mesma barra abre como gaveta. O Sheet vai para um portal fora
 * do invólucro da página, então leva a fonte e a paleta junto.
 */
export function Op3MobileNav({ active, fontClass }: { active: Op3NavId; fontClass: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="op3-hero-glass grid size-10 place-items-center rounded-full text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/50 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className={cn(fontClass, OP3_THEME_CLASS, 'w-[288px] gap-0 bg-sidebar p-0 text-foreground')}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Navegação do console Bulls Cash</SheetDescription>
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fechar menu"
            className="absolute top-6 right-4 z-10 text-(--op3-ink-3) hover:bg-accent dark:hover:bg-accent"
          >
            <X />
          </Button>
        </SheetClose>
        <SidebarBody initialActive={active} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
