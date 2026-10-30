'use client';

/*
 * Fila de MEDs. Base: 21st.dev #28327 "Data Table" — busca global, ordenação,
 * seleção por checkbox (página inteira com estado indeterminado), selos de
 * status e paginação. O original usa @tanstack/react-table, que não está no
 * projeto: a mesma mecânica foi refeita com estado local. No celular a tabela
 * vira lista, em vez de rolar de lado.
 */

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MEDS, STATUS_LABEL, brl, prazo, type PreviewMed, type PreviewStatus } from '@/components/previews/marketplace/fixtures';
import { NOITE_FONT_CLASS, NOITE_STYLE } from './theme';
import { ScoreMeter, StatusBadge, e2eCurto } from './shared';

export type FilaFiltro = 'todos' | 'vencendo' | 'prontos' | 'sem-envio';
type SortKey = 'pagador' | 'valor' | 'prazoHoras' | 'score';
type SortDir = 'asc' | 'desc';

const FILTROS: { id: FilaFiltro; label: string; test: (m: PreviewMed) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'vencendo', label: 'Vencendo em 24h', test: (m) => m.prazoHoras < 24 },
  { id: 'prontos', label: 'Prontos', test: (m) => m.status === 'PRONTO' },
  { id: 'sem-envio', label: 'Sem envio', test: (m) => m.status === 'SEM_ENVIO' },
];

const PAGE_SIZE = 5;

function PrazoCell({ horas }: { horas: number }) {
  const tone = horas < 12 ? 'text-(--nc-error)' : horas < 24 ? 'text-(--nc-warning)' : 'text-(--nc-text-2)';
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-[13px] tabular-nums', tone)}>
      {horas < 24 ? <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {prazo(horas)}
    </span>
  );
}

function ProdutoCell({ produto }: { produto: PreviewMed['produto'] }) {
  const Icon = produto === 'Físico' ? Package : Download;
  return (
    <span className="inline-flex items-center gap-1.5 text-(--nc-text-2)">
      <Icon aria-hidden className="size-3.5 text-(--nc-text-3)" />
      {produto}
    </span>
  );
}

function SortHead({
  k,
  sort,
  onSort,
  children,
  align = 'left',
}: {
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('h-10 px-3 font-medium', align === 'right' && 'text-right')}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md py-1 transition-colors hover:text-(--nc-text) focus-visible:ring-2 focus-visible:ring-(--nc-coral)/50 focus-visible:outline-none',
          active && 'text-(--nc-text)',
        )}
      >
        {children}
        <Icon aria-hidden className={cn('size-3', active ? 'text-(--nc-coral)' : 'opacity-50')} />
      </button>
    </th>
  );
}

interface FilaTableProps {
  filtro: FilaFiltro;
  onFiltroChange: (f: FilaFiltro) => void;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  onOpen: (med: PreviewMed) => void;
}

