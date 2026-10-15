'use client';

/**
 * Barra lateral recolhível do ambiente Bulls Cash ("Bento Claro").
 *
 * Base: sidebar recolhível do 21st.dev (#31454), adaptada — motion/react,
 * ícones lucide, item como link do Next ou botão, cores pelos papéis do
 * ambiente (`--bulls-*`, em `globals.css`). A pílula do item ativo desliza
 * entre os itens; a largura anima ao recolher até virar trilho de ícones.
 * O MotionConfig da raiz respeita quem pediu menos movimento.
 */

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SidebarVariant = 'default' | 'collapsible' | 'icon-rail';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

type SidebarContextValue = {
  variant: SidebarVariant;
  collapsed: boolean;
  toggleCollapsed: () => void;
  navId: string;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebarContext(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error('Componentes da Sidebar precisam estar dentro de <Sidebar>.');
  return ctx;
}

export function useSidebar(): Pick<SidebarContextValue, 'variant' | 'collapsed' | 'toggleCollapsed'> {
  const { variant, collapsed, toggleCollapsed } = useSidebarContext();
  return { variant, collapsed, toggleCollapsed };
}

/* ─── <Sidebar> ─────────────────────────────────────────────── */

export interface SidebarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  variant?: SidebarVariant;
  defaultCollapsed?: boolean;
  width?: number;
  collapsedWidth?: number;
  'aria-label'?: string;
  children: React.ReactNode;
}

export function Sidebar({
  variant = 'default',
  defaultCollapsed = false,
  width = 280,
  collapsedWidth = 76,
  className,
  children,
  'aria-label': ariaLabel = 'Navegação principal',
  style,
  ...props
}: SidebarProps) {
  const reactId = React.useId();
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const collapsed =
    variant === 'icon-rail' ? true : variant === 'collapsible' ? internalCollapsed : false;

  const toggleCollapsed = React.useCallback(() => {
    if (variant !== 'collapsible') return;
    setInternalCollapsed((value) => !value);
  }, [variant]);

  const ctx = React.useMemo<SidebarContextValue>(
    () => ({ variant, collapsed, toggleCollapsed, navId: `bulls-sidebar-${reactId}` }),
    [variant, collapsed, toggleCollapsed, reactId],
  );

  return (
    <SidebarContext.Provider value={ctx}>
      <nav
        aria-label={ariaLabel}
        data-collapsed={collapsed ? 'true' : 'false'}
        style={{ ...style, width: collapsed ? collapsedWidth : width }}
        className={cn(
          'relative isolate flex h-full shrink-0 flex-col overflow-hidden text-foreground',
          'transition-[width] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </SidebarContext.Provider>
  );
}

/* ─── Rótulo que some ao recolher ──────────────────────────── */

function FadingLabel({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: EASE_OUT }}
          className={className}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ─── Cabeçalho, navegação, seção ──────────────────────────── */

export function SidebarHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { collapsed } = useSidebarContext();
  return (
    <div
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'flex shrink-0 items-center',
        collapsed ? 'flex-col justify-center gap-3 px-0 py-4' : 'h-[72px] gap-3 px-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarNav({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { navId } = useSidebarContext();
  return (
    <div
      id={navId}
      className={cn('min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain py-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarSection({
  className,
  label,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  const { collapsed } = useSidebarContext();
  return (
    <div role="group" aria-label={label} className={cn('py-1.5', className)} {...props}>
      {label && (
        <div className="flex h-7 items-end px-6 pb-2">
          <FadingLabel
            show={!collapsed}
            className="text-[11px] leading-none font-semibold tracking-[0.08em] whitespace-nowrap text-bulls-ink-3 uppercase"
          >
            {label}
          </FadingLabel>
        </div>
      )}
      <div className={cn('flex flex-col gap-0.5', collapsed ? 'px-3' : 'px-3')}>{children}</div>
    </div>
  );
}

/* ─── Item com pílula ativa que desliza ────────────────────── */

const itemBase = cn(
  'group/bulls-item relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5',
  'text-[14px] leading-5 font-medium whitespace-nowrap outline-none select-none',
  'transition-colors duration-150',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

function ActivePill({ navId }: { navId: string }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={`${navId}-pill`}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
      className="pointer-events-none absolute inset-0 rounded-2xl bg-bulls-brand-soft ring-1 ring-bulls-brand/15 ring-inset"
    />
  );
}

export interface SidebarItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: React.ReactNode;
  active?: boolean;
  href?: string;
  badge?: React.ReactNode;
  children: string;
}

export function SidebarItem({ className, icon, active = false, href, badge, children, ...props }: SidebarItemProps) {
  const { collapsed, navId } = useSidebarContext();
  const classes = cn(
    itemBase,
    active
      ? 'text-bulls-brand-deep'
      : 'text-bulls-ink-2 hover:bg-bulls-brand-wash hover:text-foreground',
    collapsed && 'justify-center px-0',
    className,
  );

  const content = (
    <>
      {active ? <ActivePill navId={navId} /> : null}
      {icon ? (
        <span
          className={cn(
            'relative z-10 flex size-5 shrink-0 items-center justify-center',
            active
              ? 'text-bulls-brand-strong'
              : 'text-bulls-ink-3 group-hover/bulls-item:text-foreground',
          )}
        >
          {icon}
        </span>
      ) : null}
      <FadingLabel show={!collapsed} className="relative z-10 min-w-0 flex-1 truncate text-left">
        {children}
      </FadingLabel>
      {badge ? (
        collapsed ? (
          <span aria-hidden="true" className="absolute top-1.5 right-2.5 z-10 size-2 rounded-full bg-bulls-brand ring-2 ring-card" />
        ) : (
          <FadingLabel show className="relative z-10 flex shrink-0 items-center">
            {badge}
          </FadingLabel>
        )
      ) : null}
    </>
  );

  const title = collapsed ? children : undefined;

  if (href) {
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} title={title} aria-label={collapsed ? children : undefined} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      title={title}
      aria-label={collapsed ? children : undefined}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}

/* ─── Rodapé e alternância ─────────────────────────────────── */

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { collapsed } = useSidebarContext();
  return (
    <div
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn('flex shrink-0 items-center p-3', collapsed && 'justify-center', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarToggle({ className, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const ctx = React.useContext(SidebarContext);
  if (!ctx || ctx.variant !== 'collapsible') return null;
  const { collapsed, toggleCollapsed } = ctx;
  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      aria-expanded={!collapsed}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-xl text-bulls-ink-3 outline-none',
        'transition-colors hover:bg-bulls-brand-wash hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      {collapsed ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} /> : <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />}
    </button>
  );
}
