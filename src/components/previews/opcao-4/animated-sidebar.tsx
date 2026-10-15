'use client';

/*
 * Adaptado do 21st.dev 29334 "Animated Sidebar" (beui.dev, starc007).
 *
 * Mudanças: sem o `SharedLayoutBg` externo (o realce do item ativo já vem do
 * `layoutId`), curvas de animação declaradas aqui, raio menor para a grade
 * densa, rótulos de acessibilidade em português, contador em sub-item e o
 * menu móvel montado dentro da árvore da opção — no `body` ele perderia os
 * tokens de cor definidos no layout.
 */

import { ChevronRight } from 'lucide-react';
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type SidebarState = 'expanded' | 'collapsed';
type SidebarSide = 'left' | 'right';
type SidebarCollapsible = 'offcanvas' | 'icon' | 'none';

const MOBILE_QUERY = '(max-width: 767px)';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SPRING_LAYOUT = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 } as const;
const SPRING_PRESS = { type: 'spring', stiffness: 700, damping: 32 } as const;

const PANEL_TRANSITION = { duration: 0.32, ease: EASE_DRAWER } as const;
const SIDEBAR_MORPH_TRANSITION = { type: 'spring', stiffness: 380, damping: 35, mass: 0.75 } as const;
const LABEL_ENTER_TRANSITION = { duration: 0.18, delay: 0.06, ease: EASE_OUT } as const;
const LABEL_EXIT_TRANSITION = { duration: 0.1, ease: EASE_OUT } as const;
const REDUCED_TRANSITION = { duration: 0.14, ease: EASE_OUT } as const;

const SUBMENU_VARIANTS: Variants = {
  closed: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0 round 6px)',
    transition: { duration: 0.12, ease: EASE_OUT, staggerChildren: 0.02, staggerDirection: -1 },
  },
  open: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0 round 6px)',
    transition: { duration: 0.18, delayChildren: 0.03, ease: EASE_OUT, staggerChildren: 0.035 },
  },
};

const SUBMENU_ITEM_VARIANTS: Variants = {
  closed: { opacity: 0, y: -4 },
  open: { opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } },
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  "[tabindex]:not([tabindex='-1'])",
].join(',');

function subscribeToMobileQuery(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const getMobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerMobileSnapshot = () => false;

function useIsMobile() {
  return useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getServerMobileSnapshot);
}

interface AnimatedSidebarContextValue {
  isMobile: boolean;
  layoutId: string;
  open: boolean;
  openMobile: boolean;
  reduce: boolean;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  state: SidebarState;
  toggleSidebar: () => void;
  focusTrigger: () => void;
  registerTrigger: (node: HTMLButtonElement | null) => void;
  root: HTMLDivElement | null;
}

const AnimatedSidebarContext = createContext<AnimatedSidebarContextValue | null>(null);

interface PanelContextValue {
  collapsed: boolean;
  collapsible: SidebarCollapsible;
  side: SidebarSide;
}
const PanelContext = createContext<PanelContextValue | null>(null);

export function useAnimatedSidebar() {
  const context = useContext(AnimatedSidebarContext);
  if (!context) throw new Error('useAnimatedSidebar precisa de AnimatedSidebarProvider.');
  return context;
}

function usePanel() {
  const context = useContext(PanelContext);
  if (!context) throw new Error('Partes do menu precisam estar dentro de AnimatedSidebar.');
  return context;
}

type SidebarProviderStyle = CSSProperties & {
  '--sidebar-width'?: string;
  '--sidebar-width-icon'?: string;
  '--sidebar-width-mobile'?: string;
};

export interface AnimatedSidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  style?: SidebarProviderStyle;
}

