'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlarmClockIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ListFilterIcon,
  MonitorDownIcon,
  MoreHorizontalIcon,
  PackageIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  COMPROVANTE,
  MEDS,
  STATUS_LABEL,
  brl,
  prazo,
  type PreviewMed,
  type PreviewStatus,
} from '@/components/previews/marketplace/fixtures';
import { cn } from '@/lib/cn';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from './menu';
import type { FilaVisao } from './status-tabs';

/**
 * Fila de MEDs (a partir do "Data Table", 21st.dev 28327): busca, filtro,
 * ordenação, seleção de linhas, selo de situação, ações por linha e paginação.
 * A tabela original usa @tanstack/react-table, que não está instalado aqui —
 * a mesma mecânica foi refeita com estado local.
 */

const COMPROVANTE_HREF = '/preview/marketplace/opcao-1/comprovante';

const STATUS_TOM: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--o1-info-bg) text-primary ring-primary/20 [--dot:var(--primary)]',
  SEM_ENVIO: 'bg-(--o1-error-bg) text-(--o1-error) ring-(--o1-error)/20 [--dot:var(--o1-error)]',
  DEFESA: 'bg-(--o1-sky-bg) text-(--o1-sky-ink) ring-(--o1-sky)/25 [--dot:var(--o1-sky)]',
  COLETANDO: 'bg-(--o1-warning-bg) text-(--o1-warning) ring-(--o1-warning)/25 [--dot:var(--o1-warning)]',
  ENVIADO: 'bg-(--o1-success-bg) text-(--o1-success) ring-(--o1-success)/20 [--dot:var(--o1-success)]',
};

function StatusBadge({ status }: { status: PreviewStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset',
        STATUS_TOM[status],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-(--dot)" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const tom =
    score >= 75 ? 'bg-(--o1-success)' : score >= 45 ? 'bg-(--o1-warning)' : 'bg-(--o1-error)';
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div
        className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label="Score de evidência"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div className={cn('h-full rounded-full', tom)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-7 text-right font-mono text-[12.5px] font-medium text-foreground tabular-nums">
        {score}
      </span>
    </div>
  );
}

function Prazo({ horas }: { horas: number }) {
  const tom =
    horas < 24 ? 'text-(--o1-error)' : horas < 72 ? 'text-(--o1-warning)' : 'text-(--o1-ink-2)';
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium tabular-nums', tom)}>
      <AlarmClockIcon className="size-3.5" aria-hidden="true" />
      {prazo(horas)}
    </span>
  );
}

function iniciais(nome: string): string {
  const partes = nome.split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}

function E2E({ valor }: { valor: string }) {
  const [copiado, setCopiado] = React.useState(false);
  return (
    <span className="group/e2e inline-flex items-center gap-1">
      <span title={valor} className="font-mono text-[12.5px] text-foreground">
        {valor.slice(0, 9)}
        <span className="text-(--o1-ink-3)">…</span>
        {valor.slice(-6)}
      </span>
      <button
        type="button"
        aria-label={copiado ? 'End-to-end copiado' : 'Copiar end-to-end'}
        onClick={() => {
          void navigator.clipboard?.writeText(valor).then(() => {
            setCopiado(true);
            window.setTimeout(() => setCopiado(false), 1400);
          });
        }}
        className="inline-flex size-6 items-center justify-center rounded-md text-(--o1-ink-3) opacity-0 transition-opacity outline-none group-hover/e2e:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {copiado ? <CheckIcon className="size-3.5 text-(--o1-success)" /> : <CopyIcon className="size-3.5" />}
      </button>
    </span>
  );
}

type SortKey = 'pagador' | 'valor' | 'prazoHoras' | 'score';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };
type Produto = 'todos' | PreviewMed['produto'];

function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  col: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const ativo = sort.key === col;
  const Icon = !ativo ? ArrowUpDownIcon : sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={cn(
        '-mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium tracking-wide uppercase outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40',
        ativo ? 'text-foreground' : 'text-(--o1-ink-3)',
        align === 'right' && 'flex-row-reverse',
      )}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      <Icon className={cn('size-3.5', ativo ? 'text-primary' : 'opacity-60')} aria-hidden="true" />
    </button>
  );
}

const PAGE_SIZE = 5;

function porVisao(med: PreviewMed, visao: FilaVisao): boolean {
  switch (visao) {
    case 'vencendo':
      return med.prazoHoras < 24;
    case 'prontas':
      return med.status === 'PRONTO';
    case 'sem-evidencia':
      return med.status === 'SEM_ENVIO';
    case 'enviadas':
      return med.status === 'ENVIADO';
    default:
      return true;
  }
}

