'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Clock3, Copy, FileText, Package, Sparkles, Upload, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  COMPROVANTE,
  brl,
  prazo,
  type PreviewMed,
  type PreviewStatus,
} from '@/components/previews/marketplace/fixtures';
import { StatusChip, ScoreBar, display, e2eCurto, eyebrow, focusRing, hardButton, mono, scoreTier } from './ui';

/*
 * Painel de detalhe. Estrutura do "Project Detail View" (21st.dev #8248):
 * faixa de navegação com ações de ícone, título, grade de metadados com
 * rótulo + valor, seções empilhadas. Aqui com régua preta no lugar de
 * cartão macio, e só com o que o MED tem — nada de anexos ou tarefas
 * inventados.
 */

const PROXIMO_PASSO: Record<PreviewStatus, string> = {
  PRONTO: 'A defesa está pronta. Revise o texto e envie antes do fim do prazo.',
  SEM_ENVIO: 'Falta o registro de envio ao comprador. Importe o envio para fortalecer a defesa.',
  DEFESA: 'Defesa gerada. Revise o texto e marque como pronta para envio.',
  COLETANDO: 'Ainda coletando os dados da compra. A defesa fica mais forte quando a coleta terminar.',
  ENVIADO: 'Defesa enviada. Nenhuma ação pendente neste MED.',
};

