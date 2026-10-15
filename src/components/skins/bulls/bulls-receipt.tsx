import type { ReactNode } from 'react';
import { ArrowRight, Check, CircleDot, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  COMMUNICATION_TEMPLATE_LABEL,
  type ClientEmailView,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';
import type { TrackingEvent } from '@/domain/types';
import { trackingSteps, type TrackingStep } from '@/lib/trackingSteps';

/**
 * Comprovante de envio no ambiente Bulls Cash.
 *
 * Composição: etapas do pedido à esquerda, ficha do envio à direita, a
 * mensagem enviada abaixo num painel de leitura e a declaração de origem no
 * rodapé. Cor literal porque a peça vai impressa e representa documento
 * externo, independente do tema da tela.
 *
 * Só dado real:
 *  - a ficha vem da evidência gravada (`view`), do end-to-end do caso e do id
 *    da mensagem, quando registrado;
 *  - as etapas vêm dos marcos datados do acompanhamento (`trackingEvents`).
 *    Sem marco, a coluna some e a peça fica numa coluna só — etapa nenhuma é
 *    desenhada por suposição;
 *  - o destino do botão não é impresso (a regra do `ActionButton` do
 *    `ClientEmailView`): o link segue no botão, o papel não carrega a URL.
 *
 * A declaração de origem no rodapé é parte da peça. Nunca remova.
 */

/**
 * Modelos em que a peça fala do pedido em trânsito. Uma confirmação de compra
 * ou uma entrega de acesso foram enviadas antes (ou fora) da logística, e pôr
 * os marcos do transporte ao lado delas sugeriria que o e-mail os mostrava.
 */
const TEMPLATES_WITH_STEPS: CommunicationTemplate[] = ['ORDER_TRACKING', 'DELIVERY_CONFIRMATION'];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  const letters = words.length > 1 ? words.slice(0, 2).map((word) => word[0] ?? '') : [...(words[0] ?? '').slice(0, 2)];
  return letters.join('').toUpperCase();
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 @[520px]:grid-cols-[132px_minmax(0,1fr)] @[520px]:gap-4">
      <dt className="text-[11.5px] font-semibold tracking-[0.06em] text-[#6e6589] uppercase @[520px]:pt-0.5">{rotulo}</dt>
      <dd className="min-w-0 text-[14px] text-[#1c1530]">{children}</dd>
    </div>
  );
}

function StepIcon({ state }: { state: TrackingStep['state'] }) {
  if (state === 'completed') return <Check className="size-4 text-white" strokeWidth={3} aria-hidden="true" />;
  if (state === 'issue') return <TriangleAlert className="size-4 text-[#b45309]" strokeWidth={2.25} aria-hidden="true" />;
  return <CircleDot className="size-4 text-[#7c3aed]" strokeWidth={2.25} aria-hidden="true" />;
}

