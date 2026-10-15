import {
  COMMUNICATION_TEMPLATE_LABEL,
  type ClientEmailView,
} from '@/domain/communication/receipt';
import { BullsMark } from '@/components/skins/bulls/bulls-mark';

/**
 * Comprovante de envio no ambiente Bulls Cash.
 *
 * Mesmo dado da peça do Jade — remetente, destinatário, canal, end-to-end,
 * tipo, horário, id da mensagem, prévia e a declaração de origem —, outra
 * composição: faixa roxa com a marca no topo, ficha do envio em coluna à
 * esquerda e a mensagem à direita. Cor literal porque a peça vai impressa e
 * representa documento externo, independente do tema da tela.
 *
 * A declaração de origem no rodapé é parte da peça. Nunca remova.
 */
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-[#ede6fb] border-b py-2.5 last:border-b-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b7aa8]">{label}</dt>
      <dd className={`mt-1 break-words text-[13px] text-[#1b1030] ${mono ? 'font-mono text-[11.5px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export function BullsReceipt({
  view,
  sourceReference,
  endToEndId,
}: {
  view: ClientEmailView;
  sourceReference?: string | null;
  endToEndId?: string | null;
}) {
  const action = view.action;
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#e4d8fb] bg-white text-[#1b1030] shadow-[0_18px_50px_-24px_rgba(88,28,135,0.45)]">
      <header className="flex items-center justify-between gap-3 bg-[linear-gradient(120deg,#7c3aed,#a855f7_55%,#c084fc)] px-6 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <BullsMark size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-[15px] tracking-[0.02em]">{view.from}</p>
            <p className="text-[11px] text-white/75 uppercase tracking-[0.18em]">Comprovante de envio</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/18 px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.12em] ring-1 ring-white/35">
          Entregue ao servidor
        </span>
      </header>

      <div className="grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <dl className="border-[#ede6fb] bg-[#faf7ff] px-6 py-3 sm:border-r">
          <Row label="Para" value={view.toName || view.to || 'não informado'} />
          {view.toName && view.to ? <Row label="E-mail" value={view.to} /> : null}
          <Row label="Canal" value="E-mail" />
          <Row label="Tipo" value={COMMUNICATION_TEMPLATE_LABEL[view.template]} />
          <Row label="Enviado em" value={view.sentAtLabel ?? 'não informado'} />
          <Row label="End-to-end" value={endToEndId ?? 'não informado'} mono />
          {sourceReference ? <Row label="ID da mensagem" value={sourceReference} mono /> : null}
        </dl>

        <section className="px-6 py-6">
          <p className="font-semibold text-[10px] text-[#8b7aa8] uppercase tracking-[0.18em]">
            Mensagem enviada
          </p>
          <h2 className="mt-3 font-bold text-[19px] leading-snug tracking-[-0.01em]">
            {view.subject || 'Sem assunto'}
          </h2>
          <div className="mt-3 space-y-3 text-[13.5px] text-[#4a3d63] leading-relaxed">
            {view.paragraphs.length > 0 ? (
              view.paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-[#8b7aa8]">Sem conteúdo.</p>
            )}
          </div>
          {action?.kind === 'NOTE' ? (
            <div className="mt-5 rounded-2xl border border-[#e4d8fb] bg-[#faf7ff] px-4 py-3">
              <p className="font-semibold text-[10px] text-[#8b7aa8] uppercase tracking-[0.14em]">
                {action.valueLabel}
              </p>
              <p className="mt-1 break-all font-mono text-[13px]">{action.value}</p>
            </div>
          ) : action ? (
            <div className="mt-6">
              {action.href ? (
                <a
                  href={action.href}
                  className="inline-flex h-11 items-center rounded-full bg-[#7c3aed] px-6 font-semibold text-[14px] text-white no-underline"
                >
                  {action.label} →
                </a>
              ) : (
                <span className="inline-flex h-11 items-center rounded-full bg-[#7c3aed] px-6 font-semibold text-[14px] text-white">
                  {action.label} →
                </span>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <footer className="border-[#ede6fb] border-t bg-[#faf7ff] px-6 py-3 text-[10px] text-[#8b7aa8] leading-snug">
        {view.stamp}
      </footer>
    </article>
  );
}
