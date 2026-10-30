'use client';

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { RESUMO } from '@/components/previews/marketplace/fixtures';

const config = {
  entrada: { label: 'MEDs recebidos', color: 'var(--nc-coral)' },
} satisfies ChartConfig;

const total = RESUMO.entradaDiaria.length;
const data = RESUMO.entradaDiaria.map((entrada, i) => {
  const offset = total - 1 - i;
  return { dia: offset === 0 ? 'Hoje' : `D-${offset}`, entrada };
});

const soma = RESUMO.entradaDiaria.reduce((a, b) => a + b, 0);
const media = soma / total;
const pico = Math.max(...RESUMO.entradaDiaria);

export function EntradaChart() {
  const [ativo, setAtivo] = useState<number | null>(null);

  return (
    <section
      aria-labelledby="nc-entrada-titulo"
      className="flex h-full flex-col rounded-(--radius) border border-(--nc-line) bg-(--nc-surface) p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="nc-entrada-titulo" className="text-[15px] font-semibold tracking-[-0.01em]">
            Entrada de MEDs — últimos 14 dias
          </h2>
          <p className="mt-1 text-[13px] text-(--nc-text-3)">MEDs recebidos por dia</p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Total</dt>
            <dd className="mt-1 font-mono text-lg font-medium tabular-nums">{soma}</dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Média/dia</dt>
            <dd className="mt-1 font-mono text-lg font-medium tabular-nums">
              {media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Pico</dt>
            <dd className="mt-1 font-mono text-lg font-medium tabular-nums">{pico}</dd>
          </div>
        </dl>
      </header>

      <ChartContainer config={config} className="mt-5 aspect-auto h-[232px] w-full flex-1">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
          barCategoryGap="22%"
          onMouseLeave={() => setAtivo(null)}
        >
          <CartesianGrid vertical={false} stroke="var(--nc-line)" strokeDasharray="3 4" />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            minTickGap={8}
            tick={{ fill: 'var(--nc-text-3)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tick={{ fill: 'var(--nc-text-3)', fontSize: 11 }}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--nc-surface-3)', opacity: 0.6, radius: 6 }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="entrada"
            fill="var(--color-entrada)"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
            onMouseEnter={(_, index) => setAtivo(index)}
          >
            {data.map((d, i) => {
              const destaque = ativo === null ? d.dia === 'Hoje' : ativo === i;
              return <Cell key={d.dia} fill="var(--nc-coral)" fillOpacity={destaque ? 1 : 0.5} />;
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
    </section>
  );
}
