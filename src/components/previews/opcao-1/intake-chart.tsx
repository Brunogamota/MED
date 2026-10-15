'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/cn';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { RESUMO } from '@/components/previews/fixtures';

const config = {
  meds: { label: 'MEDs recebidos', color: '#A855F7' },
} satisfies ChartConfig;

type Range = 7 | 14;

/** Dia relativo: a série é "últimos 14 dias", então o último ponto é hoje. */
function relativo(offset: number): string {
  if (offset === 0) return 'Hoje';
  if (offset === 1) return 'Ontem';
  return `Há ${offset} dias`;
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function IntakeChart() {
  const [range, setRange] = useState<Range>(14);

  const data = useMemo(() => {
    const serie = RESUMO.entradaDiaria;
    const last = serie.length - 1;
    return serie
      .map((meds, i) => ({ dia: relativo(last - i), eixo: last - i === 0 ? 'Hoje' : `-${last - i}d`, meds }))
      .slice(-range);
  }, [range]);

  const total = data.reduce((a, d) => a + d.meds, 0);
  const pico = Math.max(...data.map((d) => d.meds));
  const media = total / data.length;

  return (
    <section aria-labelledby="o1-entrada" className="flex flex-col rounded-xl border border-white/[0.07] bg-card shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 id="o1-entrada" className="text-[14px] font-medium text-foreground">
            Entrada de MEDs
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Recebidos por dia, últimos {range} dias</p>
        </div>
        <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-white/[0.08] bg-background/60 p-0.5">
          {([7, 14] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'h-7 rounded-md px-3 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60',
                range === r ? 'bg-(--o1-surface) text-foreground shadow-sm' : 'text-muted-foreground hover:text-(--o1-text-2)',
              )}
            >
              {r} dias
            </button>
          ))}
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-3 gap-4 px-5">
        {[
          { k: 'Total no período', v: String(total) },
          { k: 'Média por dia', v: decimal.format(media) },
          { k: 'Pico diário', v: String(pico) },
        ].map((m) => (
          <div key={m.k} className="min-w-0">
            <dt className="truncate text-[11.5px] text-muted-foreground">{m.k}</dt>
            <dd className="mt-1 font-mono text-[20px] leading-none font-medium tracking-[-0.02em] text-foreground tabular-nums">{m.v}</dd>
          </div>
        ))}
      </dl>

      <ChartContainer config={config} className="mt-4 aspect-auto h-[232px] w-full px-2 pb-3">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="o1-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-meds)" stopOpacity={0.36} />
              <stop offset="70%" stopColor="var(--color-meds)" stopOpacity={0.06} />
              <stop offset="100%" stopColor="var(--color-meds)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(148 163 184 / 0.1)" strokeDasharray="3 4" />
          <XAxis dataKey="eixo" tickLine={false} axisLine={false} tickMargin={10} interval={range === 14 ? 1 : 0} tick={{ fill: '#94A3B8', fontSize: 11 }} />
          <YAxis width={32} tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
          <ChartTooltip
            cursor={{ stroke: 'rgb(168 85 247 / 0.45)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={
              <ChartTooltipContent
                className="border-white/10 bg-[#0F172A] text-foreground"
                indicator="line"
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { dia?: string } | undefined;
                  return p?.dia ?? '';
                }}
              />
            }
          />
          <Area
            dataKey="meds"
            type="monotone"
            stroke="var(--color-meds)"
            strokeWidth={2}
            fill="url(#o1-area)"
            activeDot={{ r: 4, fill: '#A855F7', stroke: '#020617', strokeWidth: 2 }}
            animationDuration={900}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
