import { buildPaymentReceiptView } from '@/domain/receipt/payment';
import type { MedCase } from '@/domain/case';

/**
 * Comprovante de pagamento na visão do cliente: reproduz o comprovante Pix como
 * ele chega ao pagador (tema escuro, como no aplicativo/e-mail do cliente).
 *
 * As cores são fixas de propósito — a peça representa o comprovante do provedor,
 * não a interface do console, então não segue os tokens de tema do app.
 *
 * O selo de reconstrução fica no topo, visível, e é inseparável: é o que separa
 * "representação honesta dos dados da transação" de "captura forjada do banco do
 * cliente". Nunca remova o selo.
 */
export function PaymentReceiptCard({ medCase }: { medCase: MedCase }) {
  const view = buildPaymentReceiptView(medCase);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2b2b2e] bg-[#121214] shadow-sm">
      {/* Selo de reconstrução — inseparável da peça, mais discreto que uma faixa cheia */}
      <div className="flex items-start gap-1.5 border-b border-[#242427] px-5 py-1.5 text-[10px] leading-snug text-[#8a8a92]">
        <svg
          width={11}
          height={11}
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

      <div className="px-6 py-6">
        {/* Cabeçalho: estabelecimento + status */}
        <p className="text-[19px] font-semibold text-white">{view.merchant}</p>
        <p className="mt-1 text-[13px] text-[#9a9aa2]">Comprovante de pagamento</p>
        <p className="mt-0.5 text-[13px] text-[#9a9aa2]">{view.statusLine}</p>

        {/* Valor em destaque */}
        <p className="mt-5 text-[38px] font-bold leading-none tracking-tight text-white">
          {view.amountLabel}
        </p>
        {view.payerName ? (
          <p className="mt-2 text-[15px] text-[#c7c7cf]">
            de <span className="font-semibold text-white">{view.payerName}</span>
          </p>
        ) : null}

        {/* Grade de detalhes */}
        <dl className="mt-6 space-y-3.5 border-t border-[#242427] pt-5">
          {view.rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-6">
              <dt className="shrink-0 text-[13px] text-[#8a8a92]">{row.label}</dt>
              <dd
                className={`min-w-0 break-words text-right text-[14px] ${
                  row.value ? 'text-[#e8e8ee]' : 'italic text-[#6a6a72]'
                } ${row.mono ? 'font-mono text-[12.5px]' : ''}`}
              >
                {row.value ?? 'não informado'}
              </dd>
            </div>
          ))}
        </dl>

        {/* Rodapé: identificador da transação */}
        {view.transactionId ? (
          <div className="mt-6 border-t border-[#242427] pt-4">
            <p className="text-[12px] text-[#6f6f77]">
              ID da transação:{' '}
              <span className="break-all font-mono text-[#8a8a92]">{view.transactionId}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
