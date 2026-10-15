'use client';

import Link from 'next/link';
import { useState, type ComponentType } from 'react';
import { motion, type Variants } from 'motion/react';
import { ArrowUpRight, Bell, Eye, EyeOff, FileCheck, FileUp, ReceiptText, Truck } from 'lucide-react';
import { MEDS, RESUMO, brl, prazo } from '@/components/previews/fixtures';
import { Op3MobileNav } from '@/components/previews/opcao-3/sidebar';

/*
 * Faixa de topo no jeito de home de banco: o "saldo" é o valor em contestação,
 * e as ações rápidas redondas vêm do 21st.dev 8253 "Financial Dashboard".
 */

const container: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06, duration: 0.35 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface QuickAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Importar MEDs', icon: FileUp },
  { label: 'Importar envios', icon: Truck },
  { label: 'Gerar defesas', icon: FileCheck },
  { label: 'Comprovantes', icon: ReceiptText, href: '/preview/bulls/opcao-3/comprovante' },
];

function QuickActionButton({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const inner = (
    <>
      <span className="op3-hero-glass grid size-14 place-items-center rounded-full transition-colors group-hover:bg-white group-hover:text-primary">
        <Icon className="size-[22px]" />
      </span>
      <span className="text-center text-[13px] leading-tight font-medium text-white/90">{action.label}</span>
    </>
  );
  const className =
    'group flex w-[76px] flex-col items-center gap-2 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-white/60 sm:w-[88px]';
  return (
    <motion.li variants={item} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
      {action.href ? (
        <Link href={action.href} className={className}>
          {inner}
        </Link>
      ) : (
        <button type="button" className={className}>
          {inner}
        </button>
      )}
    </motion.li>
  );
}

export function Op3Hero({ fontClass }: { fontClass: string }) {
  const [oculto, setOculto] = useState(false);
  const valor = brl(RESUMO.valorEmAberto).replace(/^R\$\s*/, '');
  const urgentes = MEDS.filter((m) => m.prazoHoras < 24 && m.status !== 'ENVIADO').sort(
    (a, b) => a.prazoHoras - b.prazoHoras,
  );

  return (
    <section aria-labelledby="op3-titulo" className="op3-hero relative overflow-hidden text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full border border-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-24 size-[260px] rounded-full border border-white/10"
      />

      <div className="relative mx-auto max-w-[1240px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-7 lg:pb-32">
        <div className="flex items-center gap-3">
          <Op3MobileNav active="visao-geral" fontClass={fontClass} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/70">Bulls Cash</p>
            <h1 id="op3-titulo" className="text-lg leading-tight font-semibold">
              Visão geral
            </h1>
          </div>
          <button
            type="button"
            aria-label="Notificações"
            className="op3-hero-glass grid size-10 place-items-center rounded-full text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/50"
          >
            <Bell className="size-[18px]" />
          </button>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"
        >
          <div className="min-w-0">
            <motion.div variants={item} className="flex items-center gap-2">
              <p className="text-sm font-medium text-white/75">Valor em contestação</p>
              <button
                type="button"
                onClick={() => setOculto((v) => !v)}
                aria-pressed={oculto}
                aria-label={oculto ? 'Mostrar valor' : 'Ocultar valor'}
                className="grid size-7 place-items-center rounded-full text-white/75 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {oculto ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </motion.div>

            <motion.p variants={item} className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="flex items-baseline font-semibold tracking-[-0.03em] tabular-nums">
                <span className="mr-1.5 text-2xl text-white/80 sm:text-3xl">R$</span>
                <span className="text-[44px] leading-none sm:text-6xl">{oculto ? '••••••' : valor}</span>
              </span>
              <span className="text-lg font-medium text-white/75 sm:text-xl">em contestação</span>
            </motion.p>

            <motion.p variants={item} className="mt-3 text-sm text-white/80">
              <span className="font-semibold text-white tabular-nums">{RESUMO.emAberto}</span> MEDs em aberto
              <span aria-hidden className="mx-2 text-white/40">
                ·
              </span>
              <span className="font-semibold text-white tabular-nums">{RESUMO.vencendo24h}</span> vencem em 24h
            </motion.p>

            <motion.ul
              variants={container}
              aria-label="Ações rápidas"
              className="mt-8 flex flex-wrap gap-x-3 gap-y-4 sm:gap-x-5"
            >
              {QUICK_ACTIONS.map((action) => (
                <QuickActionButton key={action.label} action={action} />
              ))}
            </motion.ul>
          </div>

          <motion.div variants={item} className="op3-hero-glass rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/80">Vencem nas próximas 24h</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{RESUMO.vencendo24h}</p>
              </div>
              <Link
                href="#fila"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-white/60"
              >
                Ver fila
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-white/10" aria-label="Mais urgentes">
              {urgentes.map((med) => (
                <li key={med.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{med.pagador}</p>
                    <p className="text-xs text-white/65">restam {prazo(med.prazoHoras)}</p>
                  </div>
                  <span className="font-semibold tabular-nums">{oculto ? '••••' : brl(med.valor)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
