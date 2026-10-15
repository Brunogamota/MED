'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MEDS, STATUS_LABEL, brl, prazo, type PreviewMed } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { MedDetailDialog } from './med-detail-dialog';
import { ProdutoBadge, StatusDot, e2eCurto, iniciais } from './med-bits';
import { GLASS, HEADING, MONO, TONE_BG, TONE_CHIP, prazoTone, scoreTone } from './theme';

type Chave = 'valor' | 'prazo' | 'score';
type Direcao = 'asc' | 'desc';
type Filtro = 'Todos' | PreviewMed['produto'];

const CAMPO: Record<Chave, (m: PreviewMed) => number> = {
  valor: (m) => m.valor,
  prazo: (m) => m.prazoHoras,
  score: (m) => m.score,
};

const FILTROS: Filtro[] = ['Todos', 'Físico', 'Digital'];

const ROTULO: Record<Chave, string> = { prazo: 'Prazo', valor: 'Valor', score: 'Score' };

function SortButton({
  c,
  chave,
  direcao,
  onSort,
  children,
}: {
  c: Chave;
  chave: Chave;
  direcao: Direcao;
  onSort: (c: Chave) => void;
  children: string;
}) {
  const ativo = chave === c;
  const Icon = !ativo ? ChevronsUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(c)}
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded-md px-1 py-0.5 tracking-wider uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        ativo ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
      <Icon className={cn('size-3', ativo ? 'text-(--o5-lilac)' : 'opacity-60')} aria-hidden />
    </button>
  );
}

function ScoreCell({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div aria-hidden className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn('h-full rounded-full', TONE_BG[tone])} style={{ width: `${score}%` }} />
      </div>
      <span
        className={cn(
          MONO,
          'inline-flex h-6 min-w-10 items-center justify-center rounded-lg border px-1.5 text-xs font-semibold',
          TONE_CHIP[tone],
        )}
      >
        {score}
      </span>
    </div>
  );
}

