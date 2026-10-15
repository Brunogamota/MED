'use client';

/**
 * Fila de contestações — adaptado de 21st.dev #28327 "Data Table".
 *
 * O original usa @tanstack/react-table, que não está instalado aqui; busca,
 * ordenação, seleção e paginação foram refeitas com estado local, mantendo a
 * mesma anatomia: barra de ferramentas, tabela com seleção por linha, selo de
 * status, menu de ações por linha e paginação numerada.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Receipt,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  COMPROVANTE,
  MEDS,
  STATUS_LABEL,
  brl,
  prazo,
  type PreviewMed,
  type PreviewStatus,
} from '@/components/previews/fixtures';
import { StatusBadge } from './status-badge';
import { O1_SCOPE } from './theme';

type SortKey = 'pagador' | 'valor' | 'prazoHoras' | 'score';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };
type Filter = 'TODOS' | PreviewStatus;

const FILTERS: Filter[] = ['TODOS', 'PRONTO', 'SEM_ENVIO', 'DEFESA', 'COLETANDO', 'ENVIADO'];

function filterLabel(f: Filter): string {
  return f === 'TODOS' ? 'Todos' : STATUS_LABEL[f];
}

function shortE2e(e2e: string): string {
  return `${e2e.slice(0, 9)}…${e2e.slice(-6)}`;
}

function scoreTone(score: number): { bar: string; text: string } {
  if (score >= 75) return { bar: 'bg-(--o1-success)', text: 'text-(--o1-success)' };
  if (score >= 50) return { bar: 'bg-(--o1-warning)', text: 'text-(--o1-warning)' };
  return { bar: 'bg-(--o1-error)', text: 'text-[#F87171]' };
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  column: SortKey;
  sort: Sort | null;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort?.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        '-mx-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 outline-none transition-colors hover:bg-white/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
        active ? 'text-foreground' : 'text-muted-foreground',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon className={cn('size-3.5', active ? 'text-(--o1-lilac)' : 'opacity-50')} aria-hidden="true" />
    </button>
  );
}

function ariaSort(sort: Sort | null, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort?.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}

function RowActions({ med }: { med: PreviewMed }) {
  const temComprovante = med.e2e === COMPROVANTE.e2e;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" aria-label={`Ações para o MED de ${med.pagador}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn(O1_SCOPE, 'w-52 border border-border/70')}>
        <DropdownMenuItem>
          <Eye />
          Abrir MED
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileText />
          Gerar defesa
        </DropdownMenuItem>
        {temComprovante && (
          <DropdownMenuItem asChild>
            <Link href="/preview/bulls/opcao-1/comprovante">
              <Receipt />
              Ver comprovante de envio
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(med.e2e)}>
          <Copy />
          Copiar end-to-end
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function QueueTable() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('TODOS');
  const [sort, setSort] = useState<Sort | null>({ key: 'prazoHoras', dir: 'asc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { TODOS: MEDS.length, PRONTO: 0, SEM_ENVIO: 0, DEFESA: 0, COLETANDO: 0, ENVIADO: 0 };
    for (const m of MEDS) c[m.status] += 1;
    return c;
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MEDS.filter(
      (m) => (filter === 'TODOS' || m.status === filter) && (!q || m.pagador.toLowerCase().includes(q) || m.e2e.toLowerCase().includes(q)),
    );
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'pt-BR') * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [query, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someOnPage = pageRows.some((r) => selected.has(r.id));
  const selectedTotal = MEDS.filter((m) => selected.has(m.id)).reduce((a, m) => a + m.valor, 0);

  const onSort = (key: SortKey) => {
    setSort((s) => (s?.key !== key ? { key, dir: key === 'prazoHoras' ? 'asc' : 'desc' } : s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }));
  };

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const togglePage = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (on) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  const resetFilters = () => {
    setQuery('');
    setFilter('TODOS');
    setPage(0);
  };

  const from = rows.length ? current * pageSize + 1 : 0;
  const to = Math.min((current + 1) * pageSize, rows.length);

  return (
    <section
      id="fila"
      aria-labelledby="o1-fila"
      className="scroll-mt-20 overflow-hidden rounded-xl border border-white/[0.07] bg-card shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]"
    >
      <header className="flex flex-col gap-4 px-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="o1-fila" className="text-[14px] font-medium text-foreground">
              Fila de contestações
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Ordenada pelo prazo de resposta. Selecione para agir em lote.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <label htmlFor="o1-busca" className="sr-only">
              Buscar por pagador ou end-to-end
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="o1-busca"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar pagador ou end-to-end"
              className="h-8 border-white/[0.08] bg-background/60 pl-8 text-[13px]"
            />
          </div>
        </div>

        <div role="group" aria-label="Filtrar por status" className="-mx-5 flex gap-1 overflow-x-auto border-b border-white/[0.06] px-5 [scrollbar-width:none]">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
                className={cn(
                  'relative flex h-9 shrink-0 items-center gap-2 rounded-t-md px-2.5 text-[12.5px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-(--o1-text-2)',
                )}
              >
                {filterLabel(f)}
                <span
                  className={cn(
                    'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 font-mono text-[10.5px] tabular-nums',
                    active ? 'bg-primary/20 text-(--o1-lilac)' : 'bg-white/[0.06] text-muted-foreground',
                  )}
                >
                  {counts[f]}
                </span>
                {active && (
                  <motion.span layoutId="o1-tab-underline" aria-hidden="true" className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <AnimatePresence initial={false}>
        {selected.size > 0 && (
          <motion.div
            key="bulk"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-primary/20 bg-primary/[0.07] px-5 py-2.5">
              <p className="text-[13px] text-foreground" aria-live="polite">
                <span className="font-medium tabular-nums">{selected.size}</span> selecionado{selected.size > 1 ? 's' : ''}
                <span className="text-muted-foreground"> · {brl(selectedTotal)}</span>
              </p>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="sm" className="hover:bg-(--o1-brand-hover)">
                  <FileText />
                  Gerar defesas
                </Button>
                <Button size="sm" variant="outline" className="border-white/10">
                  <Download />
                  Exportar
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Limpar seleção" onClick={() => setSelected(new Set())}>
                  <X />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="w-10 pl-5">
              <Checkbox
                aria-label="Selecionar todos desta página"
                checked={allOnPage ? true : someOnPage ? 'indeterminate' : false}
                onCheckedChange={(v) => togglePage(v === true)}
              />
            </TableHead>
            <TableHead aria-sort={ariaSort(sort, 'pagador')} className="text-[12px] font-medium">
              <SortHeader label="Pagador" column="pagador" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="text-[12px] font-medium text-muted-foreground">Produto</TableHead>
            <TableHead aria-sort={ariaSort(sort, 'valor')} className="text-right text-[12px] font-medium">
              <SortHeader label="Valor" column="valor" sort={sort} onSort={onSort} align="right" />
            </TableHead>
            <TableHead aria-sort={ariaSort(sort, 'prazoHoras')} className="text-[12px] font-medium">
              <SortHeader label="Prazo" column="prazoHoras" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead aria-sort={ariaSort(sort, 'score')} className="text-[12px] font-medium">
              <SortHeader label="Evidência" column="score" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="text-[12px] font-medium text-muted-foreground">Status</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length ? (
            pageRows.map((m) => {
              const isSel = selected.has(m.id);
              const tone = scoreTone(m.score);
              const urgente = m.prazoHoras < 24;
              return (
                <TableRow
                  key={m.id}
                  data-state={isSel ? 'selected' : undefined}
                  className="h-14 border-white/[0.05] hover:bg-white/[0.025] data-[state=selected]:bg-primary/[0.06]"
                >
                  <TableCell className="pl-5">
                    <Checkbox aria-label={`Selecionar MED de ${m.pagador}`} checked={isSel} onCheckedChange={(v) => toggle(m.id, v === true)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--o1-surface) text-[11px] font-medium text-(--o1-text-2) ring-1 ring-white/[0.06]"
                      >
                        {m.pagador
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{m.pagador}</p>
                        <p className="font-mono text-[11.5px] text-muted-foreground" title={m.e2e}>
                          {shortE2e(m.e2e)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex h-6 items-center rounded-md border border-white/[0.08] px-2 text-[12px] text-(--o1-text-2)">{m.produto}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] text-foreground tabular-nums">{brl(m.valor)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-mono text-[13px] tabular-nums',
                        urgente ? (m.prazoHoras <= 6 ? 'text-(--o1-error)' : 'text-(--o1-warning)') : 'text-(--o1-text-2)',
                      )}
                    >
                      {urgente && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
                      {prazo(m.prazoHoras)}
                      {urgente && <span className="sr-only"> (vence em menos de 24h)</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        role="meter"
                        aria-label={`Força da evidência de ${m.pagador}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={m.score}
                        className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]"
                      >
                        <motion.div
                          className={cn('h-full rounded-full', tone.bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${m.score}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className={cn('w-6 font-mono text-[12px] tabular-nums', tone.text)}>{m.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <RowActions med={m} />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="h-40 text-center">
                <p className="text-[13px] font-medium text-foreground">Nenhuma contestação encontrada</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Nada corresponde à busca e ao filtro atuais.</p>
                <Button variant="outline" size="sm" className="mt-3 border-white/10" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <footer className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[12.5px] text-muted-foreground tabular-nums">
            {rows.length ? `${from}–${to} de ${rows.length}` : '0 resultados'}
          </p>
          <div className="flex items-center gap-2">
            <span id="o1-por-pagina" className="text-[12.5px] text-muted-foreground">
              Por página
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger aria-labelledby="o1-por-pagina" size="sm" className="h-7 w-16 border-white/[0.08] text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={O1_SCOPE}>
                {[5, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <nav aria-label="Paginação" className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" className="border-white/[0.08]" aria-label="Página anterior" disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft />
          </Button>
          {Array.from({ length: pageCount }, (_, i) => (
            <Button
              key={i}
              size="icon-sm"
              variant={i === current ? 'default' : 'ghost'}
              aria-label={`Ir para a página ${i + 1}`}
              aria-current={i === current ? 'page' : undefined}
              className={cn('font-mono text-[12px]', i !== current && 'text-muted-foreground')}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            className="border-white/[0.08]"
            aria-label="Próxima página"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      </footer>
    </section>
  );
}