function Meta({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 bg-(--o4-paper) px-4 py-3.5', className)}>
      <dt className={cn(eyebrow, 'flex items-center gap-1.5')}>
        <span aria-hidden="true" className="text-(--o4-ink-2) [&_svg]:size-3.5">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function MedDetail({ med }: { med: PreviewMed }) {
  const reduce = useReducedMotion();
  const [copiado, setCopiado] = useState(false);
  const tier = scoreTier(med.score);
  const urgente = med.prazoHoras < 24;
  const temComprovante = med.e2e === COMPROVANTE.e2e;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(med.e2e);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <article
      aria-labelledby="o4-detalhe-titulo"
      className="border-2 border-(--o4-ink) bg-(--o4-paper) shadow-[6px_6px_0_var(--o4-ink)]"
    >
      {/* Faixa superior: trilha e ações de ícone. */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-(--o4-ink) bg-(--o4-panel) py-1.5 pl-4 pr-1.5">
        <p className={cn(mono, 'min-w-0 truncate text-[11px] uppercase tracking-[0.1em] text-(--o4-ink-3)')}>
          Contestações <span aria-hidden="true">/</span>{' '}
          <span className="normal-case tracking-normal text-(--o4-ink)">{e2eCurto(med.e2e)}</span>
        </p>
        <button
          type="button"
          onClick={copiar}
          aria-label={copiado ? 'End-to-end copiado' : 'Copiar end-to-end'}
          className={cn(
            'grid size-8 shrink-0 place-items-center border-2 border-transparent hover:border-(--o4-ink) hover:bg-(--o4-paper)',
            focusRing,
          )}
        >
          {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        </button>
        <span role="status" className="sr-only">
          {copiado ? 'End-to-end copiado' : ''}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={med.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {/* Cabeçalho: quem pagou e quanto. */}
          <div className="flex flex-col gap-4 px-5 pb-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex min-w-0 flex-col gap-3">
              <p className={eyebrow}>Pagador</p>
              <h2 id="o4-detalhe-titulo" className={cn(display, 'text-[32px] font-bold leading-[0.95] sm:text-[38px]')}>
                {med.pagador}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={med.status} />
                <span
                  className={cn(
                    'inline-flex h-6 items-center gap-1.5 border-[1.5px] px-2',
                    mono,
                    'text-[10px] font-semibold uppercase tracking-[0.08em]',
                    urgente
                      ? 'border-(--o4-warning) bg-(--o4-warning) text-(--o4-paper)'
                      : 'border-(--o4-ink) text-(--o4-ink)',
                  )}
                >
                  <Clock3 className="size-3" aria-hidden="true" />
                  Vence em {prazo(med.prazoHoras)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className={eyebrow}>Valor contestado</p>
              <p className={cn(display, 'text-[40px] font-bold leading-none tabular-nums sm:text-[46px]')}>
                {brl(med.valor)}
              </p>
            </div>
          </div>

          {/* Metadados com régua preta. */}
          <dl className="grid grid-cols-2 gap-[2px] border-y-2 border-(--o4-ink) bg-(--o4-ink)">
            <Meta label="End-to-end" icon={<FileText />} className="col-span-2">
              <span className={cn(mono, 'block break-all text-[13px] leading-snug')}>{med.e2e}</span>
            </Meta>
            <Meta label="Produto" icon={med.produto === 'Físico' ? <Package /> : <Wifi />}>
              <span className="text-[15px] font-semibold">{med.produto}</span>
            </Meta>
            <Meta label="Prazo restante" icon={<Clock3 />}>
              <span
                className={cn(
                  display,
                  'text-[18px] font-bold tabular-nums',
                  urgente ? 'text-(--o4-warning)' : 'text-(--o4-ink)',
                )}
              >
                {prazo(med.prazoHoras)}
              </span>
            </Meta>
          </dl>

          {/* Score. */}
          <section aria-labelledby="o4-score-titulo" className="flex flex-col gap-3 px-5 py-5 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <h3 id="o4-score-titulo" className={eyebrow}>
                Score de evidência
              </h3>
              <p className="flex items-baseline gap-2">
                <span className={cn(display, 'text-[34px] font-bold leading-none tabular-nums')}>{med.score}</span>
                <span className={cn(mono, 'text-[11px] text-(--o4-ink-3)')}>/100</span>
                <span className={cn(mono, 'ml-1 text-[11px] font-semibold uppercase tracking-[0.1em]', tier.text)}>
                  {tier.label}
                </span>
              </p>
            </div>
            <ScoreBar score={med.score} size="lg" />
            <div className={cn(mono, 'flex justify-between text-[10px] text-(--o4-ink-3)')} aria-hidden="true">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </section>

          {/* Próximo passo, derivado do status. */}
          <section
            aria-labelledby="o4-passo-titulo"
            className="mx-5 mb-5 border-l-[6px] border-(--o4-yellow) bg-(--o4-panel) px-4 py-3 sm:mx-6"
          >
            <h3 id="o4-passo-titulo" className={eyebrow}>
              Próximo passo
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-(--o4-ink)">{PROXIMO_PASSO[med.status]}</p>
          </section>
        </motion.div>
      </AnimatePresence>

      {/* Ações. */}
      <div className="flex flex-col gap-3 border-t-2 border-(--o4-ink) px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        {med.status === 'ENVIADO' ? (
          <Button disabled className={hardButton('brand')}>
            <Check aria-hidden="true" />
            Defesa enviada
          </Button>
        ) : (
          <Button className={hardButton('brand')}>
            <Sparkles aria-hidden="true" />
            {med.status === 'DEFESA' ? 'Gerar nova versão' : 'Gerar defesa'}
          </Button>
        )}

        {temComprovante ? (
          <Button asChild className={hardButton('plain')}>
            <Link href="/preview/marketplace/opcao-4/comprovante">
              Ver comprovante
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        ) : med.status === 'SEM_ENVIO' ? (
          <Button asChild className={hardButton('plain')}>
            <a href="#">
              <Upload aria-hidden="true" />
              Importar envio
            </a>
          </Button>
        ) : (
          <Button disabled className={hardButton('plain')}>
            Ver comprovante
          </Button>
        )}

        {!temComprovante && med.status !== 'SEM_ENVIO' ? (
          <p className={cn(mono, 'text-[11px] text-(--o4-ink-3) sm:ml-auto')}>Comprovante não carregado</p>
        ) : null}
      </div>
    </article>
  );
}
