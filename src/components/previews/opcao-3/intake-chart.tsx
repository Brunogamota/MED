'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { RESUMO } from '@/components/previews/fixtures';

const config = {
  meds: { label: 'MEDs recebidos', color: 'var(--op3-violet)' },
} satisfies ChartConfig;

/** Rótulo relativo ao dia mais recente da série — a série não traz datas. */
function rotulo(diasAtras: number): string {
  if (diasAtras === 0) return 'Hoje';
  if (diasAtras === 1) return 'Ontem';
  return `Há ${diasAtras} dias`;
}

export function Op3IntakeChart() {
  const serie = RESUMO.entradaDiaria;
  const data = serie.map((meds, i) => {
    const diasAtras = serie.length - 1 - i;
    return { tick: diasAtras === 0 ? 'Hoje' : `-${diasAtras}d`, rotulo: rotulo(diasAtras), meds };
  });
  const total = serie.reduce((soma, v) => soma + v, 0);
  const media = total / serie.length;
  const pico = Math.max(...serie);

  return (
    <Card className="op3-elev h-full gap-5 rounded-2xl py-5 ring-0 border border-border">
      <CardHeader className="px-5">
        <CardTitle className="text-[15px] font-semibold text-foreground">Entrada de MEDs — 14 dias</CardTitle>
        <CardDescription className="text-(--op3-ink-3)">MEDs recebidos por dia</CardDescription>
        <CardAction className="text-right">
          <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{total}</p>
          <p className="mt-1 text-xs text-(--op3-ink-3)">no período</p>
        </CardAction>
      </CardHeader>
      <CardContent className="px-3 sm:px-5">
        <ChartContainer config={config} className="aspect-auto h-[208px] w-full">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--op3-line)" />
            <XAxis
              dataKey="tick"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={6}
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} allowDecimals={false} />
            <ChartTooltip
              cursor={{ fill: 'var(--op3-lilac-soft)' }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const ponto = payload?.[0]?.payload as { rotulo?: string } | undefined;
                    return ponto?.rotulo ?? '';
                  }}
                />
              }
            />
            <ReferenceLine
              y={media}
              stroke="var(--op3-lilac)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <Bar dataKey="meds" fill="var(--color-meds)" radius={[6, 6, 2, 2]} maxBarSize={22} />
          </BarChart>
        </ChartContainer>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border px-2 pt-4 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-(--op3-ink-3)">
              <span aria-hidden className="h-0 w-3 border-t-2 border-dashed border-(--op3-lilac)" />
              Média por dia
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-(--op3-ink-3)">Maior entrada</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{pico} MEDs</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
