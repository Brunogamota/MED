'use client';

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import { RESUMO, brl } from '@/components/previews/marketplace/fixtures';
import { eyebrow, serif } from './tokens';

const config = {
  entrada: { label: 'MEDs recebidos', color: 'var(--ed-brand)' },
} satisfies ChartConfig;

const dec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

function rotuloDia(i: number, total: number): string {
  const atras = total - 1 - i;
  return atras === 0 ? 'Hoje' : `D-${atras}`;
}

export function IntakeChart({ className }: { className?: string }) {
  const serie = RESUMO.entradaDiaria;
  const dados = serie.map((entrada, i) => ({ dia: rotuloDia(i, serie.length), entrada }));
  const total = serie.reduce((a, b) => a + b, 0);
  const media = total / serie.length;
  const pico = Math.max(...serie);
  const diaPico = rotuloDia(serie.indexOf(pico), serie.length);

  return (
    <section
      aria-labelledby="ed-entrada-titulo"
      className={cn('rounded-[6px] border border-(--ed-rule) bg-(--ed-surface)', className)}
    >
      <header className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pt-6">
        <div>
          <p className={eyebrow}>Entrada</p>
          <h2 id="ed-entrada-titulo" className={cn(serif, 'mt-1.5 text-[22px] leading-tight font-normal tracking-[-0.01em]')}>
            Entrada de MEDs — últimos 14 dias
          </h2>
        </div>
        <dl className="flex gap-6 sm:text-right">
          <div>
            <dt className="text-[12px] text-(--ed-ink-2)">Total</dt>
            <dd className={cn(serif, 'text-[22px] leading-tight lining-nums tabular-nums')}>{total}</dd>
          </div>
          <div className="border-l border-(--ed-rule) pl-6">
            <dt className="flex items-center gap-1.5 text-[12px] sm:justify-end text-(--ed-ink-2)">
              <span aria-hidden className="w-3.5 border-t border-dashed border-(--ed-amber)" />
              Média/dia
            </dt>
            <dd className={cn(serif, 'text-[22px] leading-tight lining-nums tabular-nums')}>{dec.format(media)}</dd>
          </div>
          <div className="border-l border-(--ed-rule) pl-6">
            <dt className="text-[12px] text-(--ed-ink-2)">Pico</dt>
            <dd className={cn(serif, 'text-[22px] leading-tight lining-nums tabular-nums')}>
              {pico} <span className="font-sans text-[12px] text-(--ed-ink-2)">{diaPico}</span>
            </dd>
          </div>
        </dl>
      </header>

      <div className="px-2 pt-4 pb-3 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[232px] w-full">
          <AreaChart data={dados} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ed-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-entrada)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--color-entrada)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--ed-rule)" strokeDasharray="2 4" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={{ stroke: 'var(--ed-rule-strong)' }}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={8}
              tick={{ fontSize: 11, fill: 'var(--ed-ink-2)' }}
            />
            <YAxis
              width={30}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--ed-ink-2)' }}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--ed-rule-strong)', strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  className="rounded-[6px] border-(--ed-rule) bg-(--ed-surface) shadow-[0_8px_24px_-12px_rgba(26,23,20,0.25)]"
                  labelFormatter={(value) => String(value)}
                />
              }
            />
            <ReferenceLine
              y={media}
              stroke="var(--ed-amber)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              dataKey="entrada"
              type="monotone"
              stroke="var(--color-entrada)"
              strokeWidth={1.75}
              fill="url(#ed-area)"
              dot={false}
              activeDot={{ r: 3.5, fill: 'var(--ed-brand)', stroke: 'var(--ed-surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
}

/** Coluna ao lado do gráfico: o que compõe o em aberto, sobre o RESUMO. */
export function Composicao({ className }: { className?: string }) {
  const linhas = [
    { rotulo: 'Prontos para envio', valor: RESUMO.prontos, barra: 'bg-(--ed-brand)' },
    { rotulo: 'Sem evidência', valor: RESUMO.semEvidencia, barra: 'bg-(--ed-error)' },
    { rotulo: 'Vencendo em 24h', valor: RESUMO.vencendo24h, barra: 'bg-(--ed-amber)' },
  ];

  return (
    <section
      aria-labelledby="ed-composicao-titulo"
      className={cn('flex flex-col rounded-[6px] border border-(--ed-rule) bg-(--ed-surface) p-5 sm:p-6', className)}
    >
      <p className={eyebrow}>Leitura do dia</p>
      <h2 id="ed-composicao-titulo" className={cn(serif, 'mt-1.5 text-[22px] leading-tight font-normal tracking-[-0.01em]')}>
        Em aberto, por situação
      </h2>

      <div className="mt-6 border-b border-(--ed-rule) pb-5">
        <p className="text-[12px] text-(--ed-ink-2)">Valor em disputa</p>
        <p className={cn(serif, 'mt-1 text-[32px] leading-none tracking-[-0.015em] lining-nums tabular-nums')}>
          {brl(RESUMO.valorEmAberto)}
        </p>
      </div>

      <ul className="flex flex-1 flex-col">
        {linhas.map((l) => {
          const fracao = l.valor / RESUMO.emAberto;
          return (
            <li key={l.rotulo} className="border-b border-(--ed-rule) py-3.5 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] text-(--ed-ink)">{l.rotulo}</span>
                <span className="flex items-baseline gap-2">
                  <span className={cn(serif, 'text-[20px] leading-none lining-nums tabular-nums')}>{l.valor}</span>
                  <span className="w-9 text-right text-[12px] text-(--ed-ink-2) tabular-nums">{pct.format(fracao)}</span>
                </span>
              </div>
              <div aria-hidden className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-(--ed-muted)">
                <div className={cn('h-full rounded-full', l.barra)} style={{ width: `${fracao * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-(--ed-ink-2)">
        Percentual sobre as {RESUMO.emAberto} contestações em aberto.
      </p>
    </section>
  );
}
