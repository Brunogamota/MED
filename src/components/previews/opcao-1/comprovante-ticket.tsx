'use client';

/**
 * Comprovante de envio — adaptado de 21st.dev #6492 "Ticket Confirmation Card".
 *
 * Do original ficam o formato de bilhete (recortes laterais, linha
 * tracejada, bloco de identificação em grade) e a entrada animada. Saem o
 * código de barras, o confete, a bandeira de cartão e o "Thank you!": aqui
 * só aparece o que está em `COMPROVANTE`. É peça externa e vai impressa,
 * por isso papel claro e cor literal (regra do projeto para comprovantes).
 */

import { motion } from 'motion/react';
import { ArrowUpRight, Check, Mail, ShieldCheck } from 'lucide-react';
import { COMPROVANTE } from '@/components/previews/fixtures';

const C = COMPROVANTE;

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-[10.5px] font-medium tracking-[0.08em] text-[#64748B] uppercase">{label}</dt>
      <dd className="mt-1 text-[13.5px] leading-snug text-[#0F172A]">{children}</dd>
    </div>
  );
}

/** Linha tracejada com os dois recortes do bilhete. A cor do recorte é a do fundo da página. */
function Perforation() {
  return (
    <div className="relative my-1" aria-hidden="true">
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-[#020617] print:bg-white" />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-[#020617] print:bg-white" />
      <div className="mx-6 border-t-2 border-dashed border-[#E4DAF6]" />
    </div>
  );
}

export function ComprovanteTicket() {
  return (
    <motion.article
      aria-labelledby="o1-comp-titulo"
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[600px] rounded-2xl bg-white text-[#0F172A] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.06)] print:max-w-none print:shadow-none"
    >
      <div aria-hidden="true" className="h-1.5 rounded-t-2xl bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#C084FC]" />

      {/* Cabeçalho: remetente e canal */}
      <div className="px-6 pt-6 sm:px-9 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] text-[14px] font-semibold text-white">
              {C.remetente.charAt(0)}
            </span>
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.08em] text-[#64748B] uppercase">Remetente</p>
              <p className="text-[15px] leading-tight font-semibold">{C.remetente}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-medium tracking-[0.08em] text-[#64748B] uppercase">ID da mensagem</p>
            <p className="font-mono text-[13px] text-[#0F172A]">{C.idMensagem}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center pb-7 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 20 }}
            className="flex size-14 items-center justify-center rounded-full bg-[#F3E8FF] ring-8 ring-[#FAF5FF]"
            aria-hidden="true"
          >
            <Mail className="size-6 text-[#9333EA]" strokeWidth={1.8} />
          </motion.div>
          <h1 id="o1-comp-titulo" className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">
            Comprovante de envio
          </h1>
          <p className="mt-1 text-[14px] text-[#475569]">
            {C.canal} · {C.tipo}
          </p>
        </div>
      </div>

      <Perforation />

      {/* Identificação do envio */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-7 sm:px-9">
        <Field label="Destinatário">
          <span className="font-medium">{C.destinatarioNome}</span>
          <span className="block text-[13px] break-all text-[#475569]">{C.destinatarioEmail}</span>
        </Field>
        <Field label="Enviado em">
          <span className="font-mono text-[13px] tabular-nums">{C.enviadoEm}</span>
        </Field>
        <Field label="Canal">{C.canal}</Field>
        <Field label="Tipo">{C.tipo}</Field>
        <Field label="End-to-end" wide>
          <span className="block rounded-md bg-[#F8FAFC] px-2.5 py-1.5 font-mono text-[12.5px] break-all text-[#334155] ring-1 ring-[#E2E8F0]">{C.e2e}</span>
        </Field>
      </dl>

      {/* A mensagem como foi enviada */}
      <section aria-labelledby="o1-comp-msg" className="px-6 sm:px-9">
        <h2 id="o1-comp-msg" className="text-[10.5px] font-medium tracking-[0.08em] text-[#64748B] uppercase">
          Mensagem
        </h2>
        <div className="mt-2 overflow-hidden rounded-xl border border-[#EDE4FB]">
          <div className="flex items-baseline gap-3 border-b border-[#EDE4FB] bg-[#FAF7FF] px-4 py-3">
            <span className="shrink-0 text-[11px] font-medium tracking-[0.06em] text-[#7E22CE] uppercase">Assunto</span>
            <span className="min-w-0 text-[14px] font-medium">{C.assunto}</span>
          </div>
          <div className="px-4 py-5 sm:px-5">
            <p className="text-[15px] font-semibold">{C.saudacao}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#334155]">{C.corpo}</p>
            <a
              href={C.linkPedido}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#9333EA] px-4 text-[14px] font-medium text-white shadow-[0_8px_20px_-8px_rgba(147,51,234,0.7)] outline-none transition-colors hover:bg-[#7E22CE] focus-visible:ring-2 focus-visible:ring-[#A855F7] focus-visible:ring-offset-2 print:shadow-none"
            >
              {C.botao}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <p className="mt-3 font-mono text-[11.5px] break-all text-[#64748B]">{C.linkPedido}</p>
          </div>
        </div>
      </section>

      {/* Etapas do pedido */}
      <section aria-labelledby="o1-comp-etapas" className="px-6 pt-7 pb-7 sm:px-9">
        <h2 id="o1-comp-etapas" className="text-[10.5px] font-medium tracking-[0.08em] text-[#64748B] uppercase">
          Etapas do pedido
        </h2>
        <ol className="mt-3">
          {C.etapas.map((e, i) => {
            const done = e.status === 'completed';
            const last = i === C.etapas.length - 1;
            return (
              <motion.li
                key={e.titulo}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.07, duration: 0.3, ease: 'easeOut' }}
                className="relative flex gap-3.5 pb-4 last:pb-0"
              >
                {!last && <span aria-hidden="true" className={done ? 'absolute top-6 bottom-0 left-[11px] w-px bg-[#D8B4FE]' : 'absolute top-6 bottom-0 left-[11px] w-px bg-[#E2E8F0]'} />}
                {done ? (
                  <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#9333EA] text-white">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#C084FC] bg-white">
                    <span className="size-2 animate-pulse rounded-full bg-[#A855F7] print:animate-none" />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pt-0.5">
                  <p className={done ? 'text-[13.5px] font-medium text-[#0F172A]' : 'text-[13.5px] font-medium text-[#7E22CE]'}>{e.titulo}</p>
                  <p className={done ? 'font-mono text-[12px] text-[#64748B] tabular-nums' : 'text-[12px] text-[#7E22CE]'}>{e.data}</p>
                </div>
                <span className="sr-only">{done ? 'Concluída' : 'Em andamento'}</span>
              </motion.li>
            );
          })}
        </ol>
      </section>

      <Perforation />

      <footer className="flex items-center justify-center gap-2 px-6 pt-5 pb-6 text-center sm:px-9">
        <ShieldCheck className="size-4 shrink-0 text-[#9333EA]" aria-hidden="true" />
        <p className="text-[12px] text-[#64748B]">{C.declaracao}</p>
      </footer>
    </motion.article>
  );
}
