import {
  buildClientEmailView,
  COMMUNICATION_TEMPLATE_LABEL,
  type ClientEmailAction,
  type CommunicationReceipt,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';

/**
 * Painel de envios: reconstrói a comunicação como o painel administrativo do
 * gateway (IronPay) que efetivamente enviou — status, destinatário, canal,
 * tipo e, abaixo, a prévia do que foi mandado.
 *
 * Essa é uma evidência mais defensável do que fingir a caixa de entrada do
 * cliente: o estabelecimento não tem acesso ao e-mail do comprador, mas o
 * IronPay tem acesso ao próprio registro de envio. É esse registro que a peça
 * representa.
 *
 * O selo de reconstrução é parte inseparável da peça — fica no topo, visível,
 * e é o que separa "representação honesta do envio" de "captura forjada do
 * painel administrativo real". Nunca remova o selo.
 */

function TemplateIcon({ template }: { template: CommunicationTemplate }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (template) {
    case 'ACCESS_DELIVERY':
      return (
        <svg {...common} aria-hidden>
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
        </svg>
      );
    case 'DELIVERY_CONFIRMATION':
      return (
        <svg {...common} aria-hidden>
          <path d="m3.3 7 8.7 4.5L20.7 7" />
          <path d="M12 11.5V21" />
          <path d="M20.5 7.3v9.4L12 21l-8.5-4.3V7.3L12 3Z" />
        </svg>
      );
    case 'PURCHASE_CONFIRMATION':
      return (
        <svg {...common} aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </svg>
      );
  }
}

/**
 * Call-to-action da mensagem: botão preto, clicável quando há uma URL real.
 * Sem URL o botão aparece igual — era o botão que o cliente via —, com o
 * valor logo abaixo para quem confere a peça saber para onde ele levava.
 */
function ActionButton({ action }: { action: ClientEmailAction }) {
  if (action.kind === 'NOTE') {
    return (
      <div className="mt-5 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#71717a]">
          {action.valueLabel}
        </p>
        <p className="mt-1 break-all font-mono text-[14px] text-[#18181b]">
          {action.value}
        </p>
      </div>
    );
  }

  const buttonClass =
    'inline-flex h-11 items-center justify-center rounded-lg bg-[#18181b] px-6 text-[14px] font-semibold text-white no-underline';

  return (
    <div className="mt-5">
      {action.href ? (
        <a href={action.href} className={buttonClass}>
          {action.label}
        </a>
      ) : (
        <span className={buttonClass}>{action.label}</span>
      )}
      <p className="mt-2 text-[11px] text-[#71717a]">
        {action.valueLabel}:{' '}
        <span className="break-all font-mono text-[#52525b]">
          {action.value}
        </span>
      </p>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[#71717a]">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-[13px] text-[#18181b] ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function ClientEmailView({
  receipt,
  sourceReference,
}: {
  receipt: CommunicationReceipt;
  /** Id da mensagem no painel do gateway, quando registrado na evidência. */
  sourceReference?: string | null;
}) {
  const view = buildClientEmailView(receipt);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d4d4d8] bg-white shadow-sm">
      {/* Selo de reconstrução — inseparável da peça */}
      <div className="flex items-start gap-2 border-b border-[#e5e5e5] bg-[#fafafa] px-5 py-2.5 text-[11px] leading-snug text-[#8a8a92]">
        <svg
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="mt-px shrink-0"
          aria-hidden
        >
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <span>{view.stamp}</span>
      </div>

      {/* Barra do painel — identidade do gateway + status do envio */}
      <div className="flex items-center justify-between gap-3 border-b border-[#e5e5e5] bg-[#fafafa] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#18181b] text-[13px] font-bold text-white"
          >
            {view.fromInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#18181b]">
              {view.from}
            </p>
            <p className="truncate text-[11px] text-[#71717a]">Painel de envios</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#15803d]" />
          Enviado
        </span>
      </div>

      {/* Grade de metadados do registro de envio */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[#e5e5e5] px-5 py-4 sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-[11px] text-[#71717a]">Destinatário</dt>
          <dd className="mt-0.5 truncate text-[13px] text-[#18181b]">
            {view.toName || view.to || 'não informado'}
          </dd>
          {view.toName && view.to ? (
            <dd className="truncate text-[11px] text-[#71717a]">{view.to}</dd>
          ) : null}
        </div>
        <Field label="Canal" value="E-mail" />
        <Field label="Tipo" value={COMMUNICATION_TEMPLATE_LABEL[view.template]} />
        <Field label="Enviado em" value={view.sentAtLabel ?? 'não informado'} />
        {sourceReference ? (
          <div className="col-span-2 min-w-0 sm:col-span-4">
            <Field label="ID da mensagem" value={sourceReference} mono />
          </div>
        ) : null}
      </dl>

      {/* Prévia da mensagem enviada */}
      <div className="px-5 py-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[#71717a]">
          Prévia da mensagem
        </p>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-5">
          <span
            className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52525b]"
            aria-hidden
          >
            <TemplateIcon template={view.template} />
          </span>
          <h2 className="text-[16px] font-semibold leading-snug text-[#18181b]">
            {view.subject || 'Sem assunto'}
          </h2>
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#52525b]">
            {view.paragraphs.length > 0 ? (
              view.paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-[#71717a]">Sem conteúdo.</p>
            )}
          </div>
          {view.action ? <ActionButton action={view.action} /> : null}
        </div>
      </div>
    </div>
  );
}