function PrazoChip({ horas }: { horas: number }) {
  return (
    <span
      className={cn(
        MONO,
        'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-xs font-medium',
        TONE_CHIP[prazoTone(horas)],
      )}
    >
      <Clock className="size-3" aria-hidden />
      {prazo(horas)}
    </span>
  );
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        HEADING,
        'flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-linear-to-br from-(--o5-brand)/25 to-(--o5-violet)/10 text-[11px] font-bold text-(--o5-lilac)',
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/**
 * Fila de MEDs: a tabela ordenável do Stocks Dashboard (21st.dev 29424) com a
 * linguagem de selos coloridos e barras da tabela de mercados (21st.dev 9045).
 * A linha inteira abre o resumo; o botão no fim da linha é o caminho por
 * teclado.
 */
export function MedQueue() {
  const [chave, setChave] = useState<Chave>('prazo');
  const [direcao, setDirecao] = useState<Direcao>('asc');
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [aberto, setAberto] = useState<PreviewMed | null>(null);
  const [open, setOpen] = useState(false);

  const linhas = useMemo(() => {
    const base = filtro === 'Todos' ? MEDS : MEDS.filter((m) => m.produto === filtro);
    const get = CAMPO[chave];
    return [...base].sort((a, b) => (direcao === 'asc' ? get(a) - get(b) : get(b) - get(a)));
  }, [chave, direcao, filtro]);

  function ordenar(nova: Chave) {
    if (nova === chave) {
      setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setChave(nova);
      setDirecao(nova === 'prazo' ? 'asc' : 'desc');
    }
  }

  function abrir(med: PreviewMed) {
    setAberto(med);
    setOpen(true);
  }

  const ariaSort = (c: Chave) =>
    chave === c ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none';

  const th = 'h-11 px-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase';

  return (
    <section id="fila" aria-labelledby="o5-fila" className={cn(GLASS, 'scroll-mt-24 overflow-hidden')}>
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 id="o5-fila" className={cn(HEADING, 'text-base font-semibold text-foreground')}>
            Fila de MEDs
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {linhas.length} {linhas.length === 1 ? 'caso' : 'casos'} · clique em um caso para ver o resumo
          </p>
        </div>
        <div
          role="group"
          aria-label="Filtrar por tipo de produto"
          className="inline-flex w-fit rounded-full border border-border bg-white/[0.03] p-1"
        >
          {FILTROS.map((f) => {
            const ativo = filtro === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFiltro(f)}
                className="relative h-7 rounded-full px-3.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ativo && (
                  <motion.span
                    layoutId="o5-filtro"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-(--o5-brand)/20 ring-1 ring-(--o5-brand)/40"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={cn('relative', ativo ? 'text-foreground' : 'text-muted-foreground')}>{f}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tela larga: tabela. */}
      <div className="hidden md:block">
        <Table className="min-w-[880px]">
          <caption className="sr-only">
            Fila de MEDs com valor, prazo de resposta, score de evidência e status. Os cabeçalhos de valor,
            prazo e score ordenam a tabela.
          </caption>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={cn(th, 'pl-6')}>Pagador</TableHead>
              <TableHead className={th}>Produto</TableHead>
              <TableHead className={cn(th, 'text-right')} aria-sort={ariaSort('valor')}>
                <div className="flex">
                  <SortButton c="valor" chave={chave} direcao={direcao} onSort={ordenar}>
                    Valor
                  </SortButton>
                </div>
              </TableHead>
              <TableHead className={cn(th, 'text-right')} aria-sort={ariaSort('prazo')}>
                <div className="flex">
                  <SortButton c="prazo" chave={chave} direcao={direcao} onSort={ordenar}>
                    Prazo
                  </SortButton>
                </div>
              </TableHead>
              <TableHead className={cn(th, 'text-right')} aria-sort={ariaSort('score')}>
                <div className="flex">
                  <SortButton c="score" chave={chave} direcao={direcao} onSort={ordenar}>
                    Score
                  </SortButton>
                </div>
              </TableHead>
              <TableHead className={cn(th, 'pl-8')}>Status</TableHead>
              <TableHead className={cn(th, 'w-14 pr-6')}>
                <span className="sr-only">Detalhes</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((m, i) => (
              <motion.tr
                key={m.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.035 }}
                onClick={() => abrir(m)}
                className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-white/[0.035]"
              >
                <th scope="row" className="py-3.5 pr-4 pl-6 text-left font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar nome={m.pagador} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{m.pagador}</p>
                      <p className={cn(MONO, 'mt-0.5 text-[11px] text-muted-foreground')} title={m.e2e}>
                        {e2eCurto(m.e2e)}
                      </p>
                    </div>
                  </div>
                </th>
                <td className="px-4 py-3.5">
                  <ProdutoBadge produto={m.produto} />
                </td>
                <td className={cn(MONO, 'px-4 py-3.5 text-right text-sm font-semibold text-foreground')}>
                  {brl(m.valor)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <PrazoChip horas={m.prazoHoras} />
                </td>
                <td className="px-4 py-3.5">
                  <ScoreCell score={m.score} />
                </td>
                <td className="py-3.5 pr-4 pl-8">
                  <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-(--o5-text-2)">
                    <StatusDot status={m.status} />
                    {STATUS_LABEL[m.status]}
                  </span>
                </td>
                <td className="py-3.5 pr-6 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrir(m);
                    }}
                    aria-label={`Ver resumo do caso de ${m.pagador}`}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors outline-none group-hover:border-border group-hover:bg-white/[0.05] group-hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </td>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Celular: lista compacta, cada caso é um botão. */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Ordenar
          </span>
          {(['prazo', 'valor', 'score'] as const).map((c) => {
            const ativo = chave === c;
            const Icon = !ativo ? null : direcao === 'asc' ? ArrowUp : ArrowDown;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={ativo}
                onClick={() => ordenar(c)}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  ativo ? TONE_CHIP.brand : 'border-border text-muted-foreground',
                )}
              >
                {ROTULO[c]}
                {Icon && <Icon className="size-3" aria-hidden />}
              </button>
            );
          })}
        </div>
        <ul>
          {linhas.map((m) => (
            <li key={m.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => abrir(m)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors outline-none hover:bg-white/[0.035] focus-visible:bg-white/[0.05]"
              >
                <Avatar nome={m.pagador} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{m.pagador}</span>
                    <span className={cn(MONO, 'shrink-0 text-sm font-semibold text-foreground')}>{brl(m.valor)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusDot status={m.status} />
                      <span className="truncate">{STATUS_LABEL[m.status]}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <PrazoChip horas={m.prazoHoras} />
                      <span
                        className={cn(
                          MONO,
                          'inline-flex h-6 min-w-9 items-center justify-center rounded-lg border px-1.5 text-xs font-semibold',
                          TONE_CHIP[scoreTone(m.score)],
                        )}
                        aria-label={`Score ${m.score}`}
                      >
                        {m.score}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MedDetailDialog med={aberto} open={open} onOpenChange={setOpen} />
    </section>
  );
}
