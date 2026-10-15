'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, ChevronRight, Download, FileText, RefreshCw, SearchX, Send, Trash2 } from 'lucide-react';
import {
  batchDeleteMedsAction,
  batchGenerateDefensesAction,
  batchPrepareSubmissionsAction,
  batchSetMedOutcomeAction,
} from '@/app/(console)/meds/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/med/StatusBadge';
import { cn } from '@/lib/cn';
import { MED_STATUS_LABEL } from '@/lib/labels';
import { QUEUE_BAND_LABEL, type QueueBand } from '@/lib/urgency';
import { DECLARABLE_OUTCOMES, type MedStatus } from '@/domain/types';
import type { SkinId } from '@/config/skins';
import {
  BullsAvatar,
  BullsPrazoChip,
  BullsScoreMeter,
  BullsStatusPill,
  shortId,
} from '@/components/skins/bulls/parts';
import { BullsSearchBox, matchesSearch } from '@/components/skins/bulls/bulls-queue-card';

/**
 * Fila de trabalho (briefing 3.8): agrupada por faixa de prazo, ordenada por
 * urgência calculada no servidor, com seleção múltipla e ações em lote.
 * Linha inteira clicável; `j`/`k` navegam, `Enter` abre, espaço seleciona.
 */

export interface QueueRow {
  id: string;
  medId: string;
  institution: string | null;
  payerName: string | null;
  payerDocument: string | null;
  amountLabel: string;
  scoreTotal: number;
  scoreMax: number;
  hasDefense: boolean;
  deadlineLabel: string;
  deadlineDanger: boolean;
  status: MedStatus;
  nextActionLabel: string;
  band: QueueBand;
  /** Usados pela fila do ambiente Bulls Cash (busca e pílula de prazo). */
  endToEndId?: string | null;
  hoursRemaining?: number | null;
}

