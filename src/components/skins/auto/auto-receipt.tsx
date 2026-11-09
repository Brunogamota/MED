import type { CSSProperties, ReactNode } from 'react';
import { COMMUNICATION_TEMPLATE_LABEL, type ClientEmailView } from '@/domain/communication/receipt';

/**
 * Comprovante do modelo automático — empresa criada pela conta Master, sem
 * ambiente desenhado.
 *
 * A peça é a mesma para todas, e cada uma sai com o próprio nome e a própria
 * cor (escolhida para não repetir a de outra empresa): faixa da marca no topo,
 * ficha do envio, a mensagem enviada e a declaração de origem no rodapé. Só a
 * mensagem — sem etapas do pedido, como nos outros ambientes.
 *
 * Cor literal porque a peça vai impressa e representa documento externo. A
 * cor da marca entra por variável de estilo, validada como `#rrggbb`.
 *
 * Só dado real: tudo sai do `view` (a evidência gravada), do end-to-end do
 * caso e do id da mensagem, quando registrado. O destino do botão segue no
 * link e não é impresso. A declaração de origem é parte da peça. Nunca remova.
 */

const FALLBACK = '#334155';

function brand(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK;
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[#e7e5e4] py-3 last:border-b-0 @[560px]:grid-cols-[150px_minmax(0,1fr)] @[560px]:gap-4">
      <dt className="text-[11px] font-semibold tracking-[0.08em] text-[#78716c] uppercase @[560px]:pt-0.5">{rotulo}</dt>
      <dd className="min-w-0 text-[14px] text-[#1c1917]">{children}</dd>
    </div>
  );
}

export function AutoReceipt({
  view,
  brandColor,
  sourceReference,
  endToEndId,
}: {
  view: ClientEmailView;
  brandColor?: string | null;
  sourceReference?: string | null;
  endToEndId?: string | null;
}) {
  const tipo = COMMUNICATION_TEMPLATE_LABEL[view.template];
  const style = { '--marca': brand(brandColor) } as CSSProperties;
  const action = view.action;

  return (
    <article
      aria-label="Comprovante de envio"
      style={style}
      className="@container overflow-hidden rounded-[10px] border border-[#e7e5e4] bg-white font-sans text-[#1c1917] shadow-[0_18px_40px_-28px_rgb(28_25_23/0.35)] [print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none"
    >
      {/* Faixa da marca */}
      <header className="flex flex-wrap items-end justify-between gap-3 bg-(--marca) px-6 pt-7 pb-6 text-white @[620px]:px-10">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-[0.12em] text-white/80 uppercase">Comprovante de envio</p>
          <p className="mt-1 truncate text-[26px] leading-tight font-semibold tracking-[-0.02em]">{view.from}</p>
        </div>
        <p className="text-[13px] text-white/85">{tipo}</p>
      </header>

      {/* Ficha do envio */}
      <dl className="px-6 py-3 @[620px]:px-10">
        <Campo rotulo="Remetente">{view.from}</Campo>
        <Campo rotulo="Destinatário">
          {view.toName ? <span className="block font-medium">{view.toName}</span> : null}
          {view.to ? <span className="block break-all text-[#57534e]">{view.to}</span> : null}
          {!view.toName && !view.to ? <span className="text-[#78716c]">não informado</span> : null}
        </Campo>
        <Campo rotulo="Canal">E-mail</Campo>
        <Campo rotulo="Enviado em">
          {view.sentAtLabel ? (
            <span className="tabular-nums">{view.sentAtLabel}</span>
          ) : (
            <span className="text-[#78716c]">não informado</span>
          )}
        </Campo>
        {/* Sempre presente: "não informado" é honesto; o campo sumir não. */}
        <Campo rotulo="End-to-end">
          {endToEndId ? (
            <span className="font-mono text-[13px] break-all">{endToEndId}</span>
          ) : (
            <span className="text-[#78716c]">não informado</span>
          )}
        </Campo>
        {sourceReference ? (
          <Campo rotulo="ID da mensagem">
            <span className="font-mono text-[13px] break-all">{sourceReference}</span>
          </Campo>
        ) : null}
      </dl>

      {/* Mensagem enviada */}
      <section aria-label="Mensagem enviada" className="px-6 pb-9 @[620px]:px-10">
        <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[#78716c] uppercase">Mensagem enviada</h3>
        <div className="rounded-[10px] border border-[#e7e5e4] border-l-[5px] border-l-(--marca) bg-[#fafaf9] px-6 py-7 @[620px]:px-9">
          <p className="text-[27px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#1c1917] @[620px]:text-[32px]">
            {view.subject || 'Sem assunto'}
          </p>
          <div className="mt-5 max-w-[60ch] space-y-3 text-[15px] leading-relaxed text-[#44403c] [&>p:first-child]:font-medium [&>p:first-child]:text-[#1c1917]">
            {view.paragraphs.length > 0 ? (
              view.paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-[#78716c]">Sem conteúdo.</p>
            )}
          </div>
          {action?.kind === 'NOTE' ? (
            <div className="mt-6 inline-flex max-w-full flex-col rounded-[8px] border border-[#e7e5e4] bg-white px-4 py-3">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[#78716c] uppercase">{action.valueLabel}</span>
              <span className="mt-1 font-mono text-[14px] break-all">{action.value}</span>
            </div>
          ) : action ? (
            action.href ? (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex h-11 items-center rounded-[8px] bg-(--marca) px-6 text-[14px] font-semibold text-white no-underline"
              >
                {action.label}
              </a>
            ) : (
              <span className="mt-7 inline-flex h-11 items-center rounded-[8px] bg-(--marca) px-6 text-[14px] font-semibold text-white">
                {action.label}
              </span>
            )
          ) : null}
        </div>
      </section>

      {/* Declaração de origem — inseparável da peça. Nunca remova. */}
      <footer className="border-t border-[#e7e5e4] px-6 py-4 @[620px]:px-10">
        <p className="text-[12px] text-[#78716c]">{view.stamp}</p>
      </footer>
    </article>
  );
}
