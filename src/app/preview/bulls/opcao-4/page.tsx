import { CalendarRange, Download, Send } from 'lucide-react';
import { RESUMO, STATUS_LABEL, brl } from '@/components/previews/fixtures';
import { EntradaChart, PRODUTO_COR, ProdutoDonut, SaudeChart } from '@/components/previews/opcao-4/charts';
import {
  ACIMA_DE_70,
  AMOSTRA,
  AMOSTRA_VALOR,
  ATIVIDADE,
  ENTRADA_MEDIA,
  ENTRADA_PICO,
  ENTRADA_SEMANA,
  ENTRADA_TOTAL,
  POR_PRODUTO,
  POR_STATUS,
  SAUDE,
  SCORE_MEDIO,
  TICKET_MEDIO,
  pct,
  pctLabel,
  type Atividade,
} from '@/components/previews/opcao-4/derived';
import { Delta, Meter, Panel } from '@/components/previews/opcao-4/panel';
import { QueueTable } from '@/components/previews/opcao-4/queue-table';
import { Reveal } from '@/components/previews/opcao-4/reveal';
import { O4Shell } from '@/components/previews/opcao-4/shell';
import { cn } from '@/lib/cn';

export const dynamic = 'force-static';

const KPIS: { rotulo: string; valor: string; detalhe: string; share?: number; tom?: string }[] = [
  {
    rotulo: 'Valor em contestação',
    valor: brl(RESUMO.valorEmAberto),
    detalhe: `Ticket médio ${brl(TICKET_MEDIO)}`,
  },
  { rotulo: 'Em aberto', valor: RESUMO.emAberto.toLocaleString('pt-BR'), detalhe: 'MEDs na fila' },
  {
    rotulo: 'Vencendo em 24h',
    valor: String(RESUMO.vencendo24h),
    detalhe: `${pctLabel(pct(RESUMO.vencendo24h, RESUMO.emAberto))} da fila`,
    share: pct(RESUMO.vencendo24h, RESUMO.emAberto),
    tom: 'bg-(--o4-error)',
  },
  {
    rotulo: 'Prontos para envio',
    valor: String(RESUMO.prontos),
    detalhe: `${pctLabel(pct(RESUMO.prontos, RESUMO.emAberto))} da fila`,
    share: pct(RESUMO.prontos, RESUMO.emAberto),
    tom: 'bg-(--o4-success)',
  },
  {
    rotulo: 'Sem evidência',
    valor: String(RESUMO.semEvidencia),
    detalhe: `${pctLabel(pct(RESUMO.semEvidencia, RESUMO.emAberto))} da fila`,
    share: pct(RESUMO.semEvidencia, RESUMO.emAberto),
    tom: 'bg-(--o4-warning)',
  },
  { rotulo: 'Enviados no mês', valor: RESUMO.enviadosMes.toLocaleString('pt-BR'), detalhe: 'Defesas entregues' },
];

const SAUDE_TOM: Record<string, string> = {
  fraca: 'bg-(--o4-error)',
  parcial: 'bg-(--o4-warning)',
  boa: 'bg-(--o4-violet)',
  forte: 'bg-(--o4-success)',
};
const SAUDE_ROTULO: Record<string, string> = {
  fraca: 'Fraca',
  parcial: 'Parcial',
  boa: 'Boa',
  forte: 'Forte',
};

const STATUS_BARRA: Record<string, string> = {
  SEM_ENVIO: 'bg-(--o4-error)',
  COLETANDO: 'bg-(--o4-warning)',
  DEFESA: 'bg-(--o4-brand)',
  PRONTO: 'bg-(--o4-success)',
  ENVIADO: 'bg-(--o4-subtle)',
};

const ATIVIDADE_TOM: Record<Atividade['tom'], string> = {
  brand: 'bg-(--o4-brand)',
  success: 'bg-(--o4-success)',
  warning: 'bg-(--o4-warning)',
  error: 'bg-(--o4-error)',
  neutral: 'bg-(--o4-subtle)',
};

