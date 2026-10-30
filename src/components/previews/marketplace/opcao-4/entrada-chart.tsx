'use client';

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { display, eyebrow, inteiro, mono } from './ui';

const ULTIMO = RESUMO.entradaDiaria.length - 1;

const DADOS = RESUMO.entradaDiaria.map((meds, i) => ({
  dia: i === ULTIMO ? 'Hoje' : `D-${ULTIMO - i}`,
  meds,
}));

const TOTAL = RESUMO.entradaDiaria.reduce((a, b) => a + b, 0);
const MEDIA = TOTAL / RESUMO.entradaDiaria.length;
const PICO = Math.max(...RESUMO.entradaDiaria);
const HOJE = RESUMO.entradaDiaria[ULTIMO];

const MEDIA_FMT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(MEDIA);

const config = {
  meds: { label: 'MEDs recebidos', color: 'var(--o4-yellow)' },
} satisfies ChartConfig;

export function EntradaChart({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="o4-entrada-titulo"
      className={cn('border-2 border-(--o4-ink) bg-(--o4-paper)', className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-(--o4-ink) px-5 py-4">
        <div className="flex flex-col gap-2">
          <h2 id="o4-entrada-titulo" className={eyebrow}>
            Entrada de MEDs — últimos 14 dias
          </h2>
          <p className={cn(display, 'text-[34px] font-bold leading-none tabular-nums')}>
            {inteiro(TOTAL)}
            <span className={cn(mono, 'ml-2 text-[11px] font-normal tracking-normal text-(--o4-ink-3)')}>MEDs recebidos</span>
          </p>
        </div>
        <dl className={cn(mono, 'flex gap-5 text-[11px]')}>
          <div className="flex flex-col gap-1">
            <dt className="uppercase tracking-[0.12em] text-(--o4-ink-3)">Média</dt>
            <dd className="font-semibold">{MEDIA_FMT}/dia</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="uppercase tracking-[0.12em] text-(--o4-ink-3)">Pico</dt>
            <dd className="font-semibold">{inteiro(PICO)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="uppercase tracking-[0.12em] text-(--o4-ink-3)">Hoje</dt>
            <dd className="font-semibold">{HOJE !== undefined ? inteiro(HOJE) : '—'}</dd>
          </div>
        </dl>
      </header>

      <div className="px-2 pb-3 pt-5 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[210px] w-full">
          <BarChart data={DADOS} margin={{ top: 4, right: 8, bottom: 0, left: -12 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--o4-rule)" strokeDasharray="0" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={{ stroke: 'var(--o4-ink)', strokeWidth: 2 }}
              tickMargin={8}
              minTickGap={6}
              tick={{ fontFamily: 'var(--o4-mono)', fontSize: 10, fill: 'var(--o4-ink-2)' }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontFamily: 'var(--o4-mono)', fontSize: 10, fill: 'var(--o4-ink-3)' }}
            />
            <ReferenceLine
              y={MEDIA}
              stroke="var(--o4-ink)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
            <Tooltip
              cursor={{ fill: 'var(--o4-panel)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0]?.value;
                return (
                  <div className="border-2 border-(--o4-ink) bg-(--o4-paper) px-3 py-2 shadow-[3px_3px_0_var(--o4-ink)]">
                    <p className={cn(mono, 'text-[10px] uppercase tracking-[0.12em] text-(--o4-ink-3)')}>{label}</p>
                    <p className={cn(display, 'text-[20px] font-bold leading-tight tabular-nums')}>
                      {typeof v === 'number' ? inteiro(v) : String(v ?? '')}
                      <span className={cn(mono, 'ml-1.5 text-[10px] font-normal text-(--o4-ink-3)')}>MEDs</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="meds" name="MEDs recebidos" stroke="var(--o4-ink)" strokeWidth={1.5} radius={0} isAnimationActive={false}>
              {DADOS.map((d, i) => (
                <Cell key={d.dia} fill={i === ULTIMO ? 'var(--o4-ink)' : 'var(--color-meds)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className={cn(mono, 'mt-2 flex items-center gap-4 px-2 text-[10px] text-(--o4-ink-3)')}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-(--o4-ink)" />
            Média do período
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5 bg-(--o4-ink)" />
            Hoje
          </span>
        </p>
      </div>
    </section>
  );
}
