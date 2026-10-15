'use client';

/*
 * Fila de contestações — adaptada do 21st.dev 22187 "Invoice History Table":
 * selo de status por cor, ação por linha e rodapé com o total em aberto.
 * Abaixo de 768px a mesma fila vira lista, sem rolagem lateral.
 */

import { ArrowUpRight, Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { COMPROVANTE, MEDS, RESUMO, STATUS_LABEL, brl, prazo, type PreviewMed, type PreviewStatus } from '@/components/previews/fixtures';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { faixaDe, type Faixa } from './derived';

const COMPROVANTE_HREF = '/preview/bulls/opcao-4/comprovante';

const STATUS_TOM: Record<PreviewStatus, string> = {
  PRONTO: 'border-(--o4-success)/30 bg-(--o4-success)/10 text-(--o4-success)',
  SEM_ENVIO: 'border-(--o4-error)/30 bg-(--o4-error)/10 text-(--o4-error)',
  DEFESA: 'border-(--o4-brand)/30 bg-(--o4-brand)/10 text-(--o4-lilac)',
  COLETANDO: 'border-(--o4-warning)/30 bg-(--o4-warning)/10 text-(--o4-warning)',
  ENVIADO: 'border-border bg-(--o4-raised) text-muted-foreground',
};
const STATUS_PONTO: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--o4-success)',
  SEM_ENVIO: 'bg-(--o4-error)',
  DEFESA: 'bg-(--o4-brand)',
  COLETANDO: 'bg-(--o4-warning)',
  ENVIADO: 'bg-(--o4-subtle)',
};

const ACAO: Record<PreviewStatus, string> = {
  PRONTO: 'Enviar',
  SEM_ENVIO: 'Anexar envio',
  DEFESA: 'Revisar',
  COLETANDO: 'Ver dados',
  ENVIADO: 'Detalhes',
};

const SCORE_COR: Record<Faixa, string> = {
  fraca: 'bg-(--o4-error)',
  parcial: 'bg-(--o4-warning)',
  boa: 'bg-(--o4-violet)',
  forte: 'bg-(--o4-success)',
};

type Filtro = 'todos' | 'vencendo' | 'prontos' | 'sem-envio';
const FILTROS: { id: Filtro; rotulo: string; aplica: (m: PreviewMed) => boolean }[] = [
  { id: 'todos', rotulo: 'Todos', aplica: () => true },
  { id: 'vencendo', rotulo: 'Vencendo em 24h', aplica: (m) => m.prazoHoras < 24 && m.status !== 'ENVIADO' },
  { id: 'prontos', rotulo: 'Prontos', aplica: (m) => m.status === 'PRONTO' },
  { id: 'sem-envio', rotulo: 'Sem evidência', aplica: (m) => m.status === 'SEM_ENVIO' },
];