export function QueueTable({ visao }: { visao: FilaVisao }) {
  const [busca, setBusca] = React.useState('');
  const [produto, setProduto] = React.useState<Produto>('todos');
  const [sort, setSort] = React.useState<Sort>({ key: 'prazoHoras', dir: 'asc' });
  const [selecao, setSelecao] = React.useState<Set<string>>(() => new Set());
  const [pagina, setPagina] = React.useState(0);

  const linhas = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = MEDS.filter(
      (m) =>
        porVisao(m, visao) &&
        (produto === 'todos' || m.produto === produto) &&
        (q === '' || m.pagador.toLowerCase().includes(q) || m.e2e.toLowerCase().includes(q)),
    );
    const mult = sort.dir === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'pt-BR') * mult;
      return (Number(va) - Number(vb)) * mult;
    });
  }, [busca, produto, sort, visao]);

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = linhas.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE);

  const selecionadasNaPagina = visiveis.filter((m) => selecao.has(m.id)).length;
  const cabecalho: boolean | 'indeterminate' =
    visiveis.length > 0 && selecionadasNaPagina === visiveis.length
      ? true
      : selecionadasNaPagina > 0
        ? 'indeterminate'
        : false;

  function alternarPagina(marcar: boolean) {
    setSelecao((prev) => {
      const next = new Set(prev);
      for (const m of visiveis) {
        if (marcar) next.add(m.id);
        else next.delete(m.id);
      }
      return next;
    });
  }

  function alternar(id: string, marcar: boolean) {
    setSelecao((prev) => {
      const next = new Set(prev);
      if (marcar) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function ordenar(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const filtrosAtivos = busca !== '' || produto !== 'todos';
  const qtdSelecionadas = selecao.size;
  const inicio = linhas.length === 0 ? 0 : paginaAtual * PAGE_SIZE + 1;
  const fim = Math.min((paginaAtual + 1) * PAGE_SIZE, linhas.length);

  return (
    <section
      aria-labelledby="o1-fila-titulo"
      className="overflow-hidden rounded-[12px] border border-border bg-card shadow-(--o1-shadow)"
    >
      {/* Cabeçalho da fila + ação principal */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 id="o1-fila-titulo" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Fila de contestações
          </h2>
          <p className="mt-0.5 text-[13px] text-(--o1-ink-3)">
            Ordenada pelo prazo de resposta. Selecione para gerar as defesas em lote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-(--o1-shadow) transition-colors hover:bg-muted"
          >
            <DownloadIcon className="size-4 text-(--o1-ink-3)" />
            Exportar
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-(--o1-shadow) transition-colors outline-none hover:bg-(--o1-hover) focus-visible:ring-3 focus-visible:ring-primary/30"
          >
            <SparklesIcon className="size-4" />
            Gerar defesas
            {qtdSelecionadas > 0 ? (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 font-mono text-[11px] tabular-nums">
                {qtdSelecionadas}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-2 border-y border-border bg-muted/50 px-5 py-2.5 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <label htmlFor="o1-busca-fila" className="sr-only">
            Buscar na fila por pagador ou end-to-end
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--o1-ink-3)" />
          <input
            id="o1-busca-fila"
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar pagador ou end-to-end"
            className="h-8.5 w-full rounded-[9px] border border-input bg-card pr-3 pl-8.5 text-[13px] text-foreground outline-none placeholder:text-(--o1-ink-3) focus:border-primary focus:ring-3 focus:ring-primary/15"
          />
        </div>
        <div className="flex items-center gap-2">
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-8.5 items-center gap-1.5 rounded-[9px] border border-dashed px-2.5 text-[13px] font-medium transition-colors outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/40',
                  produto === 'todos'
                    ? 'border-input text-(--o1-ink-2)'
                    : 'border-primary/40 bg-accent text-primary',
                )}
              >
                <ListFilterIcon className="size-4" />
                Produto
                {produto !== 'todos' ? (
                  <span className="ml-0.5 rounded-md bg-card px-1.5 text-[12px] ring-1 ring-primary/20">
                    {produto}
                  </span>
                ) : null}
              </button>
            </MenuTrigger>
            <MenuContent className="w-48">
              <MenuLabel>Tipo de produto</MenuLabel>
              <MenuRadioGroup
                value={produto}
                onValueChange={(v) => {
                  setProduto(v === 'Físico' || v === 'Digital' ? v : 'todos');
                  setPagina(0);
                }}
              >
                <MenuRadioItem value="todos">Todos</MenuRadioItem>
                <MenuRadioItem value="Físico">
                  <PackageIcon />
                  Físico
                </MenuRadioItem>
                <MenuRadioItem value="Digital">
                  <MonitorDownIcon />
                  Digital
                </MenuRadioItem>
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
          {filtrosAtivos ? (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setProduto('todos');
                setPagina(0);
              }}
              className="inline-flex h-8.5 items-center gap-1 rounded-[9px] px-2 text-[13px] font-medium text-(--o1-ink-2) hover:bg-card hover:text-foreground"
            >
              Limpar
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
        <AnimatePresence>
          {qtdSelecionadas > 0 ? (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 text-[13px] sm:ml-auto"
              aria-live="polite"
            >
              <span className="font-medium text-foreground">
                {qtdSelecionadas} {qtdSelecionadas === 1 ? 'selecionada' : 'selecionadas'}
              </span>
              <button
                type="button"
                onClick={() => setSelecao(new Set())}
                className="rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-accent"
              >
                Limpar seleção
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-11 pl-5">
              <Checkbox
                aria-label="Selecionar todas desta página"
                checked={cabecalho}
                onCheckedChange={(v) => alternarPagina(v === true)}
              />
            </TableHead>
            <TableHead className="text-[12px] font-medium tracking-wide text-(--o1-ink-3) uppercase">
              End-to-end
            </TableHead>
            <TableHead>
              <SortHeader label="Pagador" col="pagador" sort={sort} onSort={ordenar} />
            </TableHead>
            <TableHead className="text-[12px] font-medium tracking-wide text-(--o1-ink-3) uppercase">
              Produto
            </TableHead>
            <TableHead className="text-right">
              <SortHeader label="Valor" col="valor" sort={sort} onSort={ordenar} align="right" />
            </TableHead>
            <TableHead>
              <SortHeader label="Prazo" col="prazoHoras" sort={sort} onSort={ordenar} />
            </TableHead>
            <TableHead className="text-[12px] font-medium tracking-wide text-(--o1-ink-3) uppercase">
              Situação
            </TableHead>
            <TableHead className="text-right">
              <SortHeader label="Score" col="score" sort={sort} onSort={ordenar} align="right" />
            </TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={9} className="h-44 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                    <SearchIcon className="size-5" />
                  </span>
                  <p className="text-[14px] font-semibold text-foreground">Nenhuma contestação aqui</p>
                  <p className="text-[13px] whitespace-normal text-(--o1-ink-3)">
                    Nada nesta visão com os filtros atuais.
                  </p>
                  {filtrosAtivos ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBusca('');
                        setProduto('todos');
                      }}
                      className="mt-1 rounded-md px-2 py-1 text-[13px] font-medium text-primary hover:bg-accent"
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            visiveis.map((m) => {
              const selecionada = selecao.has(m.id);
              const temComprovante = m.e2e === COMPROVANTE.e2e;
              const podeGerar = m.status === 'PRONTO' || m.status === 'DEFESA';
              return (
                <TableRow
                  key={m.id}
                  data-state={selecionada ? 'selected' : undefined}
                  className="h-14 border-border hover:bg-muted/60 data-[state=selected]:bg-accent/70"
                >
                  <TableCell className="relative pl-5">
                    {selecionada ? (
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
                    ) : null}
                    <Checkbox
                      aria-label={`Selecionar contestação de ${m.pagador}`}
                      checked={selecionada}
                      onCheckedChange={(v) => alternar(m.id, v === true)}
                    />
                  </TableCell>
                  <TableCell>
                    <E2E valor={m.e2e} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-(--o1-ink-2) ring-1 ring-border"
                      >
                        {iniciais(m.pagador)}
                      </span>
                      <span className="text-[13.5px] font-medium text-foreground">{m.pagador}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-(--o1-ink-2)">
                      {m.produto === 'Físico' ? (
                        <PackageIcon className="size-4 text-(--o1-ink-3)" aria-hidden="true" />
                      ) : (
                        <MonitorDownIcon className="size-4 text-(--o1-ink-3)" aria-hidden="true" />
                      )}
                      {m.produto}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] font-medium text-foreground tabular-nums">
                    {brl(m.valor)}
                  </TableCell>
                  <TableCell>
                    <Prazo horas={m.prazoHoras} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell>
                    <ScoreMeter score={m.score} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Menu>
                      <MenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Ações da contestação de ${m.pagador}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-(--o1-ink-3) outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-muted data-[state=open]:text-foreground"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </MenuTrigger>
                      <MenuContent align="end" className="w-56">
                        <MenuItem>
                          <ExternalLinkIcon />
                          Abrir contestação
                        </MenuItem>
                        <MenuItem disabled={!podeGerar}>
                          <SparklesIcon />
                          Gerar defesa
                        </MenuItem>
                        <MenuSeparator />
                        {temComprovante ? (
                          <MenuItem asChild>
                            <Link href={COMPROVANTE_HREF}>
                              <FileTextIcon />
                              Ver comprovante de envio
                            </Link>
                          </MenuItem>
                        ) : (
                          <MenuItem disabled>
                            <FileTextIcon />
                            Ver comprovante de envio
                          </MenuItem>
                        )}
                      </MenuContent>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Rodapé: paginação */}
      <footer className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-(--o1-ink-3)">
          Exibindo{' '}
          <span className="font-medium text-foreground tabular-nums">
            {inicio}–{fim}
          </span>{' '}
          de <span className="font-medium text-foreground tabular-nums">{linhas.length}</span> nesta visão
        </p>
        <nav aria-label="Paginação" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={paginaAtual === 0}
            onClick={() => setPagina(paginaAtual - 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-(--o1-ink-2) hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para a página ${i + 1}`}
              aria-current={i === paginaAtual ? 'page' : undefined}
              onClick={() => setPagina(i)}
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md font-mono text-[12.5px] font-medium tabular-nums transition-colors',
                i === paginaAtual
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-(--o1-ink-2) hover:bg-muted',
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            aria-label="Próxima página"
            disabled={paginaAtual >= totalPaginas - 1}
            onClick={() => setPagina(paginaAtual + 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-(--o1-ink-2) hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
