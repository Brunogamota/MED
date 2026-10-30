'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Clock, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MEDS, brl, prazo, type PreviewMed } from '@/components/previews/marketplace/fixtures';
import { StatusBadge } from './status-badge';
import { eyebrow, serif } from './tokens';

/*
 * Fila em forma de livro-razão, a partir do "Payments Table" (21st.dev
 * #25160): avatar de iniciais, valor, produto e situação. Sem cartão por
 * linha — só fios finos entre os lançamentos, valores em serifa alinhados à
 * direita e cabeçalho em versalete.
 */

type Filtro = 'todas' | 'vencendo' | 'prontos' | 'sem-envio';
type Produto = 'todos' | PreviewMed['produto'];
type Chave = 'prazo' | 'valor' | 'score';

const FILTROS: { id: Filtro; label: string; teste: (m: PreviewMed) => boolean }[] = [
  { id: 'todas', label: 'Todas', teste: () => true },
  { id: 'vencendo', label: 'Vencendo em 24h', teste: (m) => m.prazoHoras < 24 && m.status !== 'ENVIADO' },
  { id: 'prontos', label: 'Prontos para envio', teste: (m) => m.status === 'PRONTO' },
  { id: 'sem-envio', label: 'Sem registro de envio', teste: (m) => m.status === 'SEM_ENVIO' },
];

const PRODUTOS: { id: Produto; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'Físico', label: 'Físico' },
  { id: 'Digital', label: 'Digital' },
];

const TINTAS = [
  'bg-(--ed-brand-soft) text-(--ed-brand-hover)',
  'bg-(--ed-amber-soft) text-(--ed-amber-ink)',
  'bg-(--ed-muted) text-(--ed-ink-2)',
];

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function e2eCurto(e2e: string): string {
  return `${e2e.slice(0, 9)}…${e2e.slice(-6)}`;
}

function corDoScore(score: number): { texto: string; barra: string } {
  if (score < 40) return { texto: 'text-(--ed-error)', barra: 'bg-(--ed-error)' };
  if (score < 75) return { texto: 'text-(--ed-amber-ink)', barra: 'bg-(--ed-amber)' };
  return { texto: 'text-(--ed-ink)', barra: 'bg-(--ed-ink-2)' };
}

function Score({ valor }: { valor: number }) {
  const cor = corDoScore(valor);
  return (
    <span className="inline-flex items-center justify-end gap-2.5">
      <span className={cn('w-6 text-right text-[13px] font-medium tabular-nums', cor.texto)}>{valor}</span>
      <span aria-hidden className="h-[3px] w-12 overflow-hidden rounded-full bg-(--ed-muted)">
        <span className={cn('block h-full rounded-full', cor.barra)} style={{ width: `${valor}%` }} />
      </span>
      <span className="sr-only">de 100</span>
    </span>
  );
}

function Prazo({ horas }: { horas: number }) {
  const urgente = horas < 24;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] tabular-nums',
        urgente ? 'font-medium text-(--ed-brand-hover)' : 'text-(--ed-ink-2)',
      )}
    >
      {urgente && <Clock className="size-3.5" aria-hidden />}
      {prazo(horas)}
      {urgente && <span className="sr-only">(vence em menos de 24 horas)</span>}
    </span>
  );
}

function Pagador({ med, indice }: { med: PreviewMed; indice: number }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8 after:hidden">
        <AvatarFallback
          className={cn(serif, 'text-[13px] font-medium italic', TINTAS[indice % TINTAS.length])}
        >
          {iniciais(med.pagador)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-[14px] font-medium text-(--ed-ink)">{med.pagador}</span>
    </span>
  );
}

type Ordem = { chave: Chave; dir: 'asc' | 'desc' };

