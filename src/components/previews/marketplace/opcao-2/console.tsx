'use client';

import { useState, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { Kpis } from './kpis';
import { Composicao, IntakeChart } from './intake-chart';
import { Queue } from './queue';
import { eyebrow, serif } from './tokens';

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const semInscricao = () => () => {};

/** Data de hoje no navegador; no servidor fica vazia (a prévia é estática). */
function useHoje(): string | null {
  return useSyncExternalStore(
    semInscricao,
    () => {
      const s = formatoData.format(new Date());
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    () => null,
  );
}

export function Console() {
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const hoje = useHoje();

  return (
    <main className="min-w-0 flex-1 px-4 pt-7 pb-20 sm:px-8 lg:px-12 lg:pt-11">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
        className="flex flex-col gap-6 pb-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className={cn(eyebrow, 'text-(--ed-brand-hover)')}>Operação</p>
          <h1
            className={cn(
              serif,
              'mt-2 text-[44px] leading-[0.95] font-normal tracking-[-0.03em] sm:text-[60px]',
            )}
          >
            Contestações
          </h1>
          <p className="mt-3 text-[14.5px] text-(--ed-ink-2)">
            <span className={cn(serif, 'text-(--ed-ink) italic')}>{hoje ?? ' '}</span>
            {hoje && <span aria-hidden className="mx-2 text-(--ed-ink-3)">·</span>}
            {RESUMO.emAberto} em aberto, {RESUMO.vencendo24h} vencendo nas próximas 24 horas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="#"
            className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-(--ed-rule-strong) bg-(--ed-surface) px-4 text-[14px] font-medium text-(--ed-ink) transition-colors hover:bg-(--ed-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
          >
            <Upload className="size-4 text-(--ed-ink-2)" aria-hidden />
            Importar MEDs
          </a>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-(--ed-brand) px-4.5 text-[14px] font-medium text-(--ed-surface) transition-colors hover:bg-(--ed-brand-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
          >
            <FileText className="size-4" aria-hidden />
            Gerar defesas
            {selecionados.size > 0 && (
              <span className="rounded-full bg-(--ed-surface)/20 px-1.5 text-[12px] tabular-nums">
                {selecionados.size}
                <span className="sr-only"> selecionadas</span>
              </span>
            )}
          </button>
        </div>
      </motion.header>

      <Kpis />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <IntakeChart className="lg:col-span-8" />
        <Composicao className="lg:col-span-4" />
      </div>

      <div className="mt-8">
        <Queue selecionados={selecionados} onSelecionadosChange={setSelecionados} />
      </div>
    </main>
  );
}
