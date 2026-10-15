'use client';

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { RESUMO } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { GLASS, HEADING, MONO } from './theme';

const config = {
  entradas: { label: 'MEDs recebidos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const serie = RESUMO.entradaDiaria;
const ultimo = serie.length - 1;
const dados = serie.map((entradas, i) => ({
  dia: i === ultimo ? 'Hoje' : `D-${ultimo - i}`,
  entradas,
}));

const total = serie.reduce((s, v) => s + v, 0);
const media = total / serie.length;
const pico = Math.max(...serie);

const decimal = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Área grande, degradê roxo, linha de média tracejada. */
export function IntakeChart() {
  const stats = [
    { label: 'Total no período', value: String(total) },
    { label: 'Média por dia', value: decimal(media) },
    { label: 'Pico', value: String(pico) },
  ];
  return (
    <section aria-labelledby="o5-entrada" className={cn(GLASS, 'flex h-full flex-col p-5 sm:p-6')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="o5-entrada" className={cn(HEADING, 'text-base font-semibold text-foreground')}>
            Entrada de MEDs — 14 dias
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">MEDs recebidos por dia</p>
        </div>
        <dl className="grid grid-cols-3 gap-5 sm:gap-7">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[11px] font-medium text-muted-foreground">{s.label}</dt>
              <dd className={cn(MONO, 'mt-1 text-lg leading-none font-semibold text-foreground')}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ChartContainer config={config} className="mt-6 aspect-auto h-[260px] w-full sm:h-[280px]">
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="o5-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-entradas)" stopOpacity={0.5} />
              <stop offset="55%" stopColor="var(--o5-violet)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--o5-violet)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="o5-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--o5-violet)" />
              <stop offset="100%" stopColor="var(--o5-lilac)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="rgb(255 255 255 / 0.07)" />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            minTickGap={16}
            tick={{ fontFamily: 'var(--o5-mono)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tick={{ fontFamily: 'var(--o5-mono)', fontSize: 11 }}
          />
          <ReferenceLine
            y={media}
            stroke="var(--o5-lilac)"
            strokeOpacity={0.55}
            strokeDasharray="4 4"
            label={{
              value: `média ${decimal(media)}`,
              position: 'insideTopRight',
              fill: 'var(--o5-lilac)',
              fontSize: 11,
            }}
          />
          <ChartTooltip
            cursor={{ stroke: 'rgb(192 132 252 / 0.4)', strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                indicator="line"
                className="border-border bg-popover backdrop-blur-xl"
              />
            }
          />
          <Area
            dataKey="entradas"
            type="monotone"
            stroke="url(#o5-stroke)"
            strokeWidth={2.25}
            fill="url(#o5-area)"
            activeDot={{ r: 5, fill: 'var(--o5-lilac)', stroke: '#020617', strokeWidth: 2 }}
            animationDuration={900}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