function CabecalhoOrdenavel({
  chave,
  ordem,
  onOrdenar,
  children,
  className,
}: {
  chave: Chave;
  ordem: Ordem;
  onOrdenar: (chave: Chave) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ativo = ordem.chave === chave;
  const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={ativo ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('h-10 px-3', className)}
    >
      <button
        type="button"
        onClick={() => onOrdenar(chave)}
        className={cn(
          eyebrow,
          'inline-flex items-center gap-1 rounded-[3px] hover:text-(--ed-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)',
          ativo && 'text-(--ed-ink)',
        )}
      >
        {children}
        <Icone className={cn('size-3', ativo ? 'text-(--ed-brand)' : 'text-(--ed-ink-3)')} aria-hidden />
      </button>
    </TableHead>
  );
}

interface QueueProps {
  selecionados: Set<string>;
  onSelecionadosChange: (proximo: Set<string>) => void;
}

export function Queue({ selecionados, onSelecionadosChange }: QueueProps) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [produto, setProduto] = useState<Produto>('todos');
  const [ordem, setOrdem] = useState<Ordem>({ chave: 'prazo', dir: 'asc' });

  const contagem = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f.id, MEDS.filter(f.teste).length])) as Record<Filtro, number>,
    [],
  );

  const linhas = useMemo(() => {
    const termo = normalizar(busca.trim());
    const teste = FILTROS.find((f) => f.id === filtro)?.teste ?? (() => true);
    const campo: Record<Chave, (m: PreviewMed) => number> = {
      prazo: (m) => m.prazoHoras,
      valor: (m) => m.valor,
      score: (m) => m.score,
    };
    const sinal = ordem.dir === 'asc' ? 1 : -1;
    return MEDS.map((m, i) => ({ med: m, indice: i }))
      .filter(({ med }) => teste(med))
      .filter(({ med }) => produto === 'todos' || med.produto === produto)
      .filter(({ med }) => !termo || normalizar(med.pagador).includes(termo) || med.e2e.toLowerCase().includes(termo))
      .sort((a, b) => (campo[ordem.chave](a.med) - campo[ordem.chave](b.med)) * sinal);
  }, [busca, filtro, produto, ordem]);

  const visiveis = linhas.map((l) => l.med.id);
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((id) => selecionados.has(id));
  const somaSelecionada = MEDS.filter((m) => selecionados.has(m.id)).reduce((a, m) => a + m.valor, 0);

  function alternar(id: string, marcado: boolean) {
    const proximo = new Set(selecionados);
    if (marcado) proximo.add(id);
    else proximo.delete(id);
    onSelecionadosChange(proximo);
  }

  function alternarTodos(marcado: boolean) {
    const proximo = new Set(selecionados);
    for (const id of visiveis) {
      if (marcado) proximo.add(id);
      else proximo.delete(id);
    }
    onSelecionadosChange(proximo);
  }

  function ordenarPor(chave: Chave) {
    setOrdem((atual) =>
      atual.chave === chave ? { chave, dir: atual.dir === 'asc' ? 'desc' : 'asc' } : { chave, dir: chave === 'prazo' ? 'asc' : 'desc' },
    );
  }

  const descricaoOrdem = `ordenado por ${ordem.chave === 'prazo' ? 'prazo' : ordem.chave === 'valor' ? 'valor' : 'score'}, ${
    ordem.dir === 'asc' ? 'crescente' : 'decrescente'
  }`;

  return (
    <section aria-labelledby="ed-fila-titulo" className="rounded-[6px] border border-(--ed-rule) bg-(--ed-surface)">
      {/* Cabeçalho da fila */}
      <div className="flex flex-col gap-4 px-5 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={eyebrow}>Fila</p>
          <h2 id="ed-fila-titulo" className={cn(serif, 'mt-1.5 text-[22px] leading-tight font-normal tracking-[-0.01em]')}>
            Contestações em andamento
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-72">
            <span className="sr-only">Buscar por pagador ou end-to-end</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--ed-ink-3)"
              aria-hidden
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pagador ou end-to-end"
              className="h-9 w-full rounded-[6px] border border-(--ed-rule-strong) bg-(--ed-paper) pr-3 pl-9 text-[14px] text-(--ed-ink) transition-colors outline-none placeholder:text-(--ed-ink-3) focus-visible:border-(--ed-brand) focus-visible:ring-3 focus-visible:ring-(--ed-brand)/15"
            />
          </label>
          <div role="group" aria-label="Filtrar por produto" className="inline-flex h-9 self-start rounded-[6px] border border-(--ed-rule-strong) bg-(--ed-paper) p-0.5 sm:self-auto">
            {PRODUTOS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={produto === p.id}
                onClick={() => setProduto(p.id)}
                className={cn(
                  'rounded-[4px] px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ed-brand)',
                  produto === p.id
                    ? 'bg-(--ed-surface) font-medium text-(--ed-ink) shadow-[0_0_0_1px_var(--ed-rule)]'
                    : 'text-(--ed-ink-2) hover:text-(--ed-ink)',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros de situação, com indicador em linha */}
      <div
        role="group"
        aria-label="Filtrar por situação"
        className="mt-5 flex gap-5 overflow-x-auto border-b border-(--ed-rule) px-5 [scrollbar-width:none] sm:gap-7 sm:px-6"
      >
        {FILTROS.map((f) => {
          const ativo = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltro(f.id)}
              className={cn(
                'relative flex h-11 shrink-0 items-center gap-2 text-[14px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ed-brand)',
                ativo ? 'font-medium text-(--ed-ink)' : 'text-(--ed-ink-2) hover:text-(--ed-ink)',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11.5px] tabular-nums',
                  ativo ? 'bg-(--ed-brand-soft) text-(--ed-brand-hover)' : 'bg-(--ed-muted) text-(--ed-ink-2)',
                )}
              >
                {contagem[f.id]}
              </span>
              {ativo && (
                <motion.span
                  layoutId="ed-filtro-linha"
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-(--ed-brand)"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de seleção */}
      <AnimatePresence initial={false}>
        {selecionados.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div
              role="status"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-(--ed-rule) bg-(--ed-brand-soft)/55 px-5 py-2.5 text-[13px] sm:px-6"
            >
              <span className="font-medium text-(--ed-ink)">
                {selecionados.size} {selecionados.size === 1 ? 'selecionada' : 'selecionadas'}
              </span>
              <span className="text-(--ed-ink-2)">
                soma <span className={cn(serif, 'text-[15px] text-(--ed-ink) lining-nums tabular-nums')}>{brl(somaSelecionada)}</span>
              </span>
              <button
                type="button"
                onClick={() => onSelecionadosChange(new Set())}
                className="ml-auto inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-(--ed-brand-hover) hover:underline focus-visible:outline-2 focus-visible:outline-(--ed-brand)"
              >
                <X className="size-3.5" aria-hidden />
                Limpar seleção
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: tabela livro-razão */}
      <div className="hidden md:block">
        <Table className="text-[14px]">
          <TableHeader className="[&_tr]:border-(--ed-rule)">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 w-12 pl-6">
                <Checkbox
                  checked={todosVisiveisMarcados}
                  onCheckedChange={(v) => alternarTodos(v === true)}
                  aria-label="Selecionar todas as contestações visíveis"
                  className="rounded-[3px] border-(--ed-rule-strong) bg-(--ed-surface)"
                />
              </TableHead>
              <TableHead className={cn(eyebrow, 'h-10 px-3')}>Pagador</TableHead>
              <TableHead className={cn(eyebrow, 'h-10 px-3')}>End-to-end</TableHead>
              <TableHead className={cn(eyebrow, 'h-10 px-3')}>Produto</TableHead>
              <CabecalhoOrdenavel chave="valor" ordem={ordem} onOrdenar={ordenarPor} className="text-right">
                Valor
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel chave="prazo" ordem={ordem} onOrdenar={ordenarPor}>Prazo</CabecalhoOrdenavel>
              <TableHead className={cn(eyebrow, 'h-10 px-3')}>Situação</TableHead>
              <CabecalhoOrdenavel chave="score" ordem={ordem} onOrdenar={ordenarPor} className="text-right">
                Score
              </CabecalhoOrdenavel>
              <TableHead className="h-10 w-12 pr-6">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ med, indice }) => {
              const marcado = selecionados.has(med.id);
              return (
                <TableRow
                  key={med.id}
                  data-state={marcado ? 'selected' : undefined}
                  className="h-[60px] border-(--ed-rule) hover:bg-(--ed-hover) data-[state=selected]:bg-(--ed-brand-soft)/35"
                >
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={(v) => alternar(med.id, v === true)}
                      aria-label={`Selecionar contestação de ${med.pagador}`}
                      className="rounded-[3px] border-(--ed-rule-strong) bg-(--ed-surface)"
                    />
                  </TableCell>
                  <TableCell className="max-w-[220px] px-3">
                    <Pagador med={med} indice={indice} />
                  </TableCell>
                  <TableCell className="px-3">
                    <span title={med.e2e} className="font-mono text-[12.5px] text-(--ed-ink-2)">
                      {e2eCurto(med.e2e)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-(--ed-ink-2)">{med.produto}</TableCell>
                  <TableCell className={cn(serif, 'px-3 text-right text-[15.5px] lining-nums tabular-nums')}>
                    {brl(med.valor)}
                  </TableCell>
                  <TableCell className="px-3">
                    <Prazo horas={med.prazoHoras} />
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge status={med.status} />
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Score valor={med.score} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <a
                      href="#"
                      aria-label={`Abrir contestação de ${med.pagador}`}
                      className="inline-grid size-8 place-items-center rounded-[6px] text-(--ed-ink-3) transition-colors hover:bg-(--ed-muted) hover:text-(--ed-brand) focus-visible:outline-2 focus-visible:outline-(--ed-brand)"
                    >
                      <ArrowUpRight className="size-4" />
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Celular: lançamentos empilhados */}
      <ul className="divide-y divide-(--ed-rule) md:hidden">
        {linhas.map(({ med, indice }) => {
          const marcado = selecionados.has(med.id);
          return (
            <li key={med.id} className={cn('flex gap-3 px-5 py-4', marcado && 'bg-(--ed-brand-soft)/35')}>
              <Checkbox
                checked={marcado}
                onCheckedChange={(v) => alternar(med.id, v === true)}
                aria-label={`Selecionar contestação de ${med.pagador}`}
                className="mt-2 rounded-[3px] border-(--ed-rule-strong) bg-(--ed-surface)"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Pagador med={med} indice={indice} />
                  </div>
                  <span className={cn(serif, 'shrink-0 pt-1 text-[16px] lining-nums tabular-nums')}>{brl(med.valor)}</span>
                </div>
                <p title={med.e2e} className="mt-1.5 truncate pl-11 font-mono text-[12px] text-(--ed-ink-2)">
                  {e2eCurto(med.e2e)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-11">
                  <StatusBadge status={med.status} />
                  <span className="text-[13px] text-(--ed-ink-2)">{med.produto}</span>
                  <Prazo horas={med.prazoHoras} />
                  <span className="ml-auto">
                    <Score valor={med.score} />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {linhas.length === 0 && (
        <div className="px-6 py-14 text-center">
          <p className={cn(serif, 'text-[20px]')}>Nenhuma contestação encontrada</p>
          <p className="mt-1.5 text-[14px] text-(--ed-ink-2)">Ajuste a busca ou os filtros para ver outros registros.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--ed-rule) px-5 py-3.5 text-[12.5px] text-(--ed-ink-2) sm:px-6">
        <span>
          {linhas.length} de {MEDS.length} registros nesta página · {descricaoOrdem}
        </span>
      </div>
    </section>
  );
}
