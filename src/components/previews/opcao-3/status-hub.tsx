'use client';

import type { ComponentType } from 'react';
import { motion, type Variants } from 'motion/react';
import { AlarmClock, ChevronRight, CircleCheck, FileSearch, Send } from 'lucide-react';
import { RESUMO } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';

/*
 * O "Financial services" do 21st.dev 8253 virou o hub de status: cada balde da
 * fila é um atalho com ícone, número e o que ele significa.
 */

interface Bucket {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}

const BUCKETS: Bucket[] = [
  {
    label: 'Prontos',
    value: RESUMO.prontos,
    hint: 'Defesa montada, aguardando envio',
    icon: CircleCheck,
    tone: 'bg-(--op3-success)/12 text-(--op3-success-ink)',
  },
  {
    label: 'Sem evidência',
    value: RESUMO.semEvidencia,
    hint: 'Falta registro de envio ou entrega',
    icon: FileSearch,
    tone: 'bg-(--op3-error)/10 text-(--op3-error-ink)',
  },
  {
    label: 'Vencendo',
    value: RESUMO.vencendo24h,
    hint: 'Prazo de resposta em menos de 24h',
    icon: AlarmClock,
    tone: 'bg-(--op3-warning)/14 text-(--op3-warning-ink)',
  },
  {
    label: 'Enviados no mês',
    value: RESUMO.enviadosMes,
    hint: 'Defesas entregues neste mês',
    icon: Send,
    tone: 'bg-(--op3-violet)/10 text-(--op3-violet)',
  },
];

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function Op3StatusHub() {
  return (
    <section aria-labelledby="op3-status">
      <h2 id="op3-status" className="sr-only">
        Situação da fila
      </h2>
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={list}
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        {BUCKETS.map((bucket) => {
          const Icon = bucket.icon;
          return (
            <motion.li key={bucket.label} variants={card}>
              <a
                href="#fila"
                className="op3-elev group flex h-full flex-col rounded-2xl border border-border bg-card p-4 outline-none transition-[transform,border-color] hover:-translate-y-0.5 hover:border-(--op3-lilac)/60 focus-visible:ring-3 focus-visible:ring-ring/40 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className={cn('grid size-10 place-items-center rounded-full', bucket.tone)}>
                    <Icon className="size-5" />
                  </span>
                  <ChevronRight className="size-4 text-(--op3-ink-3) transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-(--op3-ink-2)">{bucket.label}</p>
                <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {bucket.value.toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 hidden text-xs leading-snug text-(--op3-ink-3) sm:block">{bucket.hint}</p>
              </a>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
