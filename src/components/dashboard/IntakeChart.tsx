'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { IntakeDay } from '@/lib/dashboard';

/**
 * MEDs recebidos por dia, com o valor contestado no mesmo eixo temporal.
 *
 * O grafico le a data de abertura do proprio MED: dia sem MED e um zero de
 * verdade no eixo. A curva e `monotone`, nao `natural`: spline natural
 * ultrapassa o maximo real entre pontos, e numa serie esparsa isso desenha
 * um pico que nenhum dia teve.
 */

const chartConfig = {
  received: { label: 'MEDs recebidos', color: 'var(--chart-2)' },
  amount: { label: 'Valor contestado', color: 'var(--chart-4)' },
} satisfies ChartConfig;

function dayLabel(value: string): string {
  // A serie e montada em UTC; o rotulo tambem, para nao deslocar o dia.
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function IntakeChart({ series, days }: { series: IntakeDay[]; days: number }) {
  const total = series.reduce((sum, day) => sum + day.received, 0);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Entrada de MEDs</CardTitle>
        <CardDescription>
          {total === 0
            ? `Nenhum MED aberto nos últimos ${days} dias`
            : `${total} MEDs abertos nos últimos ${days} dias`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <AreaChart data={series} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-received)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--color-received)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.24} />
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={48}
              tickFormatter={dayLabel}
            />
            {/* Contagem e dinheiro vivem em ordens de grandeza diferentes: sem
                dois eixos, a curva de MEDs viraria uma linha reta no rodape.
                Ambos ficam ocultos — a leitura exata sai do tooltip. */}
            <YAxis hide domain={[0, 'dataMax']} />
            <YAxis yAxisId="amount" hide orientation="right" domain={[0, 'dataMax']} />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-52"
                  indicator="line"
                  labelFormatter={(value) => dayLabel(String(value))}
                  formatter={(value, name) =>
                    name === 'amount'
                      ? [
                          Number(value).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }),
                          ' Valor contestado',
                        ]
                      : [String(value), ' MEDs recebidos']
                  }
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

            <Area
              dataKey="amount"
              type="monotone"
              fill="url(#fillAmount)"
              stroke="var(--color-amount)"
              strokeWidth={1.2}
              dot={false}
              fillOpacity={1}
              yAxisId="amount"
            />
            <Area
              dataKey="received"
              type="monotone"
              fill="url(#fillReceived)"
              stroke="var(--color-received)"
              strokeWidth={1.4}
              dot={false}
              fillOpacity={1}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
