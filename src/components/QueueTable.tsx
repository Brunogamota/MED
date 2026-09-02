'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Send, Trash2 } from 'lucide-react';
import {
  batchDeleteMedsAction,
  batchGenerateDefensesAction,
  batchPrepareSubmissionsAction,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/med/StatusBadge';
import { cn } from '@/lib/cn';
import { QUEUE_BAND_LABEL, type QueueBand } from '@/lib/urgency';
import type { MedStatus } from '@/domain/types';

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

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(-1);
  const [confirming, setConfirming] = useState<null | 'submit'>(null);
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
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
    setConfirming(null);
  };

  const runBatch = (action: (form: FormData) => Promise<void>) => {
    const form = new FormData();
    form.set('medIds', JSON.stringify([...selected]));
    startTransition(async () => {
      await action(form);
      setSelected(new Set());
      setConfirming(null);
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

  let rowIndex = -1;

  return (
    <div className="pb-16">
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

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:left-(--sidebar-width)">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <span className="text-muted-foreground text-sm">
              {selected.size} {selected.size === 1 ? 'caso selecionado' : 'casos selecionados'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportCsv(rows.filter((row) => selected.has(row.id)))}
              >
                <Download data-icon="inline-start" />
                Exportar
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
