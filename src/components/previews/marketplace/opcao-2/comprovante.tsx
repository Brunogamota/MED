'use client';

import Link from 'next/link';
import { motion, type Variants } from 'motion/react';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPROVANTE } from '@/components/previews/marketplace/fixtures';
import { BASE_HREF, eyebrow, serif } from './tokens';

/*
 * Comprovante de envio, a partir do "Order Confirmation Card" (21st.dev
 * #9038): a mesma lista de campos com fio entre as linhas e a entrada em
 * cascata — mas como documento em papel, não cartão de sucesso. Sem ícone de
 * confirmação, sem selo: a peça só mostra o que está no registro de envio.
 */

const documento: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.2, 0, 0, 1], staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const bloco: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0, 0, 1] } },
};

export function Comprovante() {
  const c = COMPROVANTE;

  const campos: { termo: string; valor: React.ReactNode; mono?: boolean }[] = [
    { termo: 'Remetente', valor: c.remetente },
    {
      termo: 'Destinatário',
      valor: (
        <>
          <span className="block">{c.destinatarioNome}</span>
          <span className="block text-(--ed-ink-2)">{c.destinatarioEmail}</span>
        </>
      ),
    },
    { termo: 'Canal', valor: c.canal },
    { termo: 'Tipo', valor: c.tipo },
    { termo: 'Enviado em', valor: <span className="tabular-nums">{c.enviadoEm}</span> },
    { termo: 'End-to-end', valor: c.e2e, mono: true },
    { termo: 'ID da mensagem', valor: c.idMensagem, mono: true },
  ];

  return (
    <div className="min-h-screen bg-(--ed-desk) px-4 py-8 sm:py-12 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[760px] items-center justify-between print:hidden">
        <Link
          href={BASE_HREF}
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[14px] text-(--ed-ink-2) transition-colors hover:text-(--ed-ink) focus-visible:outline-2 focus-visible:outline-(--ed-brand)"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar às contestações
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-(--ed-rule-strong) bg-(--ed-surface) px-3.5 text-[14px] font-medium text-(--ed-ink) transition-colors hover:bg-(--ed-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
        >
          <Printer className="size-4 text-(--ed-ink-2)" aria-hidden />
          Imprimir
        </button>
      </div>

      <motion.article
        variants={documento}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-[760px] rounded-[6px] border border-(--ed-rule) bg-(--ed-surface) px-6 py-10 [print-color-adjust:exact] shadow-[0_1px_0_rgba(26,23,20,0.04),0_28px_56px_-36px_rgba(26,23,20,0.35)] sm:px-14 sm:py-14 print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      >
        <motion.header variants={bloco} className="border-b-[3px] border-double border-(--ed-rule-strong) pb-6">
          <h1 className={cn(serif, 'text-[38px] leading-[1.02] font-normal tracking-[-0.025em] sm:text-[48px]')}>
            Comprovante de envio
          </h1>
        </motion.header>

        <motion.dl variants={bloco} className="mt-2">
          {campos.map((campo) => (
            <div
              key={campo.termo}
              className="grid gap-1 border-b border-(--ed-rule) py-3.5 sm:grid-cols-[180px_1fr] sm:gap-6"
            >
              <dt className={cn(eyebrow, 'pt-0.5')}>{campo.termo}</dt>
              <dd
                className={cn(
                  'min-w-0 text-[15px] text-(--ed-ink)',
                  campo.mono && 'font-mono text-[13.5px] break-all',
                )}
              >
                {campo.valor}
              </dd>
            </div>
          ))}
        </motion.dl>

        <motion.div variants={bloco} className="mt-12 flex items-center gap-4">
          <span className={eyebrow}>Mensagem enviada</span>
          <span aria-hidden className="h-px flex-1 bg-(--ed-rule)" />
        </motion.div>

        {/* A carta: papel de correspondência com a faixa de via aérea no topo */}
        <motion.section
          variants={bloco}
          aria-label="Mensagem enviada"
          className="relative mt-5 overflow-hidden rounded-[6px] border border-(--ed-rule) bg-(--ed-letter)"
        >
          <div
            aria-hidden
            className="h-[7px] bg-[repeating-linear-gradient(135deg,var(--ed-brand)_0_14px,var(--ed-letter)_14px_21px,var(--ed-amber)_21px_35px,var(--ed-letter)_35px_42px)]"
          />
          <div
            aria-hidden
            className="absolute top-[7px] bottom-0 left-6 w-px bg-(--ed-brand)/20 sm:left-10"
          />
          <div className="py-10 pr-6 pl-11 sm:py-14 sm:pr-14 sm:pl-[4.5rem]">
            <p className={cn(eyebrow, 'text-(--ed-ink-3)')}>Assunto</p>
            <h2
              className={cn(
                serif,
                'mt-2 text-[32px] leading-[1.05] font-normal tracking-[-0.02em] text-(--ed-ink) sm:text-[42px]',
              )}
            >
              {c.assunto}
            </h2>
            <div aria-hidden className="my-8 h-[2px] w-12 bg-(--ed-brand)" />
            <p className={cn(serif, 'text-[21px] leading-snug text-(--ed-ink) italic')}>{c.saudacao}</p>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.75] text-(--ed-ink-2)">{c.corpo}</p>
            <a
              href={c.linkPedido}
              className="mt-9 inline-flex h-12 items-center gap-2.5 rounded-[6px] bg-(--ed-brand) px-6 text-[15px] font-medium text-(--ed-surface) transition-colors hover:bg-(--ed-brand-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
            >
              {c.botao}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </motion.section>

        <motion.footer variants={bloco} className="mt-12 border-t border-(--ed-rule) pt-5">
          <p className={cn(serif, 'text-[14px] text-(--ed-ink-2) italic')}>{c.declaracao}</p>
        </motion.footer>
      </motion.article>
    </div>
  );
}