function Etapas({ steps }: { steps: TrackingStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const ultimo = index === steps.length - 1;
        return (
          <li
            key={step.key}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-4"
          >
            {!ultimo ? (
              <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-0.5 rounded-full bg-[#7c3aed]" />
            ) : null}
            <span
              className={
                step.state === 'completed'
                  ? 'relative z-10 grid size-8 place-items-center rounded-full bg-[#7c3aed] ring-4 ring-white'
                  : step.state === 'issue'
                    ? 'relative z-10 grid size-8 place-items-center rounded-full bg-[#fffbeb] ring-4 ring-white'
                    : 'relative z-10 grid size-8 place-items-center rounded-full bg-[#f3ecfe] shadow-[0_0_0_4px_#ffffff,0_0_0_7px_#e9d5ff]'
              }
            >
              <StepIcon state={step.state} />
            </span>
            <div className={ultimo ? 'min-w-0 pt-1 pb-0' : 'min-w-0 pt-1 pb-7'}>
              <p className="text-[15px] leading-snug font-semibold text-[#1c1530]">{step.title}</p>
              <p
                className={
                  step.state === 'current'
                    ? 'mt-0.5 text-[13.5px] font-medium text-[#7c3aed] tabular-nums'
                    : step.state === 'issue'
                      ? 'mt-0.5 text-[13.5px] font-medium text-[#b45309] tabular-nums'
                      : 'mt-0.5 text-[13.5px] text-[#6e6589] tabular-nums'
                }
              >
                {step.dateLabel}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A mensagem como num painel de leitura de e-mail: quem mandou para quem e
 * quando, o assunto em destaque, o texto com respiro e o botão que o cliente
 * viu. Nada aqui é texto de exemplo: tudo sai do `view`.
 */
function PainelMensagem({ view }: { view: ClientEmailView }) {
  const action = view.action;
  const destinatario = view.toName || view.to || 'Destinatário não informado';
  return (
    <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] p-1.5 shadow-[0_1px_2px_rgb(28_21_48/0.04),0_18px_40px_-28px_rgb(91_33_182/0.35)] ring-1 ring-[#ece4fb]">
      <div className="rounded-[19px] border border-[#f1ebfc] bg-[#fdfcff] px-5 py-6 sm:px-9 sm:py-8">
        <div className="flex items-start gap-3.5 @[520px]:items-center @[520px]:gap-4">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] text-[13px] font-bold tracking-wide text-white shadow-[0_6px_14px_-6px_rgb(124_58_237/0.7)]"
          >
            {initials(view.from)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[14.5px] leading-snug">
              <span className="font-semibold text-[#1c1530]">{view.from}</span>
              <ArrowRight className="size-3.5 shrink-0 text-[#a99bc6]" aria-label="para" />
              <span className="min-w-0 font-medium break-words text-[#4a4163]">{destinatario}</span>
            </p>
            {view.toName && view.to ? <p className="mt-0.5 text-[12.5px] break-all text-[#6e6589]">{view.to}</p> : null}
            {view.sentAtLabel ? (
              <p className="mt-2 inline-flex rounded-full bg-[#f5f0fe] px-3 py-1 text-[12.5px] font-medium text-[#5b4a85] tabular-nums @[520px]:hidden">
                {view.sentAtLabel}
              </p>
            ) : null}
          </div>
          {view.sentAtLabel ? (
            <p className="hidden shrink-0 rounded-full bg-[#f5f0fe] px-3 py-1 text-[12.5px] font-medium text-[#5b4a85] tabular-nums @[520px]:block">
              {view.sentAtLabel}
            </p>
          ) : null}
        </div>

        <div className="my-6 h-px bg-[linear-gradient(90deg,transparent,#e9e0fa_12%,#e9e0fa_88%,transparent)]" />

        <h3 className="text-[23px] leading-[1.25] font-bold tracking-[-0.02em] text-[#1c1530] sm:text-[26px]">
          {view.subject || 'Sem assunto'}
        </h3>

        <div className="mt-4 max-w-[62ch] space-y-4 text-[15px] leading-[1.75] text-[#4a4163]">
          {view.paragraphs.length > 0 ? (
            view.paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-[#6e6589]">Sem conteúdo.</p>
          )}
        </div>

        {action?.kind === 'NOTE' ? (
          <div className="mt-7 inline-flex max-w-full flex-col rounded-2xl bg-[#f5f0fe] px-4 py-3">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-[#6e6589] uppercase">{action.valueLabel}</span>
            <span className="mt-1 font-mono text-[14px] break-all text-[#1c1530]">{action.value}</span>
          </div>
        ) : action ? (
          <div className="mt-8">
            {action.href ? (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_100%)] px-7 text-[14.5px] font-semibold text-white no-underline shadow-[0_10px_24px_-10px_rgb(124_58_237/0.75),inset_0_1px_rgb(255_255_255/0.22)]"
              >
                {action.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            ) : (
              <span className="inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_100%)] px-7 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(124_58_237/0.75),inset_0_1px_rgb(255_255_255/0.22)]">
                {action.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BullsReceipt({
  view,
  sourceReference,
  endToEndId,
  trackingEvents,
}: {
  view: ClientEmailView;
  sourceReference?: string | null;
  endToEndId?: string | null;
  trackingEvents?: readonly TrackingEvent[] | null;
}) {
  const steps = TEMPLATES_WITH_STEPS.includes(view.template) ? trackingSteps(trackingEvents) : [];
  const tipo = COMMUNICATION_TEMPLATE_LABEL[view.template];

  return (
    <article
      aria-label="Comprovante de envio"
      className="@container overflow-hidden rounded-[28px] border border-[#ebe7f3] bg-white font-sans text-[#1c1530] shadow-[0_1px_2px_rgb(28_21_48/0.04),0_12px_32px_-16px_rgb(28_21_48/0.12)] [print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none"
    >
      <div aria-hidden="true" className="h-1.5 bg-[linear-gradient(135deg,#7c3aed_0%,#8b45ef_55%,#a855f7_100%)]" />

      <header className="flex flex-col gap-5 px-6 pt-7 pb-6 @[620px]:flex-row @[620px]:items-center @[620px]:justify-between @[620px]:px-10 @[620px]:pt-9">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[radial-gradient(260px_140px_at_88%_-20%,rgb(255_255_255/0.18),transparent_70%),linear-gradient(135deg,#7c3aed_0%,#8b45ef_55%,#a855f7_100%)] text-[14px] font-bold text-white"
          >
            {initials(view.from)}
          </span>
          <p className="truncate text-[18px] font-semibold tracking-tight">{view.from}</p>
        </div>
        <div className="@[620px]:text-right">
          <h2 className="text-[24px] leading-tight font-semibold tracking-tight">Comprovante de envio</h2>
          <p className="mt-1 text-[14px] text-[#6e6589]">{tipo}</p>
        </div>
      </header>

      <div
        className={
          steps.length > 0
            ? 'grid border-t border-[#ebe7f3] @[720px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
            : 'border-t border-[#ebe7f3]'
        }
      >
        {steps.length > 0 ? (
          <section
            aria-label="Etapas do pedido"
            className="border-b border-[#ebe7f3] bg-[#f9f5fe] px-6 py-7 @[620px]:px-10 @[720px]:border-r @[720px]:border-b-0"
          >
            <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7c3aed] uppercase">Etapas do pedido</h3>
            <p className="mt-1 mb-6 text-[12px] text-[#6e6589]">Marcos registrados no acompanhamento</p>
            <Etapas steps={steps} />
          </section>
        ) : null}

        <section aria-label="Dados do envio" className="px-6 py-5 @[620px]:px-10 @[620px]:py-6">
          <dl className="divide-y divide-[#ebe7f3]">
            <Campo rotulo="Remetente">{view.from}</Campo>
            <Campo rotulo="Destinatário">
              {view.toName ? <span className="block font-medium">{view.toName}</span> : null}
              {view.to ? (
                <span className={view.toName ? 'block break-all text-[#4a4163]' : 'block break-all font-medium'}>{view.to}</span>
              ) : null}
              {!view.toName && !view.to ? <span className="text-[#6e6589]">não informado</span> : null}
            </Campo>
            <Campo rotulo="Canal">
              <span className="inline-flex items-center gap-1.5">
                <Mail aria-hidden="true" className="size-4 text-[#7c3aed]" />
                E-mail
              </span>
            </Campo>
            <Campo rotulo="Tipo">{tipo}</Campo>
            <Campo rotulo="Enviado em">
              <span className="tabular-nums">{view.sentAtLabel ?? 'não informado'}</span>
            </Campo>
            {/* Sempre presente: "não informado" é honesto; o campo sumir não. */}
            <Campo rotulo="End-to-end">
              <span className="font-mono text-[13px] break-all">{endToEndId ?? 'não informado'}</span>
            </Campo>
            {sourceReference ? (
              <Campo rotulo="ID da mensagem">
                <span className="font-mono text-[13px] break-all">{sourceReference}</span>
              </Campo>
            ) : null}
          </dl>
        </section>
      </div>

      <section aria-label="Mensagem enviada" className="border-t border-[#ebe7f3] px-4 py-7 @[620px]:px-10 @[620px]:py-8">
        <h3 className="mb-4 px-2 text-[12px] font-semibold tracking-[0.08em] text-[#7c3aed] uppercase @[620px]:px-0">
          Mensagem enviada
        </h3>
        <PainelMensagem view={view} />
      </section>

      {/* Declaração de origem — inseparável da peça. Nunca remova. */}
      <footer className="flex items-start gap-2.5 border-t border-[#ebe7f3] px-6 py-5 text-[12px] text-[#6e6589] @[620px]:px-10">
        <ShieldCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-[#7c3aed]" />
        <p>{view.stamp}</p>
      </footer>
    </article>
  );
}
