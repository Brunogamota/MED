import { cn } from '@/lib/cn';
import { RESUMO, brl } from '@/components/previews/marketplace/fixtures';
import { display, eyebrow, inteiro, mono, pct } from './ui';

type Kpi = {
  id: string;
  label: string;
  value: string;
  note: string;
  marker?: 'warning' | 'error' | 'success';
  inverse?: boolean;
  span: string;
};

const MARKER = {
  warning: 'bg-(--o4-warning)',
  error: 'bg-(--o4-error)',
  success: 'bg-(--o4-success)',
} as const;

const KPIS: Kpi[] = [
  {
    id: 'aberto',
    label: 'Em aberto',
    value: inteiro(RESUMO.emAberto),
    note: `${brl(RESUMO.valorEmAberto)} em disputa`,
    inverse: true,
    span: 'col-span-2 md:col-span-2 xl:col-span-1',
  },
  {
    id: 'vencendo',
    label: 'Vencendo em 24h',
    value: inteiro(RESUMO.vencendo24h),
    note: `${pct(RESUMO.vencendo24h, RESUMO.emAberto)} da fila em aberto`,
    marker: 'warning',
    span: 'md:col-span-2 xl:col-span-1',
  },
  {
    id: 'prontos',
    label: 'Prontos para envio',
    value: inteiro(RESUMO.prontos),
    note: `${pct(RESUMO.prontos, RESUMO.emAberto)} da fila em aberto`,
    marker: 'success',
    span: 'md:col-span-2 xl:col-span-1',
  },
  {
    id: 'sem-evidencia',
    label: 'Sem evidência',
    value: inteiro(RESUMO.semEvidencia),
    note: `${pct(RESUMO.semEvidencia, RESUMO.emAberto)} da fila em aberto`,
    marker: 'error',
    span: 'md:col-span-3 xl:col-span-1',
  },
  {
    id: 'enviados',
    label: 'Enviados no mês',
    value: inteiro(RESUMO.enviadosMes),
    note: 'Defesas enviadas no mês corrente',
    span: 'md:col-span-3 xl:col-span-1',
  },
];

/**
 * Faixa de indicadores. A grade tem fundo preto e 2px de vão entre células
 * brancas: as réguas pretas saem do vão, em qualquer número de colunas.
 */
export function KpiStrip() {
  return (
    <section id="visao-geral" aria-labelledby="o4-kpi-titulo" className="scroll-mt-28">
      <h2 id="o4-kpi-titulo" className="sr-only">
        Indicadores da conta
      </h2>
      <dl className="grid grid-cols-2 gap-[2px] border-2 border-(--o4-ink) bg-(--o4-ink) md:grid-cols-6 xl:grid-cols-5">
        {KPIS.map((k) => (
          <div
            key={k.id}
            className={cn(
              'flex min-h-[132px] flex-col justify-between gap-4 p-4 sm:p-5',
              k.inverse ? 'bg-(--o4-ink) text-(--o4-paper)' : 'bg-(--o4-paper)',
              k.span,
            )}
          >
            <dt className={cn(eyebrow, 'flex items-center gap-2', k.inverse && 'text-(--o4-yellow)')}>
              {k.marker ? <span aria-hidden="true" className={cn('size-2.5', MARKER[k.marker])} /> : null}
              {k.label}
            </dt>
            <dd className="flex flex-col gap-1.5">
              <span
                className={cn(
                  display,
                  'text-[44px] font-bold leading-[0.9] tabular-nums sm:text-[52px]',
                  k.inverse ? 'text-(--o4-yellow)' : 'text-(--o4-ink)',
                )}
              >
                {k.value}
              </span>
              <span
                className={cn(
                  mono,
                  'text-[11px] leading-snug',
                  k.inverse ? 'text-(--o4-paper)/75' : 'text-(--o4-ink-3)',
                )}
              >
                {k.note}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
