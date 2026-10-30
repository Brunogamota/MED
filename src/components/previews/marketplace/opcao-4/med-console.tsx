'use client';

import { useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { Clock3, Search, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  MEDS,
  STATUS_LABEL,
  brl,
  prazo,
  type PreviewMed,
  type PreviewStatus,
} from '@/components/previews/marketplace/fixtures';
import { EntradaChart } from './entrada-chart';
import { KpiStrip } from './kpi-strip';
import { MedDetail } from './med-detail';
import {
  ScoreBar,
  StatusChip,
  StatusSwatch,
  display,
  e2eCurto,
  eyebrow,
  focusRing,
  hardButton,
  mono,
  scoreTier,
} from './ui';

type Filtro = 'todos' | 'vencendo' | PreviewStatus;

const FILA = [...MEDS].sort((a, b) => a.prazoHoras - b.prazoHoras);

const FILTROS: { id: Filtro; label: string; conta: (m: PreviewMed) => boolean }[] = [
  { id: 'todos', label: 'Todos', conta: () => true },
  { id: 'vencendo', label: 'Vence em 24h', conta: (m) => m.prazoHoras < 24 },
  ...(['PRONTO', 'SEM_ENVIO', 'DEFESA', 'COLETANDO', 'ENVIADO'] as const).map((s) => ({
    id: s,
    label: STATUS_LABEL[s],
    conta: (m: PreviewMed) => m.status === s,
  })),
];

const checkboxCls = cn(
  'size-[18px] rounded-none border-2 border-(--o4-ink) bg-(--o4-paper) dark:bg-(--o4-paper)',
  'data-checked:border-(--o4-ink) data-checked:bg-(--o4-ink) data-checked:text-(--o4-yellow) dark:data-checked:bg-(--o4-ink)',
  'focus-visible:border-(--o4-ink) focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--o4-ink)',
);

/* ---------- Linha da fila ---------- */

function Linha({
  med,
  selecionado,
  realce,
  marcado,
  onMarcar,
  onAbrir,
  onHover,
}: {
  med: PreviewMed;
  selecionado: boolean;
  realce: boolean;
  marcado: boolean;
  onMarcar: (v: boolean) => void;
  onAbrir: () => void;
  onHover: () => void;
}) {
  const reduce = useReducedMotion();
  const urgente = med.prazoHoras < 24;
  const tier = scoreTier(med.score);

  return (
    <li
      className={cn(
        'relative border-b-[1.5px] border-(--o4-ink) last:border-b-0',
        selecionado && !realce && 'bg-(--o4-panel)',
      )}
      onMouseEnter={onHover}
    >
      {/*
       * Barra de realce do "Interactive List Preview" (21st.dev #26256): um
       * bloco só que desliza até a linha sob o cursor e volta para a linha
       * aberta quando o cursor sai da lista. Sem imagem flutuante.
       */}
      {realce ? (
        <motion.span
          layoutId="o4-realce"
          aria-hidden="true"
          className="absolute inset-0 bg-(--o4-yellow)"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
        />
      ) : null}
      {selecionado ? <span aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-[5px] bg-(--o4-ink)" /> : null}

      <div className="relative flex items-center gap-3 pl-4 sm:gap-4">
        <Checkbox
          checked={marcado}
          onCheckedChange={(v) => onMarcar(v === true)}
          aria-label={`Selecionar MED de ${med.pagador}`}
          className={checkboxCls}
        />
        <button
          type="button"
          onClick={onAbrir}
          onFocus={onHover}
          aria-current={selecionado ? 'true' : undefined}
          className={cn(
            'grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-3.5 pr-4 text-left',
            'sm:grid-cols-[minmax(0,1fr)_6.5rem_11rem]',
            focusRing,
            'focus-visible:outline-offset-[-3px]',
          )}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <StatusSwatch status={med.status} className="sm:hidden" />
              <span className={cn('truncate text-[14px]', selecionado ? 'font-bold' : 'font-semibold')}>
                {med.pagador}
              </span>
            </span>
            <span className={cn(mono, 'truncate text-[11px] text-(--o4-ink-2)')}>
              {e2eCurto(med.e2e)} <span aria-hidden="true">·</span> {med.produto}
            </span>
          </span>

          <span className="flex flex-col items-end gap-1">
            <span className={cn(display, 'text-[16px] font-bold tabular-nums')}>{brl(med.valor)}</span>
            <span
              className={cn(
                mono,
                'inline-flex items-center gap-1 text-[11px] tabular-nums',
                urgente ? 'font-semibold text-(--o4-warning)' : 'text-(--o4-ink-2)',
              )}
            >
              <Clock3 className="size-3" aria-hidden="true" />
              <span className="sr-only">Prazo </span>
              {prazo(med.prazoHoras)}
            </span>
          </span>

          <span className="hidden flex-col items-start gap-1.5 sm:flex">
            <StatusChip status={med.status} />
            <span className="flex w-full items-center gap-2">
              <ScoreBar score={med.score} className="w-full max-w-24 flex-1" />
              <span className={cn(mono, 'text-[11px] font-semibold tabular-nums', tier.text)}>{med.score}</span>
            </span>
          </span>
          <span className="sr-only sm:hidden">
            {STATUS_LABEL[med.status]}, score {med.score}
          </span>
        </button>
      </div>
    </li>
  );
}

/* ---------- Console ---------- */

export function MedConsole() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [aberto, setAberto] = useState<string | undefined>(FILA[0]?.id);
  const [hover, setHover] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set());
  const detalheRef = useRef<HTMLDivElement>(null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const f = FILTROS.find((x) => x.id === filtro);
    return FILA.filter(
      (m) => (!f || f.conta(m)) && (!q || m.pagador.toLowerCase().includes(q) || m.e2e.toLowerCase().includes(q)),
    );
  }, [busca, filtro]);

  const medAberto = FILA.find((m) => m.id === aberto) ?? FILA[0];
  const realceId = hover ?? aberto;
  const todosMarcados = visiveis.length > 0 && visiveis.every((m) => marcados.has(m.id));

  function marcar(id: string, v: boolean) {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function marcarTodos(v: boolean) {
    setMarcados((prev) => {
      const next = new Set(prev);
      for (const m of visiveis) {
        if (v) next.add(m.id);
        else next.delete(m.id);
      }
      return next;
    });
  }

  function abrir(id: string) {
    setAberto(id);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function limpar() {
    setBusca('');
    setFiltro('todos');
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:gap-8 lg:px-8 lg:pt-8">
      {/* Cabeçalho da página. */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Marketplace Verificado · Fila de MEDs</p>
          <h1 className={cn(display, 'text-[40px] font-bold leading-[0.9] sm:text-[56px]')}>Contestações</h1>
          <p className="max-w-[56ch] text-[14px] leading-relaxed text-(--o4-ink-2)">
            Cada MED com o prazo de resposta, o score de evidência e o próximo passo. A fila vem ordenada pelo prazo
            mais curto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className={hardButton('plain')}>
            <a href="#">
              <Upload aria-hidden="true" />
              Importar MEDs
            </a>
          </Button>
          <Button className={hardButton('brand', 'h-11 px-5 text-[14px]')}>
            <Sparkles aria-hidden="true" />
            Gerar defesas
            {marcados.size > 0 ? (
              <span
                className={cn(
                  mono,
                  'ml-0.5 inline-flex h-5 min-w-5 items-center justify-center bg-(--o4-ink) px-1 text-[11px] text-(--o4-yellow)',
                )}
              >
                {marcados.size}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <KpiStrip />

      {/* Mestre–detalhe. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        {/* Fila. */}
        <section
          id="fila"
          aria-labelledby="o4-fila-titulo"
          className="min-w-0 scroll-mt-28 border-2 border-(--o4-ink) bg-(--o4-paper)"
        >
          <div className="flex flex-col gap-3 border-b-2 border-(--o4-ink) p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="o4-fila-titulo" className={cn(display, 'text-[22px] font-bold leading-none')}>
                Fila
              </h2>
              <p className={cn(mono, 'text-[11px] text-(--o4-ink-3)')} aria-live="polite">
                {visiveis.length} de {FILA.length} MEDs
                {marcados.size > 0 ? ` · ${marcados.size} marcados` : ''}
              </p>
            </div>

            <div className="relative">
              <label htmlFor="o4-busca" className="sr-only">
                Buscar por pagador ou end-to-end
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--o4-ink-2)"
                aria-hidden="true"
              />
              <Input
                id="o4-busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por pagador ou end-to-end"
                className={cn(
                  'h-10 rounded-none border-2 border-(--o4-ink) bg-(--o4-paper) pl-9 pr-9 text-[14px] shadow-none dark:bg-(--o4-paper)',
                  'placeholder:text-(--o4-ink-3) focus-visible:border-(--o4-ink) focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_var(--o4-ink)]',
                  '[&::-webkit-search-cancel-button]:appearance-none',
                )}
              />
              {busca ? (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  aria-label="Limpar busca"
                  className={cn(
                    'absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center hover:bg-(--o4-panel)',
                    focusRing,
                  )}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div
              role="group"
              aria-label="Filtrar fila"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible"
            >
              {FILTROS.map((f) => {
                const ativo = filtro === f.id;
                const n = FILA.filter(f.conta).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setFiltro(f.id)}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-2 border-[1.5px] border-(--o4-ink) px-2.5',
                      mono,
                      'text-[10.5px] font-medium uppercase tracking-[0.08em] transition-colors',
                      ativo ? 'bg-(--o4-ink) text-(--o4-paper)' : 'bg-(--o4-paper) text-(--o4-ink) hover:bg-(--o4-yellow)',
                      focusRing,
                    )}
                  >
                    {f.label}
                    <span className={cn('tabular-nums', ativo ? 'text-(--o4-yellow)' : 'text-(--o4-ink-3)')}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cabeçalho das colunas. */}
          <div className="flex items-center gap-3 border-b-2 border-(--o4-ink) bg-(--o4-panel) py-2 pl-4 sm:gap-4">
            <Checkbox
              checked={todosMarcados}
              onCheckedChange={(v) => marcarTodos(v === true)}
              aria-label="Selecionar todos os MEDs visíveis"
              disabled={visiveis.length === 0}
              className={checkboxCls}
            />
            <div
              aria-hidden="true"
              className={cn(
                eyebrow,
                'grid flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 pr-4 sm:grid-cols-[minmax(0,1fr)_6.5rem_11rem]',
              )}
            >
              <span>Pagador · end-to-end</span>
              <span className="text-right">Valor · prazo</span>
              <span className="hidden sm:block">Status · score</span>
            </div>
          </div>

          {visiveis.length > 0 ? (
            <LayoutGroup id="o4-fila">
              <ul
                aria-label="MEDs na fila"
                onMouseLeave={() => setHover(null)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setHover(null);
                }}
              >
                {visiveis.map((m) => (
                  <Linha
                    key={m.id}
                    med={m}
                    selecionado={m.id === aberto}
                    realce={m.id === realceId}
                    marcado={marcados.has(m.id)}
                    onMarcar={(v) => marcar(m.id, v)}
                    onAbrir={() => abrir(m.id)}
                    onHover={() => setHover(m.id)}
                  />
                ))}
              </ul>
            </LayoutGroup>
          ) : (
            <div className="flex flex-col items-start gap-4 px-5 py-10">
              <p className={cn(display, 'text-[22px] font-bold leading-tight')}>Nenhum MED com esse recorte.</p>
              <p className="text-[14px] text-(--o4-ink-2)">Ajuste a busca ou volte para a fila inteira.</p>
              <Button className={hardButton('plain')} onClick={limpar}>
                Limpar busca e filtros
              </Button>
            </div>
          )}
        </section>

        {/* Detalhe + entrada diária. */}
        <div ref={detalheRef} className="flex min-w-0 scroll-mt-28 flex-col gap-6 lg:gap-8">
          {medAberto ? (
            <MedDetail med={medAberto} />
          ) : (
            <div className="border-2 border-dashed border-(--o4-ink) px-5 py-10 text-[14px] text-(--o4-ink-2)">
              Escolha um MED na fila para ver o detalhe.
            </div>
          )}
          <EntradaChart />
        </div>
      </div>
    </div>
  );
}