export function FilaTable({ filtro, onFiltroChange, selected, onSelectedChange, onOpen }: FilaTableProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<Set<PreviewStatus>>(new Set());
  const [produtoFiltro, setProdutoFiltro] = useState<Set<PreviewMed['produto']>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'prazoHoras', dir: 'asc' });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const teste = FILTROS.find((f) => f.id === filtro)?.test ?? (() => true);
    const out = MEDS.filter(teste)
      .filter((m) => statusFiltro.size === 0 || statusFiltro.has(m.status))
      .filter((m) => produtoFiltro.size === 0 || produtoFiltro.has(m.produto))
      .filter(
        (m) =>
          !q ||
          m.pagador.toLowerCase().includes(q) ||
          m.e2e.toLowerCase().includes(q) ||
          STATUS_LABEL[m.status].toLowerCase().includes(q),
      );
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'pt-BR') * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [busca, filtro, statusFiltro, produtoFiltro, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const pageIds = pageRows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));
  const filtrosAtivos = statusFiltro.size + produtoFiltro.size;

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelectedChange(next);
  };

  const togglePage = (on: boolean) => {
    const next = new Set(selected);
    pageIds.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onSelectedChange(next);
  };

  const setSortKey = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'pagador' ? 'asc' : 'desc' }));
  };

  return (
    <section
      id="nc-fila"
      aria-labelledby="nc-fila-titulo"
      className="scroll-mt-20 overflow-hidden rounded-(--radius) border border-(--nc-line) bg-(--nc-surface)"
    >
      <header className="flex flex-col gap-4 border-b border-(--nc-line) p-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="nc-fila-titulo" className="text-[15px] font-semibold tracking-[-0.01em]">
              Fila de contestações
            </h2>
            <p className="mt-1 text-[13px] text-(--nc-text-3)">Ordenada pelo prazo de resposta. Clique numa linha para ver o resumo.</p>
          </div>
          {selected.size > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-(--nc-coral)/30 bg-(--nc-coral)/8 py-1 pr-1 pl-3 text-[13px]">
              <span className="font-medium text-(--nc-text) tabular-nums">
                {selected.size} {selected.size === 1 ? 'selecionado' : 'selecionados'}
              </span>
              <button
                type="button"
                onClick={() => onSelectedChange(new Set())}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-3) hover:text-(--nc-text)"
              >
                <X aria-hidden className="size-3.5" />
                Limpar
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Recorte da fila" className="flex gap-1 overflow-x-auto rounded-lg bg-(--nc-bg) p-1 [scrollbar-width:none]">
            {FILTROS.map((f) => {
              const active = filtro === f.id;
              const n = MEDS.filter(f.test).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    onFiltroChange(f.id);
                    setPage(0);
                  }}
                  className={cn(
                    'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] whitespace-nowrap transition-colors',
                    active
                      ? 'bg-(--nc-surface-3) text-(--nc-text) shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'text-(--nc-text-3) hover:text-(--nc-text-2)',
                  )}
                >
                  {f.label}
                  <span className={cn('font-mono text-[11px] tabular-nums', active ? 'text-(--nc-coral)' : 'text-(--nc-text-3)')}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 items-center gap-2 lg:justify-end">
            <label className="relative flex-1 lg:max-w-[300px]">
              <span className="sr-only">Buscar na fila</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-(--nc-text-3)" />
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(0);
                }}
                placeholder="Pagador, end-to-end ou status"
                className="h-8 w-full rounded-lg border border-(--nc-line) bg-(--nc-bg) pr-3 pl-8 text-[13px] text-(--nc-text) transition-colors outline-none placeholder:text-(--nc-text-3) focus:border-(--nc-coral)/60 focus:ring-3 focus:ring-(--nc-coral)/15"
              />
            </label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-(--nc-line) bg-(--nc-bg) px-2.5 text-[13px] text-(--nc-text-2) transition-colors hover:text-(--nc-text) aria-expanded:text-(--nc-text)',
                    filtrosAtivos > 0 && 'border-(--nc-coral)/40 text-(--nc-text)',
                  )}
                >
                  <SlidersHorizontal aria-hidden className="size-3.5" />
                  Filtros
                  {filtrosAtivos > 0 ? (
                    <span className="grid size-4 place-items-center rounded-full bg-(--nc-coral) font-mono text-[10px] text-(--primary-foreground)">
                      {filtrosAtivos}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={NOITE_STYLE}
                className={cn(NOITE_FONT_CLASS, 'w-56 border border-(--nc-line) font-sans')}
              >
                <DropdownMenuLabel className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Status</DropdownMenuLabel>
                {(Object.keys(STATUS_LABEL) as PreviewStatus[]).map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFiltro.has(s)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => {
                      const next = new Set(statusFiltro);
                      if (on) next.add(s);
                      else next.delete(s);
                      setStatusFiltro(next);
                      setPage(0);
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Produto</DropdownMenuLabel>
                {(['Físico', 'Digital'] as const).map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p}
                    checked={produtoFiltro.has(p)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => {
                      const next = new Set(produtoFiltro);
                      if (on) next.add(p);
                      else next.delete(p);
                      setProdutoFiltro(next);
                      setPage(0);
                    }}
                  >
                    {p}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[13.5px]">
          <thead className="text-left text-[12px] text-(--nc-text-3)">
            <tr className="border-b border-(--nc-line)">
              <th scope="col" className="h-10 w-10 pl-5">
                <Checkbox
                  aria-label="Selecionar todos desta página"
                  checked={allOnPage ? true : someOnPage ? 'indeterminate' : false}
                  onCheckedChange={(v) => togglePage(v === true)}
                />
              </th>
              <th scope="col" className="h-10 px-3 font-medium">End-to-end</th>
              <SortHead sort={sort} onSort={setSortKey} k="pagador">Pagador</SortHead>
              <th scope="col" className="h-10 px-3 font-medium">Produto</th>
              <SortHead sort={sort} onSort={setSortKey} k="valor" align="right">Valor</SortHead>
              <SortHead sort={sort} onSort={setSortKey} k="prazoHoras">Prazo</SortHead>
              <th scope="col" className="h-10 px-3 font-medium">Status</th>
              <SortHead sort={sort} onSort={setSortKey} k="score">Score</SortHead>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m) => {
              const isSel = selected.has(m.id);
              return (
                <tr
                  key={m.id}
                  data-state={isSel ? 'selected' : undefined}
                  onClick={() => onOpen(m)}
                  className={cn(
                    'group cursor-pointer border-b border-(--nc-line)/70 transition-colors last:border-0 hover:bg-(--nc-surface-2)',
                    isSel && 'bg-(--nc-coral)/[0.06] hover:bg-(--nc-coral)/[0.09]',
                  )}
                >
                  <td className="relative h-14 pl-5" onClick={(e) => e.stopPropagation()}>
                    {isSel ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-(--nc-coral)" /> : null}
                    <Checkbox
                      aria-label={`Selecionar MED de ${m.pagador}`}
                      checked={isSel}
                      onCheckedChange={(v) => toggle(m.id, v === true)}
                    />
                  </td>
                  <td className="px-3">
                    <span className="font-mono text-[12.5px] text-(--nc-text-2)" title={m.e2e}>
                      {e2eCurto(m.e2e)}
                    </span>
                  </td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(m);
                      }}
                      className="rounded font-medium text-(--nc-text) underline-offset-4 group-hover:underline focus-visible:ring-2 focus-visible:ring-(--nc-coral)/50 focus-visible:outline-none"
                    >
                      {m.pagador}
                    </button>
                  </td>
                  <td className="px-3">
                    <ProdutoCell produto={m.produto} />
                  </td>
                  <td className="px-3 text-right font-mono tabular-nums">{brl(m.valor)}</td>
                  <td className="px-3">
                    <PrazoCell horas={m.prazoHoras} />
                  </td>
                  <td className="px-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-3 pr-5">
                    <ScoreMeter score={m.score} />
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-32 text-center text-(--nc-text-3)">
                  Nenhum MED corresponde a esse recorte.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Celular: lista */}
      <ul className="divide-y divide-(--nc-line) md:hidden">
        {pageRows.map((m) => {
          const isSel = selected.has(m.id);
          return (
            <li key={m.id} className={cn('flex gap-3 px-4 py-3.5', isSel && 'bg-(--nc-coral)/[0.06]')}>
              <Checkbox
                className="mt-1"
                aria-label={`Selecionar MED de ${m.pagador}`}
                checked={isSel}
                onCheckedChange={(v) => toggle(m.id, v === true)}
              />
              <button type="button" onClick={() => onOpen(m)} className="min-w-0 flex-1 text-left">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{m.pagador}</span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums">{brl(m.valor)}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-3 text-[12px] text-(--nc-text-3)">
                  <span className="truncate font-mono">{e2eCurto(m.e2e)}</span>
                  <PrazoCell horas={m.prazoHoras} />
                </span>
                <span className="mt-2.5 flex items-center justify-between gap-3">
                  <StatusBadge status={m.status} />
                  <ScoreMeter score={m.score} />
                </span>
              </button>
            </li>
          );
        })}
        {pageRows.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-(--nc-text-3)">Nenhum MED corresponde a esse recorte.</li>
        ) : null}
      </ul>

      <footer className="flex flex-col gap-3 border-t border-(--nc-line) px-5 py-3 text-[12.5px] text-(--nc-text-3) sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular-nums">
          {rows.length === 0
            ? 'Nenhum resultado'
            : `Mostrando ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, rows.length)} de ${rows.length} nesta amostra`}
        </p>
        <nav aria-label="Paginação" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="grid size-8 place-items-center rounded-lg border border-(--nc-line) text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-2) disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para a página ${i + 1}`}
              aria-current={i === safePage ? 'page' : undefined}
              onClick={() => setPage(i)}
              className={cn(
                'grid size-8 place-items-center rounded-lg border font-mono text-[12px] tabular-nums transition-colors',
                i === safePage
                  ? 'border-(--nc-coral)/50 bg-(--nc-coral)/12 text-(--nc-coral)'
                  : 'border-(--nc-line) text-(--nc-text-2) hover:bg-(--nc-surface-2)',
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            aria-label="Próxima página"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="grid size-8 place-items-center rounded-lg border border-(--nc-line) text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-2) disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
