'use client';

/*
 * Paleta de comandos (⌘K). Base: 21st.dev #23522 "Command Palette" —
 * busca fuzzy com pontuação por fronteira de palavra, navegação por setas,
 * Home/End, Enter e Esc, camada animada com `motion/react`. Adaptado: grupos,
 * ícones, tokens da Noite Coral e copy em português.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const CELL = { type: 'spring', stiffness: 520, damping: 34, mass: 0.45 } as const;
const CROSSFADE = { type: 'spring', stiffness: 260, damping: 34, mass: 0.8 } as const;
const PANEL = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 } as const;
const LAYER_EASE = [0.23, 1, 0.32, 1] as const;
const LAYER_OUT = [0.4, 0, 1, 1] as const;
const BOUNDARY = /[\s\-_/.:]/;

export type PaletteGroup = 'Ir para' | 'MEDs' | 'Ações';

export interface PaletteItem {
  id: string;
  label: string;
  group: PaletteGroup;
  icon: LucideIcon;
  hint?: string;
  keywords?: string;
  shortcut?: string[];
}

function scoreOne(text: string, query: string): number {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let cursor = 0;
  let total = 0;
  let streak = 0;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i] ?? '';
    const at = t.indexOf(ch, cursor);
    if (at < 0) return -1;
    streak = at === cursor && i > 0 ? streak + 1 : 0;
    total += 2 + streak * 4;
    if (at === 0) total += 12;
    else if (BOUNDARY.test(t[at - 1] ?? '')) total += 8;
    cursor = at + 1;
  }
  return total;
}

function rank(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!q) return items;
  const scored: { item: PaletteItem; score: number; order: number }[] = [];
  items.forEach((item, i) => {
    const direct = scoreOne(item.label, q);
    const aliased = item.keywords ? scoreOne(item.keywords, q) - 3 : -1;
    const best = Math.max(direct, aliased);
    if (best < 0) return;
    scored.push({ item, score: best - item.label.length * 0.05, order: i });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map((s) => s.item);
}

interface CommandPaletteProps {
  open: boolean;
  items: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
  onDismiss: () => void;
}

export function CommandPalette({ open, items, onSelect, onDismiss }: CommandPaletteProps) {
  const reduced = Boolean(useReducedMotion());

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    };
    document.addEventListener('keydown', onKey, true);
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      root.style.overflow = overflow;
    };
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="nc-palette"
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          initial="closed"
          animate="open"
          exit="gone"
          variants={{ closed: {}, open: {}, gone: {} }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onDismiss();
          }}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            variants={{
              closed: { opacity: 0 },
              open: { opacity: 1, transition: reduced ? { duration: 0 } : { duration: 0.2, ease: LAYER_EASE } },
              gone: { opacity: 0, transition: reduced ? { duration: 0 } : { duration: 0.15, ease: LAYER_OUT } },
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            className="relative w-full max-w-[600px]"
            variants={{
              closed: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 },
              open: {
                opacity: 1,
                scale: 1,
                y: 0,
                transition: reduced ? { duration: 0 } : { ...PANEL, opacity: { duration: 0.16, ease: LAYER_EASE } },
              },
              gone: reduced
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.15, ease: LAYER_OUT } },
            }}
          >
            <PaletteSurface items={items} onSelect={onSelect} reduced={reduced} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PaletteSurface({
  items,
  onSelect,
  reduced,
}: {
  items: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
  reduced: boolean;
}) {
  const uid = useId();
  const [query, setQuery] = useState('');
  const [pinned, setPinned] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointer = useRef({ x: -1, y: -1 });

  const results = useMemo(() => rank(items, query), [items, query]);
  const activeId = results.some((r) => r.id === pinned) ? pinned : (results[0]?.id ?? null);
  const activeIndex = results.findIndex((r) => r.id === activeId);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  const reveal = (id: string) => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
    if (!list || !row) return;
    const top = row.offsetTop - 28;
    const bottom = row.offsetTop + row.offsetHeight + 6;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  };

  const jump = (index: number) => {
    if (results.length === 0) return;
    const next = results[Math.max(0, Math.min(results.length - 1, index))];
    if (!next) return;
    setPinned(next.id);
    reveal(next.id);
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    const from = activeIndex < 0 ? 0 : activeIndex;
    jump((from + delta + results.length) % results.length);
  };

  const run = (item?: PaletteItem) => {
    const target = item ?? results.find((r) => r.id === activeId);
    if (target) onSelect(target);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      jump(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      jump(results.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  };

  // Agrupa preservando a ordem do ranking: o grupo do melhor resultado vem primeiro.
  const grouped = useMemo(() => {
    const order: PaletteGroup[] = [];
    const map = new Map<PaletteGroup, PaletteItem[]>();
    for (const item of results) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
        order.push(item.group);
      }
      map.get(item.group)?.push(item);
    }
    return order.map((group) => ({ group, items: map.get(group) ?? [] }));
  }, [results]);

  const count = results.length;

  return (
    <div className="overflow-hidden rounded-(--radius) border border-(--nc-line) bg-(--nc-surface) shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex h-13 items-center gap-3 border-b border-(--nc-line) px-4">
        <Search aria-hidden className="size-4 shrink-0 text-(--nc-text-3)" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Buscar comandos e MEDs"
          aria-expanded
          aria-controls={`${uid}-list`}
          aria-autocomplete="list"
          aria-activedescendant={activeId ? `${uid}-${activeId}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder="Buscar MED por pagador ou end-to-end, ir para, executar…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] text-(--nc-text) outline-none placeholder:text-(--nc-text-3)"
        />
        <kbd className="hidden h-5 items-center rounded-md border border-(--nc-line) px-1.5 font-mono text-[10px] text-(--nc-text-3) sm:inline-flex">
          Esc
        </kbd>
      </div>

      <div className="relative h-[min(380px,52vh)]">
        <ul
          ref={listRef}
          id={`${uid}-list`}
          role="listbox"
          aria-label="Resultados"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-0 overflow-y-auto overscroll-contain p-1.5 [scrollbar-gutter:stable]"
        >
          {grouped.map(({ group, items: groupItems }) => (
            <li key={group} role="presentation">
              <p className="px-2.5 pt-2.5 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-(--nc-text-3) uppercase">
                {group}
              </p>
              <ul role="group" aria-label={group} className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const active = item.id === activeId;
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.id}
                      id={`${uid}-${item.id}`}
                      data-item-id={item.id}
                      role="option"
                      aria-selected={active}
                      layout={reduced ? false : 'position'}
                      transition={reduced ? { duration: 0 } : CELL}
                      onPointerMove={(event) => {
                        const { x, y } = pointer.current;
                        if (event.clientX === x && event.clientY === y) return;
                        pointer.current = { x: event.clientX, y: event.clientY };
                        if (item.id !== activeId) setPinned(item.id);
                      }}
                      onClick={() => run(item)}
                      className="relative flex h-10 shrink-0 cursor-default items-center rounded-[9px] px-2.5"
                    >
                      <motion.span
                        aria-hidden
                        initial={false}
                        animate={{ opacity: active ? 1 : 0 }}
                        transition={reduced ? { duration: 0 } : CROSSFADE}
                        className="absolute inset-0 rounded-[9px] bg-(--nc-surface-3) shadow-[inset_2px_0_0_var(--nc-coral)]"
                      />
                      <span className="relative flex min-w-0 flex-1 items-center gap-3">
                        <Icon
                          aria-hidden
                          className={cn('size-4 shrink-0', active ? 'text-(--nc-coral)' : 'text-(--nc-text-3)')}
                        />
                        <span className="truncate text-[13.5px] font-medium text-(--nc-text)">{item.label}</span>
                        {item.hint ? (
                          <span className="hidden truncate font-mono text-[11.5px] text-(--nc-text-3) sm:inline">
                            {item.hint}
                          </span>
                        ) : null}
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          {item.shortcut?.map((key) => (
                            <kbd
                              key={key}
                              className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-(--nc-line) px-1 font-mono text-[10px] text-(--nc-text-3)"
                            >
                              {key}
                            </kbd>
                          ))}
                          {active ? <CornerDownLeft aria-hidden className="size-3.5 text-(--nc-text-3)" /> : null}
                        </span>
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {count === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-[13px] text-(--nc-text-3)">
            Nada encontrado para “{query}”.
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 border-t border-(--nc-line) bg-(--nc-bg)/40 px-4 py-2.5 text-[11.5px] text-(--nc-text-3)">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-(--nc-line) px-1 font-mono text-[10px]">↑</kbd>
          <kbd className="rounded border border-(--nc-line) px-1 font-mono text-[10px]">↓</kbd>
          navegar
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-(--nc-line) px-1 font-mono text-[10px]">Enter</kbd>
          abrir
        </span>
        <span className="ml-auto tabular-nums" role="status" aria-live="polite">
          {count} {count === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>
    </div>
  );
}
