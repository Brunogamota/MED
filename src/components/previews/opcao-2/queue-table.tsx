'use client';

/**
 * Fila de contestações (21st.dev #25160 "Payments Table"), adaptada:
 * - avatar só com iniciais — nenhuma foto de pessoa;
 * - colunas do MED: pagador + end-to-end, produto, valor, prazo, evidência, status;
 * - filtro e busca locais sobre a amostra de fixtures; no celular vira lista.
 */

import * as React from 'react';
import { ChevronRight, Download, Package, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { MEDS, brl, prazo, type PreviewMed } from '@/components/previews/fixtures';
import { PersonAvatar, ScoreMeter, StatusBadge, prazoTone, shortE2e } from './parts';

type Filtro = 'todos' | 'prontos' | 'sem-envio' | 'vencendo';

const FILTROS: { id: Filtro; label: string; test: (m: PreviewMed) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'prontos', label: 'Prontos', test: (m) => m.status === 'PRONTO' },
  { id: 'sem-envio', label: 'Sem envio', test: (m) => m.status === 'SEM_ENVIO' },
  { id: 'vencendo', label: 'Vencendo em 24h', test: (m) => m.prazoHoras < 24 && m.status !== 'ENVIADO' },
];

function ProdutoTag({ produto }: { produto: PreviewMed['produto'] }) {
  const Icon = produto === 'Físico' ? Package : Download;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--o2-ink-2)]">
      <Icon className="size-4 text-[var(--o2-ink-4)]" aria-hidden="true" />
      {produto}
    </span>
  );
}

function PrazoChip({ horas }: { horas: number }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums', prazoTone(horas))}>
      {prazo(horas)}
    </span>
  );
}

export function QueueTable() {
  const [filtro, setFiltro] = React.useState<Filtro>('todos');
  const [busca, setBusca] = React.useState('');
  const searchId = React.useId();

  const linhas = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const teste = FILTROS.find((f) => f.id === filtro)?.test ?? (() => true);
    return MEDS.filter(teste)
      .filter((m) => termo === '' || m.pagador.toLowerCase().includes(termo) || m.e2e.toLowerCase().includes(termo))
      .sort((a, b) => a.prazoHoras - b.prazoHoras);
  }, [filtro, busca]);

  return (
    <section
      aria-labelledby="o2-queue-title"
      className="overflow-hidden rounded-[28px] border border-[var(--o2-line)] bg-card shadow-[var(--o2-shadow)]"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--o2-line)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="o2-queue-title" className="text-[18px] font-semibold tracking-tight text-foreground">
            Fila de contestações
          </h2>
          <p className="mt-1 text-[13px] text-[var(--o2-ink-3)]">Ordenada pelo que vence primeiro</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            role="radiogroup"
            aria-label="Filtrar fila"
            className="flex gap-1 overflow-x-auto rounded-full bg-[var(--o2-neutral-soft)] p-1 [scrollbar-width:none]"
          >
            {FILTROS.map((f) => {
              const ativo = f.id === filtro;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setFiltro(f.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                    ativo
                      ? 'bg-card text-[var(--o2-brand-deep)] shadow-[0_1px_2px_rgba(27,16,48,0.08),0_4px_10px_-4px_rgba(124,58,237,0.25)]'
                      : 'text-[var(--o2-ink-3)] hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative sm:w-64">
            <label htmlFor={searchId} className="sr-only">
              Buscar por pagador ou end-to-end
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--o2-ink-4)]" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pagador ou end-to-end"
              className="h-10 w-full rounded-full border border-[var(--o2-line-strong)] bg-[var(--o2-bg-2)] pr-4 pl-10 text-[13.5px] text-foreground outline-none placeholder:text-[var(--o2-ink-4)] focus-visible:border-[var(--o2-brand)] focus-visible:ring-3 focus-visible:ring-[var(--o2-brand)]/20"
            />
          </div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--o2-brand-soft)] text-[var(--o2-brand-strong)]">
            <SearchX className="size-5" aria-hidden="true" />
          </span>
          <p className="text-[15px] font-semibold">Nada com esse filtro</p>
          <p className="max-w-sm text-[13px] text-[var(--o2-ink-3)]">Troque o filtro ou limpe a busca para ver a fila inteira.</p>
          <Button
            variant="outline"
            className="mt-1 h-9 rounded-full border-[var(--o2-line-strong)] px-4"
            onClick={() => {
              setFiltro('todos');
              setBusca('');
            }}
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop: tabela. */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--o2-line)] hover:bg-transparent">
                  <TableHead className="h-11 pl-6 text-[12px] font-semibold text-[var(--o2-ink-3)]">Pagador</TableHead>
                  <TableHead className="hidden h-11 text-[12px] font-semibold text-[var(--o2-ink-3)] xl:table-cell">Produto</TableHead>
                  <TableHead className="h-11 text-right text-[12px] font-semibold text-[var(--o2-ink-3)]">Valor</TableHead>
                  <TableHead className="h-11 text-[12px] font-semibold text-[var(--o2-ink-3)]">Prazo</TableHead>
                  <TableHead className="hidden h-11 text-[12px] font-semibold text-[var(--o2-ink-3)] xl:table-cell">Evidência</TableHead>
                  <TableHead className="h-11 text-[12px] font-semibold text-[var(--o2-ink-3)]">Status</TableHead>
                  <TableHead className="h-11 pr-6">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((med) => (
                  <TableRow key={med.id} className="group border-[var(--o2-line)] hover:bg-[var(--o2-brand-wash)]">
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={med.pagador} size="lg" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-foreground">{med.pagador}</p>
                          <p className="font-mono text-[12px] text-[var(--o2-ink-3)]" title={med.e2e}>
                            {shortE2e(med.e2e)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <ProdutoTag produto={med.produto} />
                    </TableCell>
                    <TableCell className="text-right text-[14px] font-semibold text-foreground tabular-nums">{brl(med.valor)}</TableCell>
                    <TableCell>
                      <PrazoChip horas={med.prazoHoras} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <ScoreMeter score={med.score} label={`Força da evidência de ${med.pagador}`} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={med.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Abrir MED de ${med.pagador}`}
                        className="h-8 rounded-full px-3 text-[13px] font-semibold text-[var(--o2-ink-2)] group-hover:bg-card group-hover:text-[var(--o2-brand-strong)]"
                      >
                        Abrir
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular e tablet: lista. */}
          <ul className="divide-y divide-[var(--o2-line)] lg:hidden">
            {linhas.map((med) => (
              <li key={med.id}>
                <button
                  type="button"
                  aria-label={`Abrir MED de ${med.pagador}`}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-[var(--o2-brand-wash)] focus-visible:bg-[var(--o2-brand-wash)]"
                >
                  <PersonAvatar name={med.pagador} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[14px] font-semibold">{med.pagador}</p>
                      <p className="shrink-0 text-[14px] font-semibold tabular-nums">{brl(med.valor)}</p>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] text-[var(--o2-ink-3)]">{shortE2e(med.e2e)}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={med.status} />
                      <PrazoChip horas={med.prazoHoras} />
                      <span className="text-[12px] text-[var(--o2-ink-3)]">{med.produto}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