function StatusBadge({ status }: { status: PreviewStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-1.5 text-[11px] font-medium',
        STATUS_TOM[status],
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_PONTO[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Score({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Score ${score} de 100`}>
      <span aria-hidden="true" className="relative h-1 w-10 overflow-hidden rounded-full bg-(--o4-raised)">
        <span className={cn('absolute inset-y-0 left-0 rounded-full', SCORE_COR[faixaDe(score)])} style={{ width: `${score}%` }} />
      </span>
      <span aria-hidden="true" className="w-6 font-mono text-[12px] tabular-nums text-foreground">
        {score}
      </span>
    </span>
  );
}

function Prazo({ med }: { med: PreviewMed }) {
  if (med.status === 'ENVIADO') return <span className="font-mono text-[12px] text-(--o4-subtle)">—</span>;
  const tom =
    med.prazoHoras < 24 ? 'text-(--o4-error)' : med.prazoHoras < 72 ? 'text-(--o4-warning)' : 'text-muted-foreground';
  return <span className={cn('font-mono text-[12px] tabular-nums', tom)}>{prazo(med.prazoHoras)}</span>;
}

function e2eCurto(e2e: string) {
  return `${e2e.slice(0, 9)}…${e2e.slice(-6)}`;
}

function AcaoLinha({ med }: { med: PreviewMed }) {
  const temComprovante = med.e2e === COMPROVANTE.e2e;
  return (
    <div className="flex items-center justify-end gap-1">
      {temComprovante ? (
        <a
          href={COMPROVANTE_HREF}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-(--o4-lilac) outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          Comprovante
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </a>
      ) : null}
      <button
        type="button"
        className={cn(
          'inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          med.status === 'PRONTO'
            ? 'border-(--o4-brand-strong) bg-(--o4-brand-strong) text-primary-foreground hover:bg-(--o4-brand)'
            : 'border-border bg-card text-foreground hover:bg-accent',
        )}
      >
        {ACAO[med.status]}
        <span className="sr-only"> — {med.pagador}</span>
      </button>
      <button
        type="button"
        aria-label={`Mais ações para ${med.pagador}`}
        className="inline-flex size-7 items-center justify-center rounded-md text-(--o4-subtle) outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function QueueTable() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const atual = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];
  const linhas = atual ? MEDS.filter(atual.aplica) : MEDS;
  const abertas = linhas.filter((m) => m.status !== 'ENVIADO');
  const totalAberto = abertas.reduce((a, m) => a + m.valor, 0);

  return (
    <section aria-labelledby="o4-fila" className="overflow-hidden rounded-[10px] border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="o4-fila" className="text-[13px] font-semibold text-foreground">
            Fila de contestações
          </h2>
          <p className="mt-0.5 text-[12px] text-(--o4-subtle)">
            Mostrando {linhas.length} de {RESUMO.emAberto} em aberto · ordenado por prazo
          </p>
        </div>
        <div role="group" aria-label="Filtrar fila" className="flex gap-px overflow-x-auto rounded-md border border-border bg-background p-0.5">
          {FILTROS.map((f) => {
            const n = MEDS.filter(f.aplica).length;
            const ativo = f.id === filtro;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[5px] px-2 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  ativo ? 'bg-(--o4-raised) text-foreground shadow-[inset_0_0_0_1px_var(--border)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.rotulo}
                <span className="font-mono text-[11px] tabular-nums text-(--o4-subtle)">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 768px+ : tabela */}
      <div className="hidden md:block">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-8 pl-4 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-(--o4-subtle)">Pagador</TableHead>
              <TableHead className="h-8 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-(--o4-subtle)">Status</TableHead>
              <TableHead className="h-8 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-(--o4-subtle)">Evidência</TableHead>
              <TableHead className="h-8 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-(--o4-subtle)">Prazo</TableHead>
              <TableHead className="h-8 text-right font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-(--o4-subtle)">Valor</TableHead>
              <TableHead className="h-8 pr-4">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...linhas]
              .sort((a, b) => Number(a.status === 'ENVIADO') - Number(b.status === 'ENVIADO') || a.prazoHoras - b.prazoHoras)
              .map((m) => (
                <TableRow key={m.id} className="border-border hover:bg-(--o4-raised)/60">
                  <TableCell className="py-2 pl-4">
                    <div className="font-medium text-foreground">{m.pagador}</div>
                    <div className="text-[11px] text-(--o4-subtle)">
                      <span className="font-mono" title={m.e2e}>
                        {e2eCurto(m.e2e)}
                      </span>{' '}
                      · {m.produto}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Score score={m.score} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Prazo med={m} />
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono tabular-nums text-foreground">{brl(m.valor)}</TableCell>
                  <TableCell className="py-2 pr-3">
                    <AcaoLinha med={m} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
          <TableFooter className="border-border bg-(--o4-raised)/50">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-2.5 pl-4 text-[12px] font-medium text-muted-foreground">
                Total em aberto <span className="text-(--o4-subtle)">· {abertas.length} nesta lista</span>
              </TableCell>
              <TableCell className="py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums text-foreground">
                {brl(totalAberto)}
              </TableCell>
              <TableCell className="py-2.5 pr-4 text-right text-[11px] text-(--o4-subtle)">
                de {brl(RESUMO.valorEmAberto)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* < 768px : lista */}
      <ul className="divide-y divide-border md:hidden">
        {linhas.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-foreground">{m.pagador}</div>
                <div className="truncate text-[11px] text-(--o4-subtle)">
                  <span className="font-mono">{e2eCurto(m.e2e)}</span> · {m.produto}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[13px] tabular-nums text-foreground">{brl(m.valor)}</div>
                <Prazo med={m} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                <Score score={m.score} />
              </div>
              <AcaoLinha med={m} />
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between bg-(--o4-raised)/50 px-4 py-2.5">
          <span className="text-[12px] font-medium text-muted-foreground">Total em aberto</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{brl(totalAberto)}</span>
        </li>
      </ul>
    </section>
  );
}
