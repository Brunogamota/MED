'use client';

/*
 * Console "Noite Coral". Trilho de ícones à esquerda (referência do estado
 * recolhido: 21st.dev #14941 "Dashboard Sidebar"), barra superior com trilha e
 * gatilho da paleta ⌘K, indicadores, gráfico de entrada, fila e o resumo do MED
 * numa gaveta lateral.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  Command as CommandIcon,
  FileUp,
  Info,
  Menu,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MEDS, RESUMO, STATUS_LABEL, brl, prazo, type PreviewMed } from '@/components/previews/marketplace/fixtures';
import { NOITE_FONT_CLASS, NOITE_STYLE } from './theme';
import { COMPROVANTE_HREF, NAV_GROUPS, NAV_ITEMS, e2eCurto, type NavId } from './shared';
import { CommandPalette, type PaletteItem } from './command-palette';
import { KpiCards } from './kpi-cards';
import { EntradaChart } from './entrada-chart';
import { FilaTable, type FilaFiltro } from './fila-table';
import { MedSheet } from './med-sheet';

const ACCOUNT = 'Marketplace Verificado';

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 place-items-center rounded-[10px] bg-gradient-to-b from-(--nc-coral) to-(--nc-coral-hover) text-(--primary-foreground) shadow-[0_6px_20px_-8px_var(--nc-coral),inset_0_1px_0_rgba(255,255,255,0.25)]',
        className,
      )}
    >
      <ShieldCheck className="size-[18px]" strokeWidth={2.2} />
    </span>
  );
}

/* ---------------------------------------------------------------- trilho */

