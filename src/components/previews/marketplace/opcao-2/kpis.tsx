'use client';

import { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO, brl } from '@/components/previews/marketplace/fixtures';
import { eyebrow, serif } from './tokens';

/*
 * Adaptado do "Stats Widget" (21st.dev #4157): a curva suave em SVG e o traço
 * que se desenha ao entrar. Sem dado aleatório e sem cartão — o número vai em
 * serifa, solto no papel, e os indicadores se separam por fios verticais.
 */

const fmt = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

function caminhoSuave(pontos: number[], largura: number, altura: number): string {
  if (pontos.length < 2) return `M 0 ${altura}`;
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const faixa = max - min || 1;
  const passo = largura / (pontos.length - 1);
  const xy: [number, number][] = pontos.map((p, i) => [
    i * passo,
    altura - ((p - min) / faixa) * (altura * 0.8) - altura * 0.1,
  ]);

  let d = '';
  xy.forEach(([x, y], i) => {
    const anterior = xy[i - 1];
    if (!anterior) {
      d = `M ${x} ${y}`;
      return;
    }
    const [x0, y0] = anterior;
    const mx = (x0 + x) / 2;
    d += ` C ${mx},${y0} ${mx},${y} ${x},${y}`;
  });
  return d;
}

function LinhaDeTendencia({ dados, rotulo }: { dados: number[]; rotulo: string }) {
  const gradienteId = useId().replace(/:/g, '');
  const largura = 200;
  const altura = 36;
  const linha = useMemo(() => caminhoSuave(dados, largura, altura), [dados]);
  const area = `${linha} L ${largura} ${altura} L 0 ${altura} Z`;

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={rotulo}
      className="h-9 w-full overflow-visible"
    >
      <defs>
        <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ed-brand)" stopOpacity={0.16} />
          <stop offset="100%" stopColor="var(--ed-brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradienteId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.path
        d={linha}
        fill="none"
        stroke="var(--ed-brand)"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

interface Indicador {
  id: string;
  rotulo: string;
  valor: number;
  nota: React.ReactNode;
  marcador?: string;
  destaque?: boolean;
}

export function Kpis() {
  const entrada = RESUMO.entradaDiaria;
  const semanaAnterior = entrada.slice(0, 7).reduce((a, b) => a + b, 0);
  const semanaAtual = entrada.slice(7).reduce((a, b) => a + b, 0);
  const variacao = (semanaAtual - semanaAnterior) / semanaAnterior;

  const indicadores: Indicador[] = [
    {
      id: 'aberto',
      rotulo: 'Em aberto',
      valor: RESUMO.emAberto,
      destaque: true,
      nota: (
        <>
          <span className="font-medium text-(--ed-ink)">{brl(RESUMO.valorEmAberto)}</span> em disputa
        </>
      ),
    },
    {
      id: 'vencendo',
      rotulo: 'Vencendo em 24h',
      valor: RESUMO.vencendo24h,
      marcador: 'bg-(--ed-amber)',
      nota: <>prazo de resposta nas próximas 24 horas</>,
    },
    {
      id: 'prontos',
      rotulo: 'Prontos para envio',
      valor: RESUMO.prontos,
      marcador: 'bg-(--ed-brand)',
      nota: <>{pct.format(RESUMO.prontos / RESUMO.emAberto)} do que está em aberto</>,
    },
    {
      id: 'sem-evidencia',
      rotulo: 'Sem evidência',
      valor: RESUMO.semEvidencia,
      marcador: 'bg-(--ed-error)',
      nota: <>{pct.format(RESUMO.semEvidencia / RESUMO.emAberto)} do que está em aberto</>,
    },
    {
      id: 'enviados',
      rotulo: 'Enviados no mês',
      valor: RESUMO.enviadosMes,
      marcador: 'bg-(--ed-olive)',
      nota: <>defesas enviadas neste mês</>,
    },
  ];

  return (
    <section aria-label="Indicadores" className="border-y border-(--ed-rule)">
      <dl className="grid grid-cols-2 xl:grid-cols-5">
        {indicadores.map((kpi, i) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'flex min-w-0 flex-col border-(--ed-rule) py-5 xl:px-6 xl:py-6 xl:first:pl-0',
              // celular: o primeiro ocupa a linha; os demais em pares, com fio entre eles
              kpi.destaque ? 'col-span-2 xl:col-span-1' : 'border-t border-(--ed-rule) xl:border-t-0',
              i % 2 === 0 && !kpi.destaque ? 'border-l pl-4 xl:pl-6' : '',
              i % 2 === 1 ? 'pr-4 xl:pr-6' : '',
              i > 0 ? 'xl:border-l' : '',
            )}
          >
            <dt className={cn(eyebrow, 'flex items-center gap-2')}>
              {kpi.marcador && <span aria-hidden className={cn('size-1.5 rounded-full', kpi.marcador)} />}
              {kpi.rotulo}
            </dt>
            <dd className="mt-3 flex flex-1 flex-col">
              <span
                className={cn(
                  serif,
                  'leading-none font-normal tracking-[-0.02em] lining-nums tabular-nums',
                  kpi.destaque ? 'text-[52px]' : 'text-[40px] sm:text-[44px]',
                )}
              >
                {fmt.format(kpi.valor)}
              </span>
              <span className="mt-2.5 text-[13px] leading-snug text-(--ed-ink-2)">{kpi.nota}</span>
              {kpi.destaque && (
                <span className="mt-4 block">
                  <LinhaDeTendencia
                    dados={entrada}
                    rotulo={`Entrada de MEDs nos últimos 14 dias: ${entrada.join(', ')}`}
                  />
                  <span className="mt-2 flex items-center gap-1 text-[12px] text-(--ed-ink-2)">
                    {variacao >= 0 ? (
                      <ArrowUpRight className="size-3.5 text-(--ed-brand)" aria-hidden />
                    ) : (
                      <ArrowDownRight className="size-3.5 text-(--ed-ink-3)" aria-hidden />
                    )}
                    <span className="font-medium text-(--ed-ink) tabular-nums">
                      {variacao >= 0 ? '+' : '−'}
                      {pct.format(Math.abs(variacao))}
                    </span>
                    na entrada vs. 7 dias anteriores
                  </span>
                </span>
              )}
            </dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}
