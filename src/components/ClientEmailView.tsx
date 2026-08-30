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
          <path d="M15.5 7.5a4 4 0 1 0-4.9 3.9L4 18v3h3l1-1v-2h2v-2h2l1.4-1.4a4 4 0 0 0 2.1-7.1Z" />
          <circle cx="16.5" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
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

/** Botão sempre preto: seja a peça um link real, seja um código de acesso. */
function ActionButton({ action }: { action: ClientEmailAction }) {
  const buttonClass =
    'inline-flex h-11 items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 text-[14px] font-semibold text-white no-underline';

  if (action.kind === 'LINK') {
    return (
      <div className="mt-5">
        <a href={action.value} className={buttonClass}>
          {action.label}
        </a>
        <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-text-muted)]">
          {action.value}
        </p>
      </div>
    );
  }

  if (action.kind === 'CODE') {
    return (
      <div className="mt-5">
        <span className={buttonClass}>{action.label}</span>
        <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">{action.value}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {action.label}
      </p>
      <p className="mt-1 break-all font-mono text-[15px] text-[var(--color-text)]">
        {action.value}
      </p>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--color-text-muted)]">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-[13px] text-[var(--color-text)] ${mono ? 'font-mono text-xs' : ''}`}
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
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-white shadow-sm">
      {/* Selo de reconstrução — inseparável da peça */}
      <div className="flex items-start gap-2 border-b border-[var(--color-warning)] bg-[var(--color-warning-subtle)] px-5 py-2.5 text-[11px] leading-snug text-[var(--color-warning)]">
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
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-[13px] font-bold text-white"
          >
            {view.fromInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
              {view.from}
            </p>
            <p className="truncate text-[11px] text-[var(--color-text-muted)]">Painel de envios</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-success-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-success)]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          Enviado
        </span>
      </div>

      {/* Grade de metadados do registro de envio */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[var(--color-border)] px-5 py-4 sm:grid-cols-4">
        <Field label="Destinatário" value={view.to || 'não informado'} />
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
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Prévia da mensagem
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-5">
          <span
            className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--color-text-secondary)]"
            aria-hidden
          >
            <TemplateIcon template={view.template} />
          </span>
          <h2 className="text-[16px] font-semibold leading-snug text-[var(--color-text)]">
            {view.subject || 'Sem assunto'}
          </h2>
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {view.paragraphs.length > 0 ? (
              view.paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-[var(--color-text-muted)]">Sem conteúdo.</p>
            )}
          </div>
          {view.action ? <ActionButton action={view.action} /> : null}
        </div>
      </div>
    </div>
  );
}
