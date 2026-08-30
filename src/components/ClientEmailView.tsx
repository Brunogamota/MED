import {
  buildClientEmailView,
  type ClientEmailAction,
  type CommunicationReceipt,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';

/**
 * Visão do cliente: renderiza a comunicação como um e-mail transacional, do
 * jeito que o destinatário o recebe — cabeçalho de marca, título, corpo e a
 * ação em destaque (link de acesso, código, rastreio).
 *
 * O selo de reconstrução é parte inseparável da peça — fica no topo, visível,
 * e é o que separa "representação honesta do que enviamos" de "captura forjada
 * da caixa de entrada do cliente". Nunca remova o selo.
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

function ActionBlock({ action }: { action: ClientEmailAction }) {
  if (action.kind === 'LINK') {
    return (
      <div className="mt-5">
        <a
          href={action.value}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-6 text-[14px] font-semibold text-white no-underline"
        >
          {action.label}
        </a>
        <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-text-muted)]">
          {action.value}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {action.label}
      </p>
      <p
        className={`mt-1 text-[15px] text-[var(--color-text)] ${
          action.kind === 'TEXT' ? '' : 'font-mono'
        } break-all`}
      >
        {action.value}
      </p>
    </div>
  );
}

export function ClientEmailView({ receipt }: { receipt: CommunicationReceipt }) {
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

      {/* Barra do cliente de e-mail (remetente / destinatário / data) */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[14px] font-semibold text-[var(--color-accent)]"
        >
          {view.fromInitial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">
              {view.from}
            </p>
            {view.sentAtLabel ? (
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {view.sentAtLabel}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            para {view.to || '—'}
          </p>
        </div>
      </div>

      {/* Corpo do e-mail desenhado, sobre um canvas suave */}
      <div className="bg-[var(--color-bg-subtle)] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-[520px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
          {/* Cabeçalho de marca */}
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-6 py-4">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)] text-[13px] font-bold text-white"
            >
              {view.fromInitial}
            </span>
            <span className="text-[14px] font-semibold text-[var(--color-text)]">{view.from}</span>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-7">
            <span
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
              aria-hidden
            >
              <TemplateIcon template={view.template} />
            </span>

            <h2 className="text-[20px] font-semibold leading-snug text-[var(--color-text)]">
              {view.subject || 'Sem assunto'}
            </h2>

            <div className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
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

            {view.action ? <ActionBlock action={view.action} /> : null}
          </div>

          {/* Rodapé do e-mail */}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-6 py-4">
            <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              Este e-mail foi enviado por {view.from}
              {view.to ? ` para ${view.to}` : ''}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
