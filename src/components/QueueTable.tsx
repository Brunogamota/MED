'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { batchGenerateDefensesAction, batchPrepareSubmissionsAction } from '@/app/meds/actions';
import { QUEUE_BAND_LABEL, type QueueBand } from '@/lib/urgency';

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
  deadlineLabel: string;
  deadlineDanger: boolean;
  statusLabel: string;
  statusTone: 'neutral' | 'accent' | 'warning' | 'danger' | 'info';
  nextActionLabel: string;
  band: QueueBand;
}

const DOT: Record<QueueRow['statusTone'], string> = {
  neutral: 'bg-[var(--color-text-muted)]',
  accent: 'bg-[var(--color-accent)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]',
};

function scoreColor(ratio: number): string {
  if (ratio < 0.4) return 'bg-[var(--color-danger)]';
  if (ratio < 0.7) return 'bg-[var(--color-warning)]';
  return 'bg-[var(--color-success)]';
}

function exportCsv(rows: QueueRow[]) {
  const header = 'med;instituicao;pagador;valor;prazo;score;status;proxima_acao';
  const lines = rows.map((row) =>
    [
      row.medId,
      row.institution ?? '',
      row.payerName ?? '',
      row.amountLabel,
      row.deadlineLabel,
      `${row.scoreTotal}/${row.scoreMax}`,
      row.statusLabel,
      row.nextActionLabel,
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(';'),
  );
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

  // Navegação por teclado na fila.
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
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table ref={tableRef} className="w-full">
          <thead>
            <tr>
              <th className="h-9 w-10 border-b border-[var(--color-border)] px-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                  className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                />
              </th>
              {['MED', 'Instituição', 'Valor', 'Score', 'Prazo', 'Status', 'Próxima ação'].map(
                (header) => (
                  <th
                    key={header}
                    className={`h-9 border-b border-[var(--color-border)] px-3 text-left text-xs font-medium text-[var(--color-text-muted)] ${
                      header === 'Valor' ? 'text-right' : ''
                    }`}
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          {(Object.keys(QUEUE_BAND_LABEL) as QueueBand[]).map((band) => {
            const bandRows = bands.get(band);
            if (!bandRows || bandRows.length === 0) return null;
            return (
              <tbody key={band}>
                <tr>
                  <td
                    colSpan={8}
                    className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)]"
                  >
                    {QUEUE_BAND_LABEL[band]}
                    <span className="tabular"> · {bandRows.length}</span>
                  </td>
                </tr>
                {bandRows.map((row) => {
                  rowIndex += 1;
                  const index = rowIndex;
                  const ratio = row.scoreMax > 0 ? row.scoreTotal / row.scoreMax : 0;
                  return (
                    <tr
                      key={row.id}
                      data-row-index={index}
                      onClick={() => router.push(`/meds/${row.id}`)}
                      className={`h-11 cursor-pointer border-b border-[var(--color-border)] transition-colors duration-[120ms] last:border-b-0 ${
                        index === cursor
                          ? 'bg-[var(--color-surface-active)]'
                          : 'hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <td className="px-3" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          aria-label={`Selecionar ${row.medId}`}
                          className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="px-3 text-[13px]">
                        <span className="font-medium text-[var(--color-text)]">{row.medId}</span>
                        <span className="block truncate text-xs text-[var(--color-text-muted)]">
                          {row.payerName ?? row.payerDocument ?? '—'}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 text-[13px] text-[var(--color-text-secondary)]">
                        {row.institution ?? '—'}
                      </td>
                      <td className="tabular px-3 text-right text-[13px] font-medium">
                        {row.amountLabel}
                      </td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1 w-14 overflow-hidden rounded-full bg-[var(--color-border)]">
                            <span
                              className={`block h-full rounded-full ${scoreColor(ratio)}`}
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </span>
                          <span className="tabular text-xs text-[var(--color-text-secondary)]">
                            {row.scoreTotal}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`tabular px-3 text-[13px] ${
                          row.deadlineDanger
                            ? 'font-medium text-[var(--color-danger)]'
                            : 'text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {row.deadlineLabel}
                      </td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-1.5 text-[13px]">
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[row.statusTone]}`} />
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="px-3 text-[13px] text-[var(--color-text-secondary)]">
                        {row.nextActionLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>

      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
        {rows.length} {rows.length === 1 ? 'caso' : 'casos'} · j/k navegam, Enter abre, espaço
        seleciona
      </p>

      {/* Barra de ações em lote — aparece apenas com seleção */}
      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-white lg:left-[var(--sidebar-width)]">
          <div className="mx-auto flex h-[52px] max-w-[1440px] items-center justify-between px-8 max-md:px-4">
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              {selected.size} {selected.size === 1 ? 'caso selecionado' : 'casos selecionados'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportCsv(rows.filter((row) => selected.has(row.id)))}
                className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              >
                Exportar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => runBatch(batchGenerateDefensesAction)}
                className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
              >
                Regerar defesa ({selected.size})
              </button>
              {confirming === 'submit' ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runBatch(batchPrepareSubmissionsAction)}
                  className="inline-flex h-8 items-center rounded-md bg-[var(--color-danger)] px-3 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {isPending ? 'Preparando…' : `Confirmar envio (${selected.size})`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirming('submit')}
                  className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-40"
                >
                  Preparar envio ({selected.size})
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