export function AnimatedSidebarProvider({
  children,
  defaultOpen = true,
  className,
  style,
  ...props
}: AnimatedSidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const isMobile = useIsMobile();
  const reduce = useReducedMotion() ?? false;
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const registerTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);
  const focusTrigger = useCallback(() => {
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile((v) => !v);
    else setOpen((v) => !v);
  }, [isMobile]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [toggleSidebar]);

  return (
    <AnimatedSidebarContext.Provider
      value={{
        isMobile,
        layoutId: `${generatedId}-active`,
        open,
        openMobile,
        reduce,
        setOpen,
        setOpenMobile,
        state: open ? 'expanded' : 'collapsed',
        toggleSidebar,
        focusTrigger,
        registerTrigger,
        root,
      }}
    >
      <div
        {...props}
        ref={setRoot}
        data-slot="sidebar-wrapper"
        data-state={open ? 'expanded' : 'collapsed'}
        style={{
          '--sidebar-width': '15rem',
          '--sidebar-width-icon': '3.5rem',
          '--sidebar-width-mobile': '17rem',
          ...style,
        }}
        className={cn('group/sidebar-wrapper flex min-h-svh w-full min-w-0', className)}
      >
        {children}
      </div>
    </AnimatedSidebarContext.Provider>
  );
}

