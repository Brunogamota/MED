'use client';

/**
 * Fila de contestações do painel Bulls Cash (21st.dev #25160 "Payments
 * Table", adaptada): avatar só com iniciais, colunas do MED, filtro e busca
 * locais sobre as linhas que o servidor mandou. No celular vira lista.
 */

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, FileUp, Search, SearchX } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import type { BullsQueueItem } from '@/lib/bullsHome';
import { BullsAvatar, BullsPrazoChip, BullsScoreMeter, BullsStatusPill, shortId } from './parts';

type Filtro = 'todos' | 'prontos' | 'sem-evidencia' | 'vencendo';

const FILTROS: { id: Filtro; label: string; test: (item: BullsQueueItem) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'prontos', label: 'Prontos', test: (item) => item.ready },
  { id: 'sem-evidencia', label: 'Sem evidência', test: (item) => item.blocked },
  { id: 'vencendo', label: 'Vencendo', test: (item) => item.dueSoon },
];

export function BullsSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-full bg-bulls-neutral-soft p-1 [scrollbar-width:none]"
    >
      {options.map((option) => {
        const ativo = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(option.id)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
              ativo ? 'bg-card text-bulls-brand-deep shadow-bulls' : 'text-bulls-ink-3 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function BullsSearchBox({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn('relative sm:w-64', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-bulls-ink-4" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-bulls-line-strong bg-bulls-bg-2 pr-4 pl-10 text-[13.5px] text-foreground outline-none placeholder:text-bulls-ink-4 focus-visible:border-bulls-brand focus-visible:ring-3 focus-visible:ring-bulls-brand/20"
      />
    </div>
  );
}

export function matchesSearch(term: string, ...values: (string | null | undefined)[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value?.toLowerCase().includes(needle));
}

export function BullsQueueCard({
  items,
  title,
  subtitle,
  footerHref,
  footerLabel,
}: {
  items: BullsQueueItem[];
  title: string;
  subtitle: string;
  footerHref?: string;
  footerLabel?: string;
}) {
  const [filtro, setFiltro] = React.useState<Filtro>('todos');
  const [busca, setBusca] = React.useState('');

  const linhas = React.useMemo(() => {
    const teste = FILTROS.find((f) => f.id === filtro)?.test ?? (() => true);
    return items.filter(teste).filter((item) => matchesSearch(busca, item.payerName, item.medId, item.endToEndId));
  }, [items, filtro, busca]);

  return (
    <section aria-labelledby="bulls-queue-title" className="overflow-hidden rounded-[28px] border border-bulls-line bg-card shadow-bulls">
      <div className="flex flex-col gap-4 border-b border-bulls-line p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="bulls-queue-title" className="text-[18px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-bulls-ink-3">{subtitle}</p>
        </div>
        {items.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <BullsSegmented options={FILTROS} value={filtro} onChange={setFiltro} label="Filtrar fila" />
            <BullsSearchBox value={busca} onChange={setBusca} placeholder="Pagador, MED ou e2e" label="Buscar por pagador, MED ou end-to-end" />
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-bulls-brand-soft text-bulls-brand-strong">
            <FileUp className="size-5" aria-hidden="true" />
          </span>
          <p className="text-[15px] font-semibold">Nenhum MED em aberto</p>
          <p className="max-w-sm text-[13px] text-bulls-ink-3">
            Importe o arquivo da adquirente ou registre um MED à mão. Cada caso entra aqui com o prazo e a evidência que tiver.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link
              href="/meds/import"
              className="inline-flex h-9 items-center rounded-full border border-bulls-line-strong px-4 text-[13px] font-semibold text-bulls-ink-2 hover:bg-bulls-brand-wash"
            >
              Importar MEDs
            </Link>
            <Link
              href="/meds/new"
              className="inline-flex h-9 items-center rounded-full border border-bulls-line-strong px-4 text-[13px] font-semibold text-bulls-ink-2 hover:bg-bulls-brand-wash"
            >
              Novo MED
            </Link>
          </div>
        </div>
      ) : linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-bulls-brand-soft text-bulls-brand-strong">
            <SearchX className="size-5" aria-hidden="true" />
          </span>
          <p className="text-[15px] font-semibold">Nada com esse filtro</p>
          <p className="max-w-sm text-[13px] text-bulls-ink-3">Troque o filtro ou limpe a busca para ver a fila inteira.</p>
          <button
            type="button"
            className="mt-1 h-9 rounded-full border border-bulls-line-strong px-4 text-[13px] font-semibold text-bulls-ink-2 hover:bg-bulls-brand-wash"
            onClick={() => {
              setFiltro('todos');
              setBusca('');
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Pagador</TableHead>
                  <TableHead className="hidden xl:table-cell">Produto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="hidden xl:table-cell">Evidência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((med) => (
                  <TableRow key={med.id} className="group relative">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <BullsAvatar name={med.payerName} size="lg" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-foreground">{med.payerName ?? 'Pagador não informado'}</p>
                          <p className="font-mono text-[12px] text-bulls-ink-3" title={med.endToEndId ?? med.medId}>
                            {shortId(med.endToEndId ?? med.medId)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-[13.5px] text-bulls-ink-2 xl:table-cell">{med.productLabel ?? '—'}</TableCell>
                    <TableCell className="text-right text-[14px] font-semibold text-foreground tabular-nums">{med.amountLabel}</TableCell>
                    <TableCell>
                      <BullsPrazoChip hours={med.hours} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <BullsScoreMeter percent={med.scorePercent} label={`Força da evidência de ${med.medId}`} />
                    </TableCell>
                    <TableCell>
                      <BullsStatusPill status={med.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {/* O link cobre a linha inteira: clicar em qualquer ponto abre o caso. */}
                      <Link
                        href={`/meds/${med.id}`}
                        aria-label={`Abrir MED ${med.medId}`}
                        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-bulls-ink-2 outline-none after:absolute after:inset-0 group-hover:bg-card group-hover:text-bulls-brand-strong focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Abrir
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-bulls-line lg:hidden">
            {linhas.map((med) => (
              <li key={med.id}>
                <Link
                  href={`/meds/${med.id}`}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-bulls-brand-wash focus-visible:bg-bulls-brand-wash"
                >
                  <BullsAvatar name={med.payerName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[14px] font-semibold">{med.payerName ?? med.medId}</p>
                      <p className="shrink-0 text-[14px] font-semibold tabular-nums">{med.amountLabel}</p>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] text-bulls-ink-3">{shortId(med.endToEndId ?? med.medId)}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <BullsStatusPill status={med.status} />
                      <BullsPrazoChip hours={med.hours} />
                      {med.productLabel ? <span className="text-[12px] text-bulls-ink-3">{med.productLabel}</span> : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {footerHref && items.length > 0 ? (
        <div className="border-t border-bulls-line px-5 py-3.5 sm:px-6">
          <Link href={footerHref} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-bulls-brand-strong hover:text-bulls-brand-deep">
            {footerLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
