'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { RESUMO } from '@/components/previews/marketplace/fixtures';

const config = {
  meds: { label: 'MEDs recebidos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const ULTIMO = RESUMO.entradaDiaria.length - 1;

/** Rótulo relativo: D-13 … D-1, Hoje. */
function rotulo(i: number): string {
  return i === ULTIMO ? 'Hoje' : `D-${ULTIMO - i}`;
}

const DADOS = RESUMO.entradaDiaria.map((meds, i) => ({ dia: rotulo(i), meds }));
const TOTAL = RESUMO.entradaDiaria.reduce((a, b) => a + b, 0);
const MEDIA = TOTAL / RESUMO.entradaDiaria.length;
const PICO = Math.max(...RESUMO.entradaDiaria);
const PICO_DIA = rotulo(RESUMO.entradaDiaria.indexOf(PICO));

function fmt(n: number, casas = 0): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function Stat({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[12.5px] text-(--o1-ink-3)">{label}</dt>
      <dd className="flex items-baseline gap-1.5">
        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
          {valor}
        </span>
        {nota ? <span className="text-[12px] text-(--o1-ink-3)">{nota}</span> : null}
      </dd>
    </div>
  );
}

export function IntakeChart() {
  return (
    <section
      aria-labelledby="o1-entrada-titulo"
      className="rounded-[12px] border border-border bg-card shadow-(--o1-shadow)"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="o1-entrada-titulo" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Entrada de MEDs — últimos 14 dias
          </h2>
          <p className="mt-0.5 text-[13px] text-(--o1-ink-3)">Contestações recebidas por dia</p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-(--o1-ink-2)">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-primary" />
            MEDs recebidos
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0 w-4 border-t-[1.5px] border-dashed border-(--o1-ink-3)" />
            Média diária
          </span>
        </div>
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-[200px_1fr]">
        <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:content-start lg:gap-6 lg:border-r lg:border-border lg:pr-6">
          <Stat label="Total no período" valor={fmt(TOTAL)} nota="MEDs" />
          <Stat label="Média diária" valor={fmt(MEDIA, 1)} />
          <Stat label="Pico" valor={fmt(PICO)} nota={PICO_DIA} />
        </dl>
        <ChartContainer config={config} className="aspect-auto h-[232px] w-full">
          <BarChart data={DADOS} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} width={44} tickMargin={6} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              cursor={{ fill: 'var(--accent)' }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-40"
                  formatter={(value) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="text-(--o1-ink-3)">MEDs recebidos</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">{String(value)}</span>
                    </span>
                  )}
                />
              }
            />
            <ReferenceLine
              y={MEDIA}
              stroke="var(--o1-ink-3)"
              strokeDasharray="4 4"
              strokeWidth={1.25}
              ifOverflow="extendDomain"
            />
            <Bar dataKey="meds" fill="var(--color-meds)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}