function Iniciais({ nome }: { nome: string }) {
  const ini = nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-(--o4-raised) font-mono text-[10px] font-medium text-muted-foreground"
    >
      {ini}
    </span>
  );
}

export default function Opcao4Page() {
  const amostraSuffix = `amostra de ${AMOSTRA} MEDs da fila`;

  return (
    <O4Shell breadcrumb="Visão geral">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-5 sm:px-6 lg:py-6">
        {/* Título + ação principal */}
        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-(--o4-subtle)">Contestações MED · Pix</p>
            <h1 className="mt-1 text-[22px] font-semibold leading-7 tracking-[-0.01em] text-foreground">Visão geral</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CalendarRange aria-hidden="true" className="size-3.5 text-(--o4-subtle)" />
              Últimos 14 dias
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download aria-hidden="true" className="size-3.5 text-(--o4-subtle)" />
              Exportar
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-(--o4-brand-strong) bg-(--o4-brand-strong) px-3 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_0_0_1px_rgb(0_0_0/0.2)] outline-none transition-colors hover:bg-(--o4-brand) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Send aria-hidden="true" className="size-3.5" />
              Enviar prontos
              <span className="rounded-[4px] bg-black/20 px-1 font-mono text-[11px] tabular-nums">{RESUMO.prontos}</span>
            </button>
          </div>
        </Reveal>

        {/* KPIs */}
        <Reveal delay={0.04}>
          <section
            aria-label="Indicadores da fila"
            className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border bg-border md:grid-cols-3 xl:grid-cols-6"
            style={{ gap: 1 }}
          >
            {KPIS.map((k, i) => (
              <div key={k.rotulo} className="flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3">
                <span className="text-[12px] text-muted-foreground">{k.rotulo}</span>
                <span
                  className={cn(
                    'font-mono font-medium tabular-nums tracking-[-0.02em] text-foreground',
                    i === 0 ? 'text-[17px] leading-7 sm:text-[22px]' : 'text-[20px] leading-7',
                  )}
                >
                  {k.valor}
                </span>
                {k.share !== undefined && k.tom ? <Meter value={k.share} tone={k.tom} /> : null}
                <span className="text-[11px] text-(--o4-subtle)">{k.detalhe}</span>
              </div>
            ))}
          </section>
        </Reveal>

        {/* Entrada + saúde da evidência */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Reveal delay={0.08} className="lg:col-span-8">
            <Panel
              id="o4-entrada"
              title="MEDs recebidos"
              description="Por dia, últimos 14 dias"
              className="h-full"
              action={<Delta value={ENTRADA_SEMANA.variacao} suffix="vs 7d anteriores" />}
            >
              <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <span className="font-mono text-[26px] font-medium leading-8 tabular-nums tracking-[-0.02em] text-foreground">
                    {ENTRADA_TOTAL}
                  </span>
                  <span className="ml-1.5 text-[12px] text-(--o4-subtle)">no período</span>
                </div>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                  <div className="flex gap-1.5">
                    <dt className="text-(--o4-subtle)">Últimos 7d</dt>
                    <dd className="font-mono tabular-nums text-foreground">{ENTRADA_SEMANA.recente}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-(--o4-subtle)">7d anteriores</dt>
                    <dd className="font-mono tabular-nums text-foreground">{ENTRADA_SEMANA.anterior}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-(--o4-subtle)">Média/dia</dt>
                    <dd className="font-mono tabular-nums text-foreground">{ENTRADA_MEDIA.toLocaleString('pt-BR')}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-(--o4-subtle)">Pico</dt>
                    <dd className="font-mono tabular-nums text-foreground">{ENTRADA_PICO}</dd>
                  </div>
                </dl>
              </div>
              <EntradaChart />
            </Panel>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-4">
            <Panel id="o4-saude" title="Saúde da evidência" description={`Distribuição do score · ${amostraSuffix}`} className="h-full">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-[26px] font-medium leading-8 tabular-nums tracking-[-0.02em] text-foreground">
                    {SCORE_MEDIO.toLocaleString('pt-BR')}
                  </span>
                  <span className="ml-1.5 text-[12px] text-(--o4-subtle)">score médio</span>
                </div>
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-mono tabular-nums text-foreground">{ACIMA_DE_70}</span> de {AMOSTRA} com 70+
                </span>
              </div>
              <div className="mt-3">
                <SaudeChart />
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {SAUDE.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span aria-hidden="true" className={cn('size-2 rounded-[2px]', SAUDE_TOM[s.id])} />
                      {SAUDE_ROTULO[s.id]} <span className="font-mono text-[11px] text-(--o4-subtle)">{s.faixa}</span>
                    </span>
                    <span className="font-mono tabular-nums text-foreground">{s.meds}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        </div>

        {/* Fila + coluna lateral */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Reveal delay={0.16} className="min-w-0 lg:col-span-8">
            <QueueTable />
          </Reveal>

          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <Reveal delay={0.2}>
              <Panel id="o4-produto" title="Por produto" description={`Físico vs Digital · ${amostraSuffix}`}>
                <div className="flex items-center gap-4">
                  <ProdutoDonut centro={brl(AMOSTRA_VALOR)} legenda="em disputa" />
                  <ul className="flex min-w-0 flex-1 flex-col gap-3">
                    {POR_PRODUTO.map((p) => (
                      <li key={p.produto} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: PRODUTO_COR[p.produto] }} />
                            {p.produto}
                          </span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {pctLabel(pct(p.valor, AMOSTRA_VALOR))}
                          </span>
                        </div>
                        <div className="font-mono text-[13px] tabular-nums text-foreground">{brl(p.valor)}</div>
                        <div className="text-[11px] text-(--o4-subtle)">
                          {p.quantidade} MEDs · score médio {p.scoreMedio}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  <div className="mb-2 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-foreground">Por status</span>
                    <span className="text-(--o4-subtle)">{AMOSTRA} MEDs</span>
                  </div>
                  <div className="flex h-2 w-full gap-px overflow-hidden rounded-full" aria-hidden="true">
                    {POR_STATUS.filter((s) => s.quantidade > 0).map((s) => (
                      <span key={s.status} className={STATUS_BARRA[s.status]} style={{ flexGrow: s.quantidade }} />
                    ))}
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1">
                    {POR_STATUS.map((s) => (
                      <li key={s.status} className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span aria-hidden="true" className={cn('size-2 rounded-[2px]', STATUS_BARRA[s.status])} />
                          {STATUS_LABEL[s.status]}
                        </span>
                        <span className="font-mono tabular-nums text-foreground">{s.quantidade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.24}>
              <Panel id="o4-atividade" title="Atividade" description="Últimos movimentos na fila" bodyClassName="px-0 pb-1 pt-2">
                <ol className="relative">
                  {ATIVIDADE.map((a, i) => (
                    <li key={a.id} className="relative flex gap-3 px-4 py-2">
                      {i < ATIVIDADE.length - 1 ? (
                        <span aria-hidden="true" className="absolute bottom-0 left-[1.85rem] top-9 w-px bg-border" />
                      ) : null}
                      <div className="relative">
                        <Iniciais nome={a.pessoa} />
                        <span
                          aria-hidden="true"
                          className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card', ATIVIDADE_TOM[a.tom])}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-foreground">
                          <span className="font-medium">{a.titulo}</span>
                          <span className="text-(--o4-subtle)"> — </span>
                          <span className="text-muted-foreground">{a.pessoa}</span>
                        </p>
                        <p className="truncate font-mono text-[11px] text-(--o4-subtle)">
                          {a.detalhe}
                          {a.quando ? ` · ${a.quando}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            </Reveal>
          </div>
        </div>
      </div>
    </O4Shell>
  );
}