function MobileSidebar({
  ariaLabel,
  children,
  className,
  side,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  side: SidebarSide;
}) {
  const context = useAnimatedSidebar();
  const panelRef = useRef<HTMLDivElement>(null);
  // Monta dentro do nó raiz da opção, que carrega os tokens de cor.
  const target = context.root;
  const { focusTrigger } = context;
  // Fechado e já fora da tela: só então o painel some de vez. Abrir mostra no
  // mesmo render (ajuste de estado durante o render, sem efeito).
  const [settledClosed, setSettledClosed] = useState(!context.openMobile);
  const [prevOpen, setPrevOpen] = useState(context.openMobile);
  if (prevOpen !== context.openMobile) {
    setPrevOpen(context.openMobile);
    if (context.openMobile) setSettledClosed(false);
  }
  const hidden = settledClosed && !context.openMobile;
  const openMobileRef = useRef(context.openMobile);

  useEffect(() => {
    openMobileRef.current = context.openMobile;
  }, [context.openMobile]);

  useEffect(() => {
    if (!context.openMobile) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panelRef.current)?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      body.style.overflow = previousOverflow;
      focusTrigger();
    };
  }, [context.openMobile, focusTrigger]);

  if (!target) return null;

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed left-0 top-0 z-50 size-0 md:hidden',
        hidden ? 'invisible' : 'visible',
      )}
    >
      <motion.button
        type="button"
        aria-label="Fechar menu"
        tabIndex={context.openMobile ? 0 : -1}
        initial={false}
        animate={{ opacity: context.openMobile ? 1 : 0 }}
        transition={context.reduce ? REDUCED_TRANSITION : PANEL_TRANSITION}
        onClick={() => context.setOpenMobile(false)}
        className={cn(
          'fixed inset-0 bg-black/60',
          context.openMobile ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-hidden={!context.openMobile}
        inert={!context.openMobile}
        tabIndex={-1}
        data-state={context.openMobile ? 'expanded' : 'collapsed'}
        initial={false}
        animate={{
          opacity: context.reduce ? (context.openMobile ? 1 : 0) : 1,
          x: context.reduce ? 0 : context.openMobile ? '0%' : side === 'left' ? '-100%' : '100%',
        }}
        transition={context.reduce ? REDUCED_TRANSITION : PANEL_TRANSITION}
        onAnimationComplete={() => {
          if (!openMobileRef.current) setSettledClosed(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            context.setOpenMobile(false);
            return;
          }
          if (event.key !== 'Tab') return;
          const focusable = panelRef.current
            ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
            : [];
          if (focusable.length === 0) {
            event.preventDefault();
            panelRef.current?.focus();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className={cn(
          'pointer-events-auto fixed inset-y-0 flex h-dvh w-(--sidebar-width-mobile) max-w-[88vw] flex-col overflow-hidden',
          'border-border bg-sidebar shadow-2xl will-change-transform',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          !context.openMobile && 'pointer-events-none',
          className,
        )}
      >
        <PanelContext.Provider value={{ collapsed: false, collapsible: 'none', side }}>
          {children}
        </PanelContext.Provider>
      </motion.div>
    </div>,
    target,
  );
}

export interface AnimatedSidebarProps extends Omit<HTMLMotionProps<'aside'>, 'children'> {
  children?: ReactNode;
  side?: SidebarSide;
  collapsible?: SidebarCollapsible;
  ariaLabel?: string;
  panelClassName?: string;
}

export const AnimatedSidebar = forwardRef<HTMLElement, AnimatedSidebarProps>(function AnimatedSidebar(
  {
    side = 'left',
    collapsible = 'icon',
    ariaLabel = 'Menu',
    children,
    className,
    panelClassName,
    ...props
  },
  forwardedRef,
) {
  const context = useAnimatedSidebar();
  const collapsed = collapsible !== 'none' && !context.open;
  const offcanvas = collapsed && collapsible === 'offcanvas';
  const width = offcanvas ? '0px' : collapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)';

  if (context.isMobile) {
    return (
      <MobileSidebar ariaLabel={ariaLabel} className={className} side={side}>
        {children}
      </MobileSidebar>
    );
  }

  return (
    <motion.aside
      {...props}
      ref={forwardedRef}
      initial={false}
      aria-label={ariaLabel}
      data-slot="sidebar"
      data-state={collapsed ? 'collapsed' : 'expanded'}
      data-collapsible={collapsible}
      data-side={side}
      animate={{ width }}
      transition={context.reduce ? { duration: 0 } : SIDEBAR_MORPH_TRANSITION}
      className={cn(
        'group/sidebar peer relative hidden h-auto shrink-0 will-change-[width] md:block',
        side === 'right' && 'order-last',
        className,
      )}
    >
      <div
        className={cn(
          'sticky top-0 flex h-svh w-full flex-col overflow-hidden bg-sidebar',
          side === 'left' ? 'border-r border-border' : 'border-l border-border',
          panelClassName,
        )}
      >
        <PanelContext.Provider value={{ collapsed, collapsible, side }}>{children}</PanelContext.Provider>
      </div>
    </motion.aside>
  );
});

export function AnimatedSidebarTrigger({
  className,
  onClick,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { isMobile, openMobile, open, registerTrigger, toggleSidebar } = useAnimatedSidebar();
    const expanded = isMobile ? openMobile : open;
    return (
      <button
        {...props}
        ref={registerTrigger}
        type={type}
        aria-label={props['aria-label'] ?? (expanded ? 'Recolher menu' : 'Abrir menu')}
        aria-expanded={expanded}
        data-state={expanded ? 'expanded' : 'collapsed'}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggleSidebar();
        }}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      />
    );
}

export const AnimatedSidebarClose = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function AnimatedSidebarClose({ className, onClick, type = 'button', ...props }, forwardedRef) {
    const context = useAnimatedSidebar();
    return (
      <button
        {...props}
        ref={forwardedRef}
        type={type}
        aria-label={props['aria-label'] ?? 'Fechar menu'}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (context.isMobile) context.setOpenMobile(false);
          else context.setOpen(false);
        }}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarRail = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function AnimatedSidebarRail({ className, onClick, type = 'button', ...props }, forwardedRef) {
    const context = useAnimatedSidebar();
    const panel = usePanel();
    return (
      <button
        {...props}
        ref={forwardedRef}
        type={type}
        data-side={panel.side}
        aria-label={props['aria-label'] ?? 'Alternar menu'}
        title="Alternar menu"
        tabIndex={-1}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) context.toggleSidebar();
        }}
        className={cn(
          'absolute inset-y-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize outline-none md:block',
          'after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent after:transition-colors hover:after:bg-(--o4-brand)',
          'data-[side=left]:left-full data-[side=right]:right-0 data-[side=right]:translate-x-1/2',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarInset = forwardRef<HTMLElement, HTMLMotionProps<'main'>>(function AnimatedSidebarInset(
  { className, ...props },
  forwardedRef,
) {
  return (
    <motion.main
      {...props}
      ref={forwardedRef}
      data-slot="sidebar-inset"
      className={cn('relative flex min-h-svh min-w-0 flex-1 flex-col bg-background', className)}
    />
  );
});

export const AnimatedSidebarHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarHeader({ className, ...props }, ref) {
    return <div {...props} ref={ref} className={cn('flex shrink-0 flex-col gap-2 p-2', className)} />;
  },
);

export const AnimatedSidebarContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarContent({ className, ...props }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-1',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarFooter({ className, ...props }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          'flex shrink-0 flex-col gap-1 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarGroup({ className, ...props }, ref) {
    return <div {...props} ref={ref} className={cn('flex w-full min-w-0 flex-col py-1', className)} />;
  },
);

export const AnimatedSidebarGroupLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarGroupLabel({ children, className, ...props }, ref) {
    const { collapsed } = usePanel();
    return (
      <div
        {...props}
        ref={ref}
        aria-hidden={collapsed}
        className={cn(
          'flex h-6 items-center overflow-hidden whitespace-nowrap px-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-(--o4-subtle) transition-opacity',
          collapsed ? 'opacity-0' : 'opacity-100',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

export const AnimatedSidebarMenu = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  function AnimatedSidebarMenu({ className, ...props }, ref) {
    return <ul {...props} ref={ref} className={cn('flex w-full min-w-0 list-none flex-col gap-px', className)} />;
  },
);

export const AnimatedSidebarMenuItem = forwardRef<HTMLLIElement, HTMLMotionProps<'li'>>(
  function AnimatedSidebarMenuItem({ className, ...props }, ref) {
    return <motion.li {...props} ref={ref} layout="position" transition={SPRING_LAYOUT} className={cn('relative', className)} />;
  },
);

export interface AnimatedSidebarMenuSubProps extends Omit<HTMLMotionProps<'ul'>, 'children'> {
  open: boolean;
  children?: ReactNode;
}

export const AnimatedSidebarMenuSub = forwardRef<HTMLUListElement, AnimatedSidebarMenuSubProps>(
  function AnimatedSidebarMenuSub({ open, children, className, ...props }, ref) {
    const context = useAnimatedSidebar();
    const panel = usePanel();
    return (
      <AnimatePresence initial={false} mode="popLayout">
        {open && !panel.collapsed ? (
          <motion.ul
            {...props}
            ref={ref}
            key="sidebar-submenu"
            variants={context.reduce ? undefined : SUBMENU_VARIANTS}
            initial={context.reduce ? false : 'closed'}
            animate={context.reduce ? { opacity: 1 } : 'open'}
            exit={context.reduce ? { opacity: 0 } : 'closed'}
            className={cn('relative mb-1 ml-[1.15rem] mt-px flex min-w-0 flex-col gap-px border-l border-border pl-2', className)}
          >
            {children}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    );
  },
);

export const AnimatedSidebarMenuSubItem = forwardRef<HTMLLIElement, HTMLMotionProps<'li'>>(
  function AnimatedSidebarMenuSubItem({ className, ...props }, ref) {
    return <motion.li {...props} ref={ref} variants={SUBMENU_ITEM_VARIANTS} className={cn('relative min-w-0', className)} />;
  },
);

interface MenuButtonBase {
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  href?: string;
  isActive?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function AnimatedSidebarMenuSubButton({ children, icon, badge, href, isActive = false, onSelect, className }: MenuButtonBase) {
  const context = useAnimatedSidebar();
  const select = () => {
    onSelect?.();
    if (context.isMobile) context.setOpenMobile(false);
  };
  const content = (
    <>
      <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center">
        {icon ?? <span className="size-1 rounded-full bg-current opacity-60" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge !== undefined ? (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-(--o4-subtle)">{badge}</span>
      ) : null}
    </>
  );
  const cls = cn(
    'flex h-7 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-[13px] outline-none',
    'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring',
    isActive && 'bg-accent text-foreground',
    className,
  );
  return href ? (
    <motion.a href={href} aria-current={isActive ? 'page' : undefined} onClick={select} whileTap={context.reduce ? undefined : { scale: 0.98 }} transition={SPRING_PRESS} className={cls}>
      {content}
    </motion.a>
  ) : (
    <motion.button type="button" aria-current={isActive ? 'page' : undefined} onClick={select} whileTap={context.reduce ? undefined : { scale: 0.98 }} transition={SPRING_PRESS} className={cls}>
      {content}
    </motion.button>
  );
}

export interface AnimatedSidebarMenuButtonProps extends MenuButtonBase {
  ariaExpanded?: boolean;
  /** Nome acessível quando o rótulo não é texto puro. */
  label?: string;
}

export function AnimatedSidebarMenuButton({
  children,
  icon,
  badge,
  href,
  isActive = false,
  ariaExpanded,
  label,
  onSelect,
  className,
}: AnimatedSidebarMenuButtonProps) {
  const context = useAnimatedSidebar();
  const panel = usePanel();
  const textLabel = label ?? (typeof children === 'string' ? children : undefined);

  const select = () => {
    onSelect?.();
    if (context.isMobile && ariaExpanded === undefined) context.setOpenMobile(false);
    // No trilho de ícones o submenu não cabe: abrir um grupo dali desdobra o painel.
    if (ariaExpanded !== undefined && panel.collapsed && !context.isMobile) context.setOpen(true);
  };

  const content = (
    <>
      {isActive ? (
        <motion.span
          layoutId={context.layoutId}
          transition={context.reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-md border border-border bg-(--o4-raised)"
        >
          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-(--o4-brand)" />
        </motion.span>
      ) : null}
      {icon ? (
        <span aria-hidden="true" className={cn('relative z-10 grid size-4 shrink-0 place-items-center', isActive && 'text-(--o4-lilac)')}>
          {icon}
        </span>
      ) : null}
      <motion.span
        initial={false}
        animate={{ opacity: panel.collapsed ? 0 : 1, x: panel.collapsed ? -4 : 0 }}
        transition={context.reduce ? REDUCED_TRANSITION : panel.collapsed ? LABEL_EXIT_TRANSITION : LABEL_ENTER_TRANSITION}
        aria-hidden={panel.collapsed}
        className={cn('relative z-10 min-w-0 flex-1 truncate', panel.collapsed && 'pointer-events-none')}
      >
        {children}
      </motion.span>
      {badge !== undefined && !panel.collapsed ? (
        <span className="relative z-10 shrink-0 rounded-[4px] border border-border bg-background px-1.5 font-mono text-[11px] leading-[18px] tabular-nums text-muted-foreground">
          {badge}
        </span>
      ) : null}
      {ariaExpanded !== undefined ? (
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ opacity: panel.collapsed ? 0 : 1, rotate: ariaExpanded ? 90 : 0 }}
          transition={context.reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="relative z-10 grid size-4 shrink-0 place-items-center text-(--o4-subtle)"
        >
          <ChevronRight className="size-3.5" />
        </motion.span>
      ) : null}
    </>
  );

  const cls = cn(
    'relative flex h-8 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-left text-[13px] font-medium outline-none',
    'text-muted-foreground transition-colors hover:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring',
    isActive && 'text-foreground',
    className,
  );

  const common = {
    'aria-current': isActive ? ('page' as const) : undefined,
    'aria-expanded': ariaExpanded,
    'aria-label': panel.collapsed ? textLabel : undefined,
    title: panel.collapsed ? textLabel : undefined,
    onClick: select,
    whileTap: context.reduce ? undefined : { scale: 0.98 },
    transition: SPRING_PRESS,
    className: cls,
  };

  return href ? (
    <motion.a href={href} {...common}>
      {content}
    </motion.a>
  ) : (
    <motion.button type="button" {...common}>
      {content}
    </motion.button>
  );
}