function exportCsv(rows: QueueRow[]) {
  const header = 'med;instituicao;pagador;valor;prazo;score;proxima_acao';
  const lines = rows.map((row) =>
    [
      row.medId,
      row.institution ?? '',
      row.payerName ?? '',
      row.amountLabel,
      row.deadlineLabel,
      `${row.scoreTotal}/${row.scoreMax}`,
      row.nextActionLabel,
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(';'),
  );
  // BOM na frente: sem ele o Excel em pt-BR abre os acentos quebrados.
  const blob = new Blob(['﻿' + [header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'meds.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QueueTable({
  rows: allRows,
  skin = 'jade',
}: {
  rows: QueueRow[];
  /** Ambiente da conta: o Bulls Cash desenha a mesma fila em outra pele. */
  skin?: SkinId;
}) {
  const bulls = skin === 'bulls';
  const [search, setSearch] = useState('');
  // A busca é só do Bulls Cash; no Jade o termo fica vazio e passa tudo.
  const rows = useMemo(
    () =>
      allRows.filter((row) =>
        matchesSearch(search, row.medId, row.payerName, row.institution, row.endToEndId),
      ),
    [allRows, search],
  );
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(-1);
  const [confirming, setConfirming] = useState<null | 'submit'>(null);
  // Desfecho escolhido no menu e ainda nao confirmado. `AUTOMATICO` reabre.
  const [pendingOutcome, setPendingOutcome] = useState<null | MedStatus | 'AUTOMATICO'>(null);
  // Excluir nao usa a confirmacao de dois cliques das outras acoes: e a unica
  // que nao tem desfazer, entao pede uma janela que diz o que se perde.
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const tableRef = useRef<HTMLTableElement>(null);

  const bands = useMemo(() => {
    const grouped = new Map<QueueBand, QueueRow[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.band);
      if (bucket) bucket.push(row);
      else grouped.set(row.band, [row]);
    }
    return grouped;
  }, [rows]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(null);
    setPendingOutcome(null);
  };

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
    setConfirming(null);
    setPendingOutcome(null);
  };

  const runBatch = (
    action: (form: FormData) => Promise<void>,
    extra: Record<string, string> = {},
  ) => {
    const form = new FormData();
    form.set('medIds', JSON.stringify([...selected]));
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    startTransition(async () => {
      await action(form);
      setSelected(new Set());
      setConfirming(null);
      setPendingOutcome(null);
      router.refresh();
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'j') setCursor((current) => Math.min(rows.length - 1, current + 1));
      if (event.key === 'k') setCursor((current) => Math.max(0, current - 1));
      if (event.key === 'Enter' && cursor >= 0 && rows[cursor]) {
        router.push(`/meds/${rows[cursor].id}`);
      }
      if (event.key === ' ' && cursor >= 0 && rows[cursor]) {
        event.preventDefault();
        toggle(rows[cursor].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cursor, router, rows]);

  useEffect(() => {
    if (cursor < 0) return;
    tableRef.current
      ?.querySelector(`[data-row-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);


  /*
   * Fila no ambiente Bulls Cash: a mesma seleção, o mesmo teclado e as mesmas
   * ações em lote, desenhados como a tabela do painel — avatar de iniciais,
   * pílula de prazo, medidor de evidência e selo de status. No celular, lista.
   */
  const renderBulls = () => {
    let bullsIndex = -1;
    const bandOrder = (Object.keys(QUEUE_BAND_LABEL) as QueueBand[]).filter(
      (band) => (bands.get(band)?.length ?? 0) > 0,
    );
    const percentOf = (row: QueueRow) =>
      row.hasDefense && row.scoreMax > 0 ? (row.scoreTotal / row.scoreMax) * 100 : null;

    return (
      <section className="overflow-hidden rounded-[28px] border border-bulls-line bg-card shadow-bulls">
        <div className="flex flex-col gap-4 border-b border-bulls-line p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Fila de contestações</h2>
            <p className="mt-1 text-[13px] text-bulls-ink-3">
              {allRows.length} {allRows.length === 1 ? 'caso' : 'casos'} · ordenados pelo que vence primeiro
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full border border-bulls-line-strong bg-bulls-bg-2 px-3.5 text-[13px] font-semibold text-bulls-ink-2">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
              Selecionar todos
            </label>
            <BullsSearchBox
              value={search}
              onChange={setSearch}
              placeholder="Pagador, MED, e2e ou banco"
              label="Buscar na fila por pagador, MED, end-to-end ou instituição"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-bulls-brand-soft text-bulls-brand-strong">
              <SearchX className="size-5" aria-hidden="true" />
            </span>
            <p className="text-[15px] font-semibold">Nada com essa busca</p>
            <p className="max-w-sm text-[13px] text-bulls-ink-3">Limpe a busca para ver a fila inteira.</p>
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table ref={tableRef}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-6">
                      <span className="sr-only">Seleção</span>
                    </TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead className="hidden xl:table-cell">Instituição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Evidência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden 2xl:table-cell">Próxima ação</TableHead>
                    <TableHead className="pr-6">
                      <span className="sr-only">Abrir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {bandOrder.map((band) => {
                  const bandRows = bands.get(band) ?? [];
                  return (
                    <TableBody key={band}>
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={9} className="bg-bulls-bg-2 py-2 pl-6 text-[12px] font-semibold text-bulls-ink-3">
                          {QUEUE_BAND_LABEL[band]}
                          <span className="tabular-nums"> · {bandRows.length}</span>
                        </TableCell>
                      </TableRow>
                      {bandRows.map((row) => {
                        bullsIndex += 1;
                        const index = bullsIndex;
                        const checked = selected.has(row.id);
                        return (
                          <TableRow
                            key={row.id}
                            data-row-index={index}
                            data-state={checked ? 'selected' : undefined}
                            onClick={() => router.push(`/meds/${row.id}`)}
                            className={cn(
                              'group cursor-pointer data-[state=selected]:bg-bulls-brand-wash',
                              index === cursor && 'bg-bulls-brand-wash',
                            )}
                          >
                            <TableCell className="pl-6" onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(row.id)}
                                aria-label={`Selecionar ${row.medId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <BullsAvatar name={row.payerName} size="lg" />
                                <div className="min-w-0">
                                  <p className="max-w-[16rem] truncate text-[14px] font-semibold text-foreground">
                                    {row.payerName ?? row.payerDocument ?? 'Pagador não informado'}
                                  </p>
                                  <p className="font-mono text-[12px] text-bulls-ink-3" title={row.medId}>
                                    {shortId(row.medId)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden max-w-44 truncate text-[13.5px] text-bulls-ink-2 xl:table-cell">
                              {row.institution ?? '—'}
                            </TableCell>
                            <TableCell className="text-right text-[14px] font-semibold text-foreground tabular-nums">
                              {row.amountLabel}
                            </TableCell>
                            <TableCell>
                              <BullsPrazoChip hours={row.hoursRemaining ?? null} />
                            </TableCell>
                            <TableCell>
                              <BullsScoreMeter percent={percentOf(row)} label={`Força da evidência de ${row.medId}`} />
                            </TableCell>
                            <TableCell>
                              <BullsStatusPill status={row.status} />
                            </TableCell>
                            <TableCell className="hidden text-[13px] text-bulls-ink-3 2xl:table-cell">
                              {row.nextActionLabel}
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <span className="inline-flex size-8 items-center justify-center rounded-full text-bulls-ink-3 transition-colors group-hover:bg-card group-hover:text-bulls-brand-strong">
                                <ChevronRight className="size-4" aria-hidden="true" />
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  );
                })}
              </Table>
            </div>

            <div className="lg:hidden">
              {bandOrder.map((band) => {
                const bandRows = bands.get(band) ?? [];
                return (
                  <div key={band}>
                    <p className="border-b border-bulls-line bg-bulls-bg-2 px-5 py-2 text-[12px] font-semibold text-bulls-ink-3">
                      {QUEUE_BAND_LABEL[band]}
                      <span className="tabular-nums"> · {bandRows.length}</span>
                    </p>
                    <ul className="divide-y divide-bulls-line">
                      {bandRows.map((row) => (
                        <li key={row.id} className="flex items-start gap-3 px-5 py-4">
                          <span className="pt-2.5">
                            <Checkbox
                              checked={selected.has(row.id)}
                              onCheckedChange={() => toggle(row.id)}
                              aria-label={`Selecionar ${row.medId}`}
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => router.push(`/meds/${row.id}`)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
                          >
                            <BullsAvatar name={row.payerName} size="lg" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[14px] font-semibold">
                                  {row.payerName ?? row.payerDocument ?? row.medId}
                                </span>
                                <span className="shrink-0 text-[14px] font-semibold tabular-nums">{row.amountLabel}</span>
                              </span>
                              <span className="mt-0.5 block truncate font-mono text-[11.5px] text-bulls-ink-3">
                                {shortId(row.medId)}
                              </span>
                              <span className="mt-2.5 flex flex-wrap items-center gap-2">
                                <BullsStatusPill status={row.status} />
                                <BullsPrazoChip hours={row.hoursRemaining ?? null} />
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="hidden border-t border-bulls-line px-6 py-3 text-[12px] text-bulls-ink-3 lg:block">
          {rows.length} {rows.length === 1 ? 'caso' : 'casos'} · j/k navegam, Enter abre, espaço seleciona
        </p>
      </section>
    );
  };

  let rowIndex = -1;

  return (
    <div className="pb-16">
      {bulls ? (
        renderBulls()
      ) : (
          <>
          <div className="overflow-hidden rounded-xl border">
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>MED</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-32">Score</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próxima ação</TableHead>
                </TableRow>
              </TableHeader>

              {(Object.keys(QUEUE_BAND_LABEL) as QueueBand[]).map((band) => {
                const bandRows = bands.get(band);
                if (!bandRows || bandRows.length === 0) return null;

                return (
                  <TableBody key={band}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="bg-muted/50 py-1.5 font-medium text-muted-foreground text-xs">
                        {QUEUE_BAND_LABEL[band]}
                        <span className="tabular-nums"> · {bandRows.length}</span>
                      </TableCell>
                    </TableRow>

                    {bandRows.map((row) => {
                      rowIndex += 1;
                      const index = rowIndex;
                      const percent = row.scoreMax > 0 ? (row.scoreTotal / row.scoreMax) * 100 : 0;

                      return (
                        <TableRow
                          key={row.id}
                          data-row-index={index}
                          onClick={() => router.push(`/meds/${row.id}`)}
                          className={cn('cursor-pointer', index === cursor && 'bg-muted')}
                        >
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(row.id)}
                              onCheckedChange={() => toggle(row.id)}
                              aria-label={`Selecionar ${row.medId}`}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{row.medId}</span>
                            <span className="block truncate text-muted-foreground text-xs">
                              {row.payerName ?? row.payerDocument ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-muted-foreground">
                            {row.institution ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {row.amountLabel}
                          </TableCell>
                          <TableCell>
                            {row.hasDefense ? (
                              <span className="flex items-center gap-2">
                                <Progress value={percent} className="h-1.5" />
                                <span className="w-7 text-right text-muted-foreground text-xs tabular-nums">
                                  {row.scoreTotal}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">sem minuta</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'whitespace-nowrap tabular-nums',
                              row.deadlineDanger ? 'font-medium text-destructive' : 'text-muted-foreground',
                            )}
                          >
                            {row.deadlineLabel}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.nextActionLabel}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                );
              })}
            </Table>
          </div>

          <p className="mt-2 text-muted-foreground text-xs">
            {rows.length} {rows.length === 1 ? 'caso' : 'casos'} · j/k navegam, Enter abre, espaço
            seleciona
          </p>
          </>
      )}

      {selected.size > 0 ? (
        <div
          className={
            bulls
              ? 'sticky bottom-4 z-30 mt-4 flex justify-center'
              : 'fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:left-(--sidebar-width)'
          }
        >
          <div
            className={
              bulls
                ? 'flex max-w-full items-center gap-3 overflow-x-auto rounded-[22px] border border-bulls-line bg-card/95 py-2 pr-2 pl-2 shadow-bulls-hover backdrop-blur [scrollbar-width:none]'
                : 'flex h-14 items-center justify-between px-4 md:px-6'
            }
          >
            <span
              className={
                bulls
                  ? 'shrink-0 rounded-full bg-bulls-brand-soft px-3 py-1 text-[12.5px] font-semibold whitespace-nowrap text-bulls-brand-deep tabular-nums'
                  : 'text-muted-foreground text-sm'
              }
            >
              {selected.size} {selected.size === 1 ? 'caso selecionado' : 'casos selecionados'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportCsv(allRows.filter((row) => selected.has(row.id)))}
              >
                <Download data-icon="inline-start" />
                Exportar
              </Button>
              {/* Abre em aba nova: a fila continua com a selecao de pe, e o
                  lote vai para o PDF sem perder onde se estava. */}
              <Button variant="ghost" size="sm" asChild>
                <a href={`/meds/comprovantes?ids=${[...selected].join(',')}`} target="_blank" rel="noreferrer">
                  <FileText data-icon="inline-start" />
                  Comprovantes ({selected.size})
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => runBatch(batchGenerateDefensesAction)}
              >
                <RefreshCw data-icon="inline-start" />
                Regerar defesa ({selected.size})
              </Button>
              {pendingOutcome ? (
                <Button
                  variant="default"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    runBatch(batchSetMedOutcomeAction, { outcome: pendingOutcome })
                  }
                >
                  {isPending
                    ? 'Marcando…'
                    : pendingOutcome === 'AUTOMATICO'
                      ? `Confirmar: voltar ${selected.size} ao automático`
                      : `Confirmar: ${MED_STATUS_LABEL[pendingOutcome]} (${selected.size})`}
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending}>
                      <CheckCheck data-icon="inline-start" />
                      Marcar desfecho ({selected.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>O que a instituição respondeu</DropdownMenuLabel>
                    {DECLARABLE_OUTCOMES.map((outcome) => (
                      <DropdownMenuItem
                        key={outcome}
                        onSelect={() => {
                          setConfirming(null);
                          setPendingOutcome(outcome);
                        }}
                      >
                        {MED_STATUS_LABEL[outcome]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        setConfirming(null);
                        setPendingOutcome('AUTOMATICO');
                      }}
                    >
                      Voltar ao automático
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleting(true)}
              >
                <Trash2 data-icon="inline-start" />
                Excluir ({selected.size})
              </Button>
              {confirming === 'submit' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => runBatch(batchPrepareSubmissionsAction)}
                >
                  {isPending ? 'Preparando…' : `Confirmar envio (${selected.size})`}
                </Button>
              ) : (
                <Button size="sm" disabled={isPending} onClick={() => setConfirming('submit')}>
                  <Send data-icon="inline-start" />
                  Preparar envio ({selected.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {selected.size} {selected.size === 1 ? 'caso' : 'casos'}?
            </DialogTitle>
            <DialogDescription>
              Some junto tudo que pende do caso: evidências, documentos anexados, defesas geradas
              e envios preparados. Não dá para desfazer. Fica registrado na auditoria quem
              excluiu e quando.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setDeleting(false);
                runBatch(batchDeleteMedsAction);
              }}
            >
              {isPending ? 'Excluindo…' : `Excluir ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
