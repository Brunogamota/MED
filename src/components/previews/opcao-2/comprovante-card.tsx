'use client';

/**
 * Comprovante de envio (21st.dev #9038 "Order Confirmation Card" + #7710
 * "Order History"), adaptado:
 * - nada de "pedido enviado com sucesso", ícone de cartão ou código de barras;
 * - todo valor exibido sai de COMPROVANTE; os rótulos só nomeiam o campo;
 * - cartão branco, pronto para impressão.
 */

import * as React from 'react';
import { motion, type Variants } from 'motion/react';
import { Mail, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { COMPROVANTE } from '@/components/previews/fixtures';
import { TrackingTimeline, toIsoDateTime } from './tracking-timeline';

const card: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.08 },
  },
};

const block: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

function Field({
  label,
  children,
  mono = false,
  className,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1 border-b border-[var(--o2-line)] py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6', className)}>
      <dt className="shrink-0 text-[13px] text-[var(--o2-ink-3)]">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-[14px] font-semibold text-foreground sm:text-right',
          mono && 'font-mono text-[13px] font-medium break-all',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

export function PrintButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      className="h-10 rounded-full border-[var(--o2-line-strong)] bg-card px-4 text-[13.5px] font-semibold text-[var(--o2-ink-2)] hover:bg-[var(--o2-brand-wash)] hover:text-foreground"
    >
      <Printer className="size-4" aria-hidden="true" />
      Imprimir
    </Button>
  );
}

export function ComprovanteCard() {
  const c = COMPROVANTE;
  const enviadoIso = toIsoDateTime(c.enviadoEm);
  const etapas = c.etapas.map((etapa, index) => ({ id: index, title: etapa.titulo, date: etapa.data, status: etapa.status }));

  return (
    <motion.article
      variants={card}
      initial="hidden"
      animate="visible"
      aria-labelledby="o2-comp-title"
      className="overflow-hidden rounded-[28px] border border-[var(--o2-line)] bg-white text-foreground shadow-[var(--o2-shadow-hover)] print:rounded-none print:border-0 print:shadow-none"
    >
      {/* Cabeçalho: remetente e natureza da peça. */}
      <motion.header
        variants={block}
        className="flex flex-col items-center gap-4 border-b border-[var(--o2-line)] bg-gradient-to-b from-[var(--o2-brand-wash)] to-white px-6 pt-8 pb-7 text-center sm:px-10 print:bg-none"
      >
        <span className="flex size-14 items-center justify-center rounded-[18px] bg-[var(--o2-brand-soft)] text-[var(--o2-brand-strong)] ring-1 ring-[color-mix(in_oklab,var(--o2-brand)_20%,transparent)]">
          <Mail className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-[var(--o2-brand-strong)]">{c.remetente}</p>
          <h1 id="o2-comp-title" className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[26px]">
            Comprovante de envio
          </h1>
          <p className="mt-1 text-[14px] text-[var(--o2-ink-2)]">{c.tipo}</p>
        </div>
      </motion.header>

      <div className="space-y-8 px-6 py-7 sm:px-10 sm:py-8">
        {/* Dados do envio. */}
        <motion.section variants={block} aria-labelledby="o2-comp-dados">
          <h2 id="o2-comp-dados" className="text-[12px] font-semibold tracking-[0.08em] text-[var(--o2-ink-3)] uppercase">
            Dados do envio
          </h2>
          <dl className="mt-2">
            <Field label="Remetente">{c.remetente}</Field>
            <Field label="Destinatário">
              <span className="block">{c.destinatarioNome}</span>
              <span className="block text-[13px] font-medium text-[var(--o2-ink-2)]">{c.destinatarioEmail}</span>
            </Field>
            <Field label="Canal">{c.canal}</Field>
            <Field label="Tipo">{c.tipo}</Field>
            <Field label="Enviado em">
              {enviadoIso ? <time dateTime={enviadoIso}>{c.enviadoEm}</time> : c.enviadoEm}
            </Field>
            <Field label="End-to-end" mono>
              {c.e2e}
            </Field>
            <Field label="ID da mensagem" mono className="border-b-0">
              {c.idMensagem}
            </Field>
          </dl>
        </motion.section>

        {/* A mensagem como o cliente recebeu. */}
        <motion.section variants={block} aria-labelledby="o2-comp-msg">
          <h2 id="o2-comp-msg" className="text-[12px] font-semibold tracking-[0.08em] text-[var(--o2-ink-3)] uppercase">
            Mensagem
          </h2>
          <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--o2-line)] print:break-inside-avoid">
            <div className="border-b border-[var(--o2-line)] bg-[var(--o2-bg-2)] px-5 py-3.5">
              <p className="text-[12px] text-[var(--o2-ink-3)]">Assunto</p>
              <p className="mt-0.5 text-[15px] font-semibold text-foreground">{c.assunto}</p>
            </div>
            <div className="px-5 py-6 sm:px-7">
              <p className="text-[15px] font-semibold text-foreground">{c.saudacao}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--o2-ink-2)]">{c.corpo}</p>
              <a
                href={c.linkPedido}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--o2-brand-strong)] px-6 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.8)] outline-none transition-colors hover:bg-[var(--o2-brand-deep)] focus-visible:ring-3 focus-visible:ring-[var(--o2-brand)]/40 print:shadow-none"
              >
                {c.botao}
              </a>
              <p className="mt-3 font-mono text-[12px] break-all text-[var(--o2-ink-3)]">{c.linkPedido}</p>
            </div>
          </div>
        </motion.section>

        {/* Etapas do pedido. */}
        <motion.section variants={block} aria-labelledby="o2-comp-etapas" className="print:break-inside-avoid">
          <h2 id="o2-comp-etapas" className="text-[12px] font-semibold tracking-[0.08em] text-[var(--o2-ink-3)] uppercase">
            Etapas do pedido
          </h2>
          <TrackingTimeline items={etapas} className="mt-5" />
        </motion.section>
      </div>

      <motion.footer variants={block} className="border-t border-[var(--o2-line)] bg-[var(--o2-bg-2)] px-6 py-4 sm:px-10 print:bg-white">
        <p className="text-[12.5px] text-[var(--o2-ink-3)]">{c.declaracao}</p>
      </motion.footer>
    </motion.article>
  );
}
