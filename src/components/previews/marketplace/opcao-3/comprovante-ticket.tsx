/*
 * Comprovante de envio. Base: 21st.dev #6492 "Ticket Confirmation Card" —
 * bilhete com recortes laterais, linha tracejada e campos em grade. Adaptado:
 * papel claro para impressão, rota remetente → destinatário como num bilhete,
 * a mensagem dentro de uma borda de correio aéreo em coral e areia. Sem código
 * de barras, sem confete, sem bandeira de cartão e sem selo: só o que está no
 * registro de envio.
 *
 * Cor literal é permitida aqui: o comprovante representa peça externa e vai
 * impresso, então não segue o tema da interface.
 */

import { ArrowRight, Send } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPROVANTE } from '@/components/previews/marketplace/fixtures';

const INK = 'text-[#1B1A17]';
const INK_2 = 'text-[#5E5A52]';
const INK_3 = 'text-[#8C877C]';

function Label({ children }: { children: React.ReactNode }) {
  return <dt className={cn('text-[10.5px] font-medium tracking-[0.14em] uppercase', INK_3)}>{children}</dt>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label>{label}</Label>
      <dd className={cn('mt-1.5 text-[14px] font-medium', INK)}>{children}</dd>
    </div>
  );
}

/** Recorte lateral + picote. Os recortes têm a cor do chão da página (e somem no papel). */
function Perforation() {
  return (
    <div aria-hidden className="relative flex h-8 items-center">
      <span className="absolute -left-4 size-8 rounded-full bg-[#0B0D12] shadow-[inset_-1px_0_0_rgba(0,0,0,0.06)] print:bg-white" />
      <span className="mx-6 h-0 flex-1 border-t-2 border-dashed border-[#E4DCCD]" />
      <span className="absolute -right-4 size-8 rounded-full bg-[#0B0D12] shadow-[inset_1px_0_0_rgba(0,0,0,0.06)] print:bg-white" />
    </div>
  );
}

export function ComprovanteTicket() {
  const c = COMPROVANTE;

  return (
    <article
      aria-label="Comprovante de envio"
      className={cn(
        'relative w-full max-w-[660px] rounded-[20px] bg-[#FFFDF8] font-sans [print-color-adjust:exact]',
        'shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)] print:shadow-none',
        'animate-in fade-in-0 zoom-in-95 duration-500 motion-reduce:animate-none',
        INK,
      )}
    >
      {/* Faixa coral fina no topo: a marca da peça, sem logotipo. */}
      <div aria-hidden className="h-1.5 rounded-t-[20px] bg-gradient-to-r from-[#FF6B57] via-[#FF8A6B] to-[#F2C48D]" />

      {/* Parte 1 — dados do envio */}
      <div className="px-6 pt-7 pb-5 sm:px-10 sm:pt-9">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#D4402B] uppercase">Comprovante de envio</p>

        {/* Rota: remetente → destinatário */}
        <dl className="mt-7 grid grid-cols-1 items-start gap-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
          <div className="min-w-0">
            <Label>Remetente</Label>
            <dd className="mt-1.5 text-[19px] leading-snug font-semibold tracking-[-0.015em]">{c.remetente}</dd>
          </div>
          <div aria-hidden className="hidden items-center gap-1.5 pt-6 sm:flex">
            <span className="h-0 w-8 border-t border-dashed border-[#D9CFBD]" />
            <span className="grid size-8 place-items-center rounded-full bg-[#FFEDE8] text-[#D4402B]">
              <Send className="size-3.5" />
            </span>
            <span className="h-0 w-8 border-t border-dashed border-[#D9CFBD]" />
          </div>
          <div className="min-w-0 sm:text-right">
            <Label>Destinatário</Label>
            <dd className="mt-1.5 text-[19px] leading-snug font-semibold tracking-[-0.015em]">{c.destinatarioNome}</dd>
            <dd className={cn('mt-0.5 text-[13.5px] break-all', INK_2)}>{c.destinatarioEmail}</dd>
          </div>
        </dl>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 rounded-[14px] bg-[#F7F2E9] p-5 sm:grid-cols-3">
          <Field label="Canal">{c.canal}</Field>
          <Field label="Tipo">{c.tipo}</Field>
          <Field label="Enviado em" className="col-span-2 sm:col-span-1">
            <span className="font-mono text-[13.5px] tabular-nums">{c.enviadoEm}</span>
          </Field>
          <Field label="End-to-end" className="col-span-2 sm:col-span-3">
            <span className="font-mono text-[13px] font-normal break-all">{c.e2e}</span>
          </Field>
          <Field label="ID da mensagem" className="col-span-2 sm:col-span-3">
            <span className="font-mono text-[13px] font-normal break-all">{c.idMensagem}</span>
          </Field>
        </dl>
      </div>

      <Perforation />

      {/* Parte 2 — a mensagem, dentro da borda de correio aéreo */}
      <div className="px-6 pt-4 pb-8 sm:px-10 sm:pb-10">
        <p className={cn('mb-3 text-[10.5px] font-medium tracking-[0.14em] uppercase', INK_3)}>Mensagem enviada</p>

        <div
          className="rounded-[16px] p-[7px]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #FF6B57 0 12px, #FFFDF8 12px 20px, #F2C48D 20px 32px, #FFFDF8 32px 40px)',
          }}
        >
          <div className="rounded-[10px] bg-white px-6 py-8 sm:px-9 sm:py-10">
            <p className={cn('text-[10.5px] font-medium tracking-[0.14em] uppercase', INK_3)}>Assunto</p>
            <h2 className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[38px]">
              {c.assunto}
            </h2>

            <div aria-hidden className="mt-6 h-px w-12 bg-[#FF6B57]" />

            <p className="mt-6 text-[16px] font-medium">{c.saudacao}</p>
            <p className={cn('mt-3 max-w-[46ch] text-[15px] leading-relaxed', INK_2)}>{c.corpo}</p>

            <a
              href={c.linkPedido}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[#D4402B] px-6 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-12px_#FF6B57] transition-colors hover:bg-[#BF3622] focus-visible:ring-4 focus-visible:ring-[#FF6B57]/30 focus-visible:outline-none"
            >
              {c.botao}
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <footer className="rounded-b-[20px] border-t border-dashed border-[#E4DCCD] px-6 py-4 text-center sm:px-10">
        <p className={cn('text-[12px]', INK_3)}>{c.declaracao}</p>
      </footer>
    </article>
  );
}
