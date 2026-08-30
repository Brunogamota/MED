import { buildClientEmailView, type CommunicationReceipt } from '@/domain/communication/receipt';

/**
 * Visão do cliente: renderiza a comunicação como o destinatário a recebeu.
 *
 * O selo de reconstrução é parte inseparável da peça — fica no topo, visível,
 * e é o que separa "representação honesta do que enviamos" de "captura forjada
 * da caixa de entrada do cliente". Nunca remova o selo.
 */
export function ClientEmailView({ receipt }: { receipt: CommunicationReceipt }) {
  const view = buildClientEmailView(receipt);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-white">
      <div className="border-b border-[var(--color-warning)] bg-[var(--color-warning-subtle)] px-4 py-2 text-[11px] leading-snug text-[var(--color-warning)]">
        {view.stamp}
      </div>

      {/* Barra do cliente de e-mail */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-5 py-3">
        <p className="text-[15px] font-semibold text-[var(--color-text)]">
          {view.subject || 'Sem assunto'}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-active)] text-[13px] font-medium text-[var(--color-text-secondary)]"
          >
            {(view.from.trim()[0] ?? '?').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[var(--color-text)]">{view.from}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              para {view.to || '—'}
              {view.sentAtLabel ? ` · ${view.sentAtLabel}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="space-y-3 px-5 py-5 text-[14px] leading-relaxed text-[var(--color-text)]">
        {view.paragraphs.length > 0 ? (
          view.paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-[var(--color-text-muted)]">Sem conteúdo.</p>
        )}
        {view.reference ? (
          <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-[13px]">
            <span className="text-[var(--color-text-muted)]">Referência: </span>
            <span className="font-mono text-xs">{view.reference}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
