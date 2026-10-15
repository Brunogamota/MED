'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { brl } from '@/components/previews/fixtures';
import { ENTRADA, POR_PRODUTO, SAUDE, type Faixa } from './derived';

const TOOLTIP_CLS = 'rounded-md border-border bg-(--o4-raised) font-sans';

const entradaConfig = {
  meds: { label: 'MEDs recebidos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export function EntradaChart() {
  return (
    <ChartContainer config={entradaConfig} className="aspect-auto h-[208px] w-full">
      <AreaChart data={ENTRADA} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} accessibilityLayer>
        <defs>
          <linearGradient id="o4-entrada" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-meds)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--color-meds)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border)" />
        <XAxis
          dataKey="dia"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={14}
          tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={44}
          allowDecimals={false}
          tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--border)' }}
          content={<ChartTooltipContent indicator="line" className={TOOLTIP_CLS} />}
        />
        <Area
          dataKey="meds"
          type="monotone"
          stroke="var(--color-meds)"
          strokeWidth={1.75}
          fill="url(#o4-entrada)"
          activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'var(--card)' }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const FAIXA_COR: Record<Faixa, string> = {
  fraca: 'var(--o4-error)',
  parcial: 'var(--o4-warning)',
  boa: 'var(--o4-violet)',
  forte: 'var(--o4-success)',
};

const saudeConfig = {
  meds: { label: 'MEDs na faixa', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export function SaudeChart() {
  return (
    <ChartContainer config={saudeConfig} className="aspect-auto h-[132px] w-full">
      <BarChart data={SAUDE} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={10} accessibilityLayer>
        <XAxis
          dataKey="faixa"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--accent)' }}
          content={<ChartTooltipContent hideIndicator className={TOOLTIP_CLS} labelFormatter={(v) => `Score ${String(v)}`} />}
        />
        <Bar dataKey="meds" radius={[3, 3, 0, 0]}>
          {SAUDE.map((s) => (
            <Cell key={s.id} fill={FAIXA_COR[s.id]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export const PRODUTO_COR: Record<'Físico' | 'Digital', string> = {
  Físico: 'var(--chart-1)',
  Digital: 'var(--chart-3)',
};

const produtoConfig = {
  Físico: { label: 'Físico', color: 'var(--chart-1)' },
  Digital: { label: 'Digital', color: 'var(--chart-3)' },
} satisfies ChartConfig;

export function ProdutoDonut({ centro, legenda }: { centro: string; legenda: string }) {
  return (
    <div className="relative size-[132px] shrink-0">
      <ChartContainer config={produtoConfig} className="aspect-square size-[132px]">
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="produto"
                className={TOOLTIP_CLS}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{String(name)}</span>
                    <span className="font-mono tabular-nums text-foreground">{brl(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={POR_PRODUTO}
            dataKey="valor"
            nameKey="produto"
            innerRadius={46}
            outerRadius={62}
            paddingAngle={3}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
          >
            {POR_PRODUTO.map((p) => (
              <Cell key={p.produto} fill={PRODUTO_COR[p.produto]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[12px] font-medium tabular-nums text-foreground">{centro}</span>
        <span className="text-[10px] text-(--o4-subtle)">{legenda}</span>
      </div>
    </div>
  );
}
