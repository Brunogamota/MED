import type { MedCase } from '@/domain/case';
import { formatAmount, formatDateTimeSmart, maskDocument } from '@/lib/format';

/**
 * Comprovante de pagamento Pix — representação, na visão do cliente, do
 * comprovante da transação que originou o MED.
 *
 * O que esta peça é, e o que ela NÃO é:
 *
 *  - É a projeção visual dos dados da transação que o caso já carrega (valor,
 *    pagador, end-to-end, data, recebedor, identificador). Cada campo vem de um
 *    registro com origem; nada aqui é inventado. Campo sem dado permanece
 *    ausente e é exibido como "não informado".
 *
 *  - NÃO é uma captura do aplicativo/banco do cliente, e nunca pode ser
 *    apresentada como tal. A peça carrega o selo PAYMENT_RECEIPT_STAMP, visível
 *    e inseparável. Sem o selo, um comprovante que imita o do provedor seria
 *    uma falsificação; com ele, é a representação honesta dos dados da
 *    transação.
 *
 * Como é 100% derivada do caso, não há formulário: o operador gera, confere e
 * captura/imprime. O tipo do meio é sempre Pix — é o P do MED (Mecanismo
 * Especial de Devolução do Pix), fato do domínio, não suposição.
 */

/** Texto do selo. Vai na tela, na rota de impressão e no PDF, sem exceção. */
export const PAYMENT_RECEIPT_STAMP =
  'RECONSTRUÇÃO — Representação do comprovante de pagamento, gerada a partir dos ' +
  'registros da transação no caso. Não é uma captura do aplicativo ou banco do pagador.';

/** Uma linha da grade de detalhes. `value` nulo é renderado como "não informado". */
export interface PaymentReceiptRow {
  label: string;
  value: string | null;
  /** Renderiza em fonte monoespaçada (identificadores longos). */
  mono?: boolean;
}

/** Modelo pronto para renderizar (UI e impressão). */
export interface PaymentReceiptView {
  /** Estabelecimento que recebeu — cabeçalho da peça. */
  merchant: string;
  /** "Pix · Aprovado" quando há status; "Pix" quando não há. */
  statusLine: string;
  amountLabel: string;
  payerName: string | null;
  rows: PaymentReceiptRow[];
  transactionId: string | null;
  stamp: string;
}

function approvedLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'CAPTURED' || normalized === 'PAID') {
    return 'Aprovado';
  }
  if (normalized === 'AUTHORIZED') return 'Autorizado';
  return status.trim();
}

/**
 * Projeta o caso num comprovante de pagamento. Puro e determinístico: só lê o
 * que já existe no caso, nunca preenche campo ausente com valor plausível.
 */
export function buildPaymentReceiptView(medCase: MedCase): PaymentReceiptView {
  const { med, transaction } = medCase;

  const merchant = med.merchantName ?? 'Estabelecimento';

  const status = approvedLabel(transaction?.status);
  const statusLine = status ? `Pix · ${status}` : 'Pix';

  const amountLabel = formatAmount(med.amount, med.currency);

  const paidAt = transaction?.capturedAt ?? med.transactionAt ?? transaction?.authorizedAt ?? null;
  const endToEnd = med.endToEndId ?? transaction?.endToEndId ?? null;
  const payerDocument = maskDocument(med.payer.document);
  const transactionId =
    med.transactionId ?? transaction?.externalId ?? transaction?.providerReference ?? null;

  const rows: PaymentReceiptRow[] = [
    { label: 'Data e hora', value: formatDateTimeSmart(paidAt) },
    { label: 'End-to-end', value: endToEnd, mono: true },
    { label: 'Tipo', value: 'Pix' },
    { label: 'Recebedor', value: med.merchantName ?? null },
    { label: 'Pagador', value: med.payer.name ?? null },
    { label: 'CPF/CNPJ do pagador', value: payerDocument, mono: true },
    { label: 'Valor da transação', value: amountLabel },
  ];

  return {
    merchant,
    statusLine,
    amountLabel,
    payerName: med.payer.name ?? null,
    rows,
    transactionId,
    stamp: PAYMENT_RECEIPT_STAMP,
  };
}
