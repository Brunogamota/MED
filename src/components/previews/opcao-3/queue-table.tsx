'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronRight, Inbox, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MEDS, brl, prazo, type PreviewMed } from '@/components/previews/fixtures';
import { ScoreMeter, StatusBadge, e2eCurto, iniciais, prazoTone } from '@/components/previews/opcao-3/status';
import { cn } from '@/lib/cn';

/*
 * Base: 21st.dev 22174 "Card Table" — tabela dentro do cartão, com título,
 * descrição e status em selo. Aqui ganha filtro por balde, busca e, no
 * celular, vira lista empilhada em vez de rolar de lado.
 */

type Filtro = 'todos' | 'vencendo' | 'prontos' | 'sem-envio';

const FILTROS: { id: Filtro; label: string; test: (m: PreviewMed) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'vencendo', label: 'Vencendo em 24h', test: (m) => m.prazoHoras < 24 && m.status !== 'ENVIADO' },
  { id: 'prontos', label: 'Prontos', test: (m) => m.status === 'PRONTO' },
  { id: 'sem-envio', label: 'Sem registro de envio', test: (m) => m.status === 'SEM_ENVIO' },
];

export function Op3QueueTable() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const buscaId = useId();

  const linhas = useMemo(() => {
    const regra = FILTROS.find((f) => f.id === filtro)?.test ?? (() => true);
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return MEDS.filter(regra)
      .filter(
        (m) =>
          !termo ||
          m.pagador.toLocaleLowerCase('pt-BR').includes(termo) ||
          m.e2e.toLocaleLowerCase('pt-BR').includes(termo),
      )
      .sort((a, b) => a.prazoHoras - b.prazoHoras);
  }, [filtro, busca]);

  return (
    <Card id="fila" className="op3-elev scroll-mt-6 gap-0 rounded-2xl border border-border py-0 ring-0">
      <CardHeader className="gap-4 border-b border-border px-5 py-5 sm:px-6 [.border-b]:pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-[17px] font-semibold text-foreground">Fila de contestações</CardTitle>
            <CardDescription className="mt-1 text-(--op3-ink-3)">
              Ordenada pelo prazo de resposta. Abra um MED para ver evidências e defesa.
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-72">
            <label htmlFor={buscaId} className="sr-only">
              Buscar por pagador ou end-to-end
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--op3-ink-3)"
            />
            <Input
              id={buscaId}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pagador ou end-to-end"
              className="h-10 rounded-xl bg-card pl-9 dark:bg-card"
            />
          </div>
        </div>
        <div role="group" aria-label="Filtrar fila" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {FILTROS.map((f) => {
            const ativo = f.id === filtro;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40',
                  ativo
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-(--op3-ink-2) hover:border-(--op3-lilac) hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {linhas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-(--op3-ink-3)">
              <Inbox className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">Nenhuma contestação encontrada</p>
            <p className="text-sm text-(--op3-ink-3)">Ajuste o filtro ou a busca.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent [&_th]:h-11 [&_th]:px-6 [&_th]:text-xs [&_th]:font-medium [&_th]:text-(--op3-ink-3)">
                    <TableHead>Pagador</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Evidência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((m) => (
                    <TableRow key={m.id} className="border-border hover:bg-(--op3-lilac-soft)/60 [&_td]:px-6 [&_td]:py-3.5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary"
                          >
                            {iniciais(m.pagador)}
                          </span>
                          <div className="leading-tight">
                            <p className="font-medium text-foreground">{m.pagador}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-(--op3-ink-3)" title={m.e2e}>
                              {e2eCurto(m.e2e)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-(--op3-ink-2)">{m.produto}</TableCell>
                      <TableCell>
                        <ScoreMeter score={m.score} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className={cn('font-medium tabular-nums', prazoTone(m.prazoHoras))}>
                        {prazo(m.prazoHoras)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground tabular-nums">
                        {brl(m.valor)}
                      </TableCell>
                      <TableCell className="pr-4!">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Abrir contestação de ${m.pagador}`}
                          className="rounded-full text-(--op3-ink-3) hover:bg-accent hover:text-primary dark:hover:bg-accent"
                        >
                          <ChevronRight />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {linhas.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={`Abrir contestação de ${m.pagador}`}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary"
                    >
                      {iniciais(m.pagador)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium text-foreground">{m.pagador}</span>
                        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                          {brl(m.valor)}
                        </span>
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-(--op3-ink-3)">{e2eCurto(m.e2e)}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <StatusBadge status={m.status} className="h-5 px-2 text-[11px]" />
                        <span className={cn('text-xs font-medium tabular-nums', prazoTone(m.prazoHoras))}>
                          prazo {prazo(m.prazoHoras)}
                        </span>
                        <span className="text-xs text-(--op3-ink-3)">
                          {m.produto} · evidência {m.score}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="border-t border-border px-5 py-3.5 text-xs text-(--op3-ink-3) sm:px-6" aria-live="polite">
          {linhas.length === 1 ? '1 contestação' : `${linhas.length} contestações`} nesta visão
        </p>
      </CardContent>
    </Card>
  );
}