function IconRail({ active, onGo }: { active: NavId; onGo: (id: NavId) => void }) {
  const reduced = useReducedMotion();
  return (
    <aside
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col items-center border-r border-(--nc-line) bg-(--nc-bg) py-4 md:flex"
    >
      <BrandMark />
      <nav className="mt-6 flex flex-1 flex-col items-center gap-5">
        {NAV_GROUPS.map((group) => (
          <ul key={group.heading} aria-label={group.heading} className="flex flex-col items-center gap-1">
            {group.items.map((item) => {
              const isActive = active === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id} className="relative">
                  {isActive ? (
                    <motion.span
                      layoutId="nc-rail-indicator"
                      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                      aria-hidden
                      className="absolute top-1/2 -left-[14px] h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-(--nc-coral) shadow-[0_0_12px_var(--nc-coral)]"
                    />
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={item.count !== undefined ? `${item.label} (${item.count})` : item.label}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onGo(item.id)}
                        className={cn(
                          'relative grid size-10 place-items-center rounded-[10px] transition-colors focus-visible:ring-2 focus-visible:ring-(--nc-coral)/60 focus-visible:outline-none',
                          isActive
                            ? 'bg-(--nc-coral)/12 text-(--nc-coral)'
                            : 'text-(--nc-text-3) hover:bg-(--nc-surface-2) hover:text-(--nc-text)',
                        )}
                      >
                        <Icon aria-hidden className="size-[18px]" strokeWidth={1.8} />
                        {item.count !== undefined ? (
                          <span
                            aria-hidden
                            className={cn(
                              'absolute -top-1 -right-1.5 min-w-[18px] rounded-full px-1 py-px text-center font-mono text-[9.5px] leading-[14px] font-medium tabular-nums ring-2 ring-(--nc-bg)',
                              item.urgent ? 'bg-(--nc-warning) text-(--nc-bg)' : 'bg-(--nc-surface-3) text-(--nc-text-2)',
                            )}
                          >
                            {item.count}
                          </span>
                        ) : null}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={10}
                      style={NOITE_STYLE}
                      className={cn(NOITE_FONT_CLASS, 'bg-(--nc-surface-3) font-sans text-[12.5px] text-(--nc-text) [&>svg]:bg-(--nc-surface-3) [&>svg]:fill-(--nc-surface-3)')}
                    >
                      {item.label}
                      {item.count !== undefined ? (
                        <span className="font-mono text-(--nc-text-3) tabular-nums">{item.count}</span>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------- menu do celular */

function MobileNav({
  open,
  onOpenChange,
  active,
  onGo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  active: NavId;
  onGo: (id: NavId) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        style={NOITE_STYLE}
        className={cn(NOITE_FONT_CLASS, 'gap-0 border-(--nc-line) bg-(--nc-bg) p-0 font-sans text-(--nc-text) data-[side=left]:w-[300px] data-[side=left]:max-w-[85vw]')}
      >
        <div className="flex items-center gap-3 border-b border-(--nc-line) p-4">
          <BrandMark />
          <div>
            <SheetTitle className="text-[14px] font-semibold text-(--nc-text)">{ACCOUNT}</SheetTitle>
            <SheetDescription className="text-[12px] text-(--nc-text-3)">Defesa de MED</SheetDescription>
          </div>
        </div>
        <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="mb-4">
              <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-(--nc-text-3) uppercase">
                {group.heading}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === active;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          onOpenChange(false);
                          onGo(item.id);
                        }}
                        className={cn(
                          'flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors',
                          isActive
                            ? 'bg-(--nc-coral)/12 text-(--nc-coral)'
                            : 'text-(--nc-text-2) hover:bg-(--nc-surface-2) hover:text-(--nc-text)',
                        )}
                      >
                        <Icon aria-hidden className="size-[18px]" strokeWidth={1.8} />
                        {item.label}
                        {item.count !== undefined ? (
                          <span
                            className={cn(
                              'ml-auto font-mono text-[12px] tabular-nums',
                              item.urgent ? 'text-(--nc-warning)' : 'text-(--nc-text-3)',
                            )}
                          >
                            {item.count}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------ barra superior */

function TopBar({
  activeLabel,
  onMenu,
  onPalette,
}: {
  activeLabel: string;
  onMenu: () => void;
  onPalette: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-(--nc-line) bg-(--nc-bg)/80 px-4 backdrop-blur-xl md:px-8">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenu}
        className="grid size-9 place-items-center rounded-lg text-(--nc-text-2) hover:bg-(--nc-surface-2) md:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      <nav aria-label="Trilha" className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Conta ativa: ${ACCOUNT}. Trocar conta`}
              className="flex min-w-0 items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-(--nc-surface-2) aria-expanded:bg-(--nc-surface-2)"
            >
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-md bg-(--nc-coral)/15 text-(--nc-coral)"
              >
                <ShieldCheck className="size-3.5" strokeWidth={2.2} />
              </span>
              <span className="hidden truncate font-medium text-(--nc-text) sm:inline">{ACCOUNT}</span>
              <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-(--nc-text-3)" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            style={NOITE_STYLE}
            className={cn(NOITE_FONT_CLASS, 'w-64 border border-(--nc-line) font-sans')}
          >
            <DropdownMenuLabel className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Conta</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2.5 py-2">
              <BrandMark className="size-7 rounded-lg [&_svg]:size-3.5" />
              <span className="flex-1 font-medium">{ACCOUNT}</span>
              <Check aria-hidden className="size-4 text-(--nc-coral)" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span aria-hidden className="text-(--nc-line)">
          /
        </span>
        <span aria-current="page" className="truncate font-medium text-(--nc-text)">
          {activeLabel}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onPalette}
          aria-label="Abrir paleta de comandos"
          aria-keyshortcuts="Meta+K Control+K"
          className="group flex h-9 items-center gap-2.5 rounded-lg border border-(--nc-line) bg-(--nc-surface) px-2.5 text-[13px] text-(--nc-text-3) transition-colors hover:border-(--nc-surface-3) hover:text-(--nc-text-2) sm:w-[300px]"
        >
          <Search aria-hidden className="size-4" />
          <span className="hidden flex-1 text-left sm:inline">Buscar MEDs, telas e ações</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <kbd className="grid h-5 min-w-5 place-items-center rounded-[5px] border border-(--nc-line) bg-(--nc-bg) px-1 font-mono text-[11px]">
              <CommandIcon className="size-3" aria-hidden />
            </kbd>
            <kbd className="grid h-5 min-w-5 place-items-center rounded-[5px] border border-(--nc-line) bg-(--nc-bg) px-1 font-mono text-[11px]">
              K
            </kbd>
          </span>
        </button>
      </div>
    </header>
  );
}

/* ----------------------------------------------------- vencendo primeiro */

function VencendoPrimeiro({ onOpen }: { onOpen: (m: PreviewMed) => void }) {
  const lista = useMemo(
    () =>
      [...MEDS]
        .filter((m) => m.status !== 'ENVIADO')
        .sort((a, b) => a.prazoHoras - b.prazoHoras)
        .slice(0, 5),
    [],
  );
  return (
    <section
      aria-labelledby="nc-urgentes-titulo"
      className="flex h-full flex-col rounded-(--radius) border border-(--nc-line) bg-(--nc-surface)"
    >
      <header className="flex items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h2 id="nc-urgentes-titulo" className="text-[15px] font-semibold tracking-[-0.01em]">
            Vencendo primeiro
          </h2>
          <p className="mt-1 text-[13px] text-(--nc-text-3)">Menor prazo de resposta, ainda não enviados</p>
        </div>
      </header>
      <ul className="flex-1 px-2 pb-2">
        {lista.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-(--nc-surface-2)"
            >
              <span
                className={cn(
                  'w-14 shrink-0 font-mono text-[13px] tabular-nums',
                  m.prazoHoras < 12 ? 'text-(--nc-error)' : m.prazoHoras < 24 ? 'text-(--nc-warning)' : 'text-(--nc-text-2)',
                )}
              >
                {prazo(m.prazoHoras)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{m.pagador}</span>
                <span className="block truncate text-[12px] text-(--nc-text-3)">{STATUS_LABEL[m.status]}</span>
              </span>
              <span className="shrink-0 font-mono text-[13px] text-(--nc-text-2) tabular-nums">{brl(m.valor)}</span>
              <ArrowRight
                aria-hidden
                className="size-3.5 shrink-0 text-(--nc-text-3) opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- aviso */

function Aviso({ texto, onClose }: { texto: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!texto) return;
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [texto, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {texto ? (
          <motion.div
            key={texto}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-(--radius) border border-(--nc-line) bg-(--nc-surface-2) p-3.5 pr-2.5 text-[13px] text-(--nc-text-2) shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
          >
            <Info aria-hidden className="mt-px size-4 shrink-0 text-(--nc-sand)" />
            <p className="flex-1">{texto}</p>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={onClose}
              className="grid size-6 place-items-center rounded-md text-(--nc-text-3) hover:bg-(--nc-surface-3) hover:text-(--nc-text)"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- console */

export function NoiteCoralConsole() {
  const router = useRouter();
  const [active, setActive] = useState<NavId>('visao-geral');
  const [filtro, setFiltro] = useState<FilaFiltro>('todos');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<PreviewMed | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const fecharAviso = useCallback(() => setAviso(null), []);
  const fecharPaleta = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const irParaFila = () => {
    window.setTimeout(() => document.getElementById('nc-fila')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const go = (id: NavId) => {
    const item = NAV_ITEMS.find((n) => n.id === id);
    switch (id) {
      case 'visao-geral':
        setActive(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      case 'contestacoes':
        setActive(id);
        setFiltro('todos');
        irParaFila();
        return;
      case 'vencendo':
        setActive(id);
        setFiltro('vencendo');
        irParaFila();
        return;
      case 'comprovantes':
        router.push(COMPROVANTE_HREF);
        return;
      default:
        setAviso(`Prévia: a tela “${item?.label ?? ''}” não faz parte desta direção visual.`);
    }
  };

  const gerar = (ids: string[]) => {
    setAberto(null);
    setAviso(
      ids.length > 0
        ? `Prévia: ${ids.length} ${ids.length === 1 ? 'defesa seria gerada' : 'defesas seriam geradas'} a partir das evidências de cada MED. Nada foi gerado aqui.`
        : 'Prévia: selecione MEDs na fila para gerar as defesas. Nada é gerado nesta tela.',
    );
  };

  const paletteItems = useMemo<PaletteItem[]>(
    () => [
      ...NAV_ITEMS.map((n) => ({
        id: `nav-${n.id}`,
        label: n.label,
        group: 'Ir para' as const,
        icon: n.icon,
        hint: n.count !== undefined ? String(n.count) : undefined,
      })),
      ...MEDS.map((m) => ({
        id: `med-${m.id}`,
        label: m.pagador,
        group: 'MEDs' as const,
        icon: ReceiptText,
        hint: `${e2eCurto(m.e2e)} · ${brl(m.valor)}`,
        keywords: `${m.e2e} ${STATUS_LABEL[m.status]} ${m.produto}`,
      })),
      {
        id: 'acao-gerar',
        label: 'Gerar defesas dos selecionados',
        group: 'Ações' as const,
        icon: Sparkles,
        keywords: 'defesa gerar criar',
      },
      {
        id: 'acao-importar',
        label: 'Importar arquivo de MEDs',
        group: 'Ações' as const,
        icon: FileUp,
        keywords: 'csv planilha adquirente upload',
      },
      {
        id: 'acao-comprovante',
        label: 'Abrir comprovante de envio',
        group: 'Ações' as const,
        icon: ReceiptText,
        keywords: 'e-mail recibo envio',
      },
    ],
    [],
  );

  const onPaletteSelect = (item: PaletteItem) => {
    setPaletteOpen(false);
    if (item.id.startsWith('nav-')) {
      go(item.id.slice(4) as NavId);
    } else if (item.id.startsWith('med-')) {
      const med = MEDS.find((m) => `med-${m.id}` === item.id) ?? null;
      setAberto(med);
    } else if (item.id === 'acao-gerar') {
      gerar([...selected]);
    } else if (item.id === 'acao-importar') {
      go('importar-meds');
    } else if (item.id === 'acao-comprovante') {
      router.push(COMPROVANTE_HREF);
    }
  };

  const activeLabel = NAV_ITEMS.find((n) => n.id === active)?.label ?? 'Visão geral';

  return (
    <div className="relative min-h-screen">
      {/* Brilho coral discreto no topo: dá profundidade sem virar decoração. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_70%_0%,color-mix(in_oklab,var(--nc-coral)_9%,transparent),transparent)]"
      />

      <IconRail active={active} onGo={go} />
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} active={active} onGo={go} />

      <div className="relative md:pl-[68px]">
        <TopBar activeLabel={activeLabel} onMenu={() => setMenuOpen(true)} onPalette={() => setPaletteOpen(true)} />

        <main className="mx-auto max-w-[1360px] px-4 pt-7 pb-16 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.1em] text-(--nc-coral) uppercase">
                <span aria-hidden className="size-1.5 rounded-full bg-(--nc-coral) shadow-[0_0_10px_var(--nc-coral)]" />
                Defesa de MED
              </p>
              <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.03em] md:text-[32px]">Visão geral</h1>
              <p className="mt-1 text-[14px] text-(--nc-text-2)">
                <span className="font-mono text-(--nc-text) tabular-nums">{RESUMO.emAberto}</span> contestações em aberto,{' '}
                <span className="font-mono text-(--nc-warning) tabular-nums">{RESUMO.vencendo24h}</span> vencem nas próximas 24 horas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go('importar-meds')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-(--nc-line) bg-(--nc-surface) px-3.5 text-[14px] text-(--nc-text-2) transition-colors hover:border-(--nc-surface-3) hover:text-(--nc-text)"
              >
                <FileUp aria-hidden className="size-4" />
                Importar MEDs
              </button>
              <button
                type="button"
                onClick={() => gerar([...selected])}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-(--nc-coral) px-4 text-[14px] font-medium text-(--primary-foreground) shadow-[0_10px_30px_-12px_var(--nc-coral),inset_0_1px_0_rgba(255,255,255,0.25)] transition-colors hover:bg-(--nc-coral-hover) sm:flex-none"
              >
                <Sparkles aria-hidden className="size-4" />
                Gerar defesas
                {selected.size > 0 ? (
                  <span className="rounded-md bg-black/15 px-1.5 font-mono text-[12px] tabular-nums">{selected.size}</span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="mt-7">
            <KpiCards />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
            <EntradaChart />
            <VencendoPrimeiro onOpen={setAberto} />
          </div>

          <div className="mt-3">
            <FilaTable
              filtro={filtro}
              onFiltroChange={setFiltro}
              selected={selected}
              onSelectedChange={setSelected}
              onOpen={setAberto}
            />
          </div>
        </main>
      </div>

      <MedSheet med={aberto} onOpenChange={(o) => !o && setAberto(null)} onGerar={gerar} />
      <CommandPalette open={paletteOpen} items={paletteItems} onSelect={onPaletteSelect} onDismiss={fecharPaleta} />
      <Aviso texto={aviso} onClose={fecharAviso} />
    </div>
  );
}

