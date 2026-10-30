import type { ReactNode } from 'react';
import { COMMUNICATION_TEMPLATE_LABEL, type ClientEmailView } from '@/domain/communication/receipt';
import { initials } from './parts';

/**
 * Comprovante de envio no ambiente Marketplace Verificado ("Selo Azul").
 *
 * Documento branco com o fio azul no topo: cabeçalho com o remetente, a ficha
 * do envio em grade de duas colunas, a mensagem como num cliente de e-mail
 * (avatar, para quem, quando, assunto, texto e botão) e a declaração de origem
 * no rodapé. Físico ou digital, a peça é só o e-mail enviado — as etapas do
 * pedido não entram. Cor literal porque a peça vai impressa e representa
 * documento externo, independente do tema da tela.
 *
 * Só dado real: tudo sai do `view` (a evidência gravada), do end-to-end do
 * caso e do id da mensagem, quando registrado. Nenhum selo de "verificado":
 * o registro não afirma isso. O destino do botão segue no link e não é
 * impresso (a regra do `ActionButton` do `ClientEmailView`).
 *
 * A declaração de origem no rodapé é parte da peça. Nunca remova.
 */

function Campo({ rotulo, children, className = '' }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 bg-white px-5 py-4 ${className}`}>
      <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-[#6b7c93] uppercase">{rotulo}</dt>
      <dd className="min-w-0 text-[14px] leading-snug font-medium text-[#0b1f3a]">{children}</dd>
    </div>
  );
}

function Mensagem({ view }: { view: ClientEmailView }) {
  const action = view.action;
  const sigla = initials(view.from);
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#cfdbf3] bg-white shadow-[0_1px_0_#e7eefb,0_12px_28px_-18px_rgb(29_78_216/0.35)] print:shadow-none">
      {/* Barra do cliente de e-mail */}
      <div className="relative flex items-start gap-3.5 border-b border-[#dce5f6] bg-[linear-gradient(180deg,#f3f7ff_0%,#fafcff_100%)] px-5 py-4 @[620px]:px-6">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(180deg,#0ea5e9,#1d4ed8)]" />
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#0ea5e9)] text-[13px] font-semibold text-white ring-[3px] ring-white"
        >
          {sigla}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#0b1f3a]">{view.from}</p>
          <p className="mt-0.5 text-[12.5px] text-[#425466]">
            <span className="text-[#6b7c93]">Para </span>
            {view.toName ? <>{view.toName} </> : null}
            {view.to ? (
              <span className="break-all text-[#6b7c93]">{view.toName ? `<${view.to}>` : view.to}</span>
            ) : null}
            {!view.toName && !view.to ? <span className="text-[#6b7c93]">destinatário não informado</span> : null}
          </p>
        </div>
        {view.sentAtLabel ? (
          <time className="hidden shrink-0 pt-0.5 font-mono text-[11.5px] text-[#6b7c93] tabular-nums @[520px]:block">
            {view.sentAtLabel}
          </time>
        ) : null}
      </div>

      {/* Corpo da mensagem */}
      <div className="px-6 pt-8 pb-9 @[620px]:px-10">
        {view.sentAtLabel ? (
          <time className="mb-3 block font-mono text-[11.5px] text-[#6b7c93] tabular-nums @[520px]:hidden">
            {view.sentAtLabel}
          </time>
        ) : null}
        <p className="text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] text-[#0b1f3a] @[620px]:text-[34px]">
          {view.subject || 'Sem assunto'}
        </p>
        <div className="mt-6 max-w-[60ch] space-y-3 text-[15px] leading-relaxed text-[#425466] [&>p:first-child]:font-medium [&>p:first-child]:text-[#0b1f3a]">
          {view.paragraphs.length > 0 ? (
            view.paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-[#6b7c93]">Sem conteúdo.</p>
          )}
        </div>

        {action?.kind === 'NOTE' ? (
          <div className="mt-7 inline-flex max-w-full flex-col rounded-[10px] border border-[#dce5f6] bg-[#f3f7ff] px-4 py-3">
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-[#6b7c93] uppercase">{action.valueLabel}</span>
            <span className="mt-1 font-mono text-[14px] break-all text-[#0b1f3a]">{action.value}</span>
          </div>
        ) : action ? (
          action.href ? (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1d4ed8] px-6 text-[14px] font-semibold text-white no-underline shadow-[0_1px_2px_rgb(11_31_58/0.15)]"
            >
              {action.label}
            </a>
          ) : (
            <span className="mt-7 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1d4ed8] px-6 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(11_31_58/0.15)]">
              {action.label}
            </span>
          )
        ) : null}
      </div>
    </div>
  );
}

export function MarketplaceReceipt({
  view,
  sourceReference,
  endToEndId,
}: {
  view: ClientEmailView;
  sourceReference?: string | null;
  endToEndId?: string | null;
}) {
  const tipo = COMMUNICATION_TEMPLATE_LABEL[view.template];

  return (
    <article
      aria-label="Comprovante de envio"
      className="@container overflow-hidden rounded-[6px] border border-t-0 border-[#e3e8ef] bg-white font-sans text-[#0b1f3a] shadow-[0_1px_2px_rgb(11_31_58/0.05),0_24px_48px_-24px_rgb(11_31_58/0.22)] [print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none"
    >
      {/* Fio azul do topo */}
      <div aria-hidden="true" className="h-[5px] bg-[#1d4ed8]" />

      <header className="flex flex-wrap items-start justify-between gap-4 px-6 pt-8 pb-6 @[620px]:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0b1f3a] text-[13px] font-semibold tracking-wide text-white"
          >
            {initials(view.from)}
          </span>
          <span className="truncate text-[16px] font-semibold tracking-[-0.01em]">{view.from}</span>
        </div>
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] @[620px]:pt-1.5 @[620px]:text-right">
          Comprovante de envio
        </h2>
      </header>

      {/* Ficha do envio */}
      <div className="px-6 @[620px]:px-10">
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-[#e3e8ef] bg-[#e3e8ef] @[560px]:grid-cols-2">
          <Campo rotulo="Remetente">{view.from}</Campo>
          <Campo rotulo="Destinatário">
            {view.toName ? <span className="block">{view.toName}</span> : null}
            {view.to ? (
              <span className={view.toName ? 'block font-normal break-all text-[#425466]' : 'block break-all'}>{view.to}</span>
            ) : null}
            {!view.toName && !view.to ? <span className="font-normal text-[#6b7c93]">não informado</span> : null}
          </Campo>
          <Campo rotulo="Canal">E-mail</Campo>
          <Campo rotulo="Tipo">{tipo}</Campo>
          <Campo rotulo="Enviado em">
            {view.sentAtLabel ? (
              <span className="font-mono text-[13.5px] tabular-nums">{view.sentAtLabel}</span>
            ) : (
              <span className="font-normal text-[#6b7c93]">não informado</span>
            )}
          </Campo>
          {sourceReference ? (
            <Campo rotulo="ID da mensagem">
              <span className="font-mono text-[13.5px] break-all">{sourceReference}</span>
            </Campo>
          ) : null}
          {/* Sempre presente: "não informado" é honesto; o campo sumir não. */}
          <Campo rotulo="End-to-end" className={sourceReference ? '@[560px]:col-span-2' : ''}>
            {endToEndId ? (
              <span className="font-mono text-[13.5px] break-all">{endToEndId}</span>
            ) : (
              <span className="font-normal text-[#6b7c93]">não informado</span>
            )}
          </Campo>
        </dl>
      </div>

      <section aria-label="Mensagem enviada" className="px-6 pt-9 pb-10 @[620px]:px-10">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-[#6b7c93] uppercase">
            Mensagem enviada
          </h3>
          <span aria-hidden="true" className="h-px flex-1 bg-[#e3e8ef]" />
        </div>
        <Mensagem view={view} />
      </section>

      {/* Declaração de origem — inseparável da peça. Nunca remova. */}
      <footer className="border-t border-[#e3e8ef] bg-[#f8fafc] px-6 py-4 @[620px]:px-10">
        <p className="text-[12px] text-[#6b7c93]">{view.stamp}</p>
      </footer>
    </article>
  );
}
