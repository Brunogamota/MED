import { describe, expect, it } from 'vitest';
import { buildPaymentReceiptView, PAYMENT_RECEIPT_STAMP } from '@/domain/receipt/payment';
import { makeCompleteCase } from '@/test/fixtures';

const rowValue = (view: ReturnType<typeof buildPaymentReceiptView>, label: string) =>
  view.rows.find((row) => row.label === label)?.value ?? null;

describe('buildPaymentReceiptView', () => {
  it('projeta os dados reais da transação, sem inventar', () => {
    const view = buildPaymentReceiptView(makeCompleteCase());
    expect(view.merchant).toBe('Loja Exemplo');
    expect(view.statusLine).toBe('Pix · Aprovado');
    expect(view.amountLabel).toBe('R$ 349,90');
    expect(view.payerName).toBe('Maria Souza');
    expect(rowValue(view, 'End-to-end')).toBe('E12345678202608101432abcdef01');
    expect(rowValue(view, 'Tipo')).toBe('Pix');
    expect(view.transactionId).toBe('TX-991');
  });

  it('mascara o documento do pagador', () => {
    const view = buildPaymentReceiptView(makeCompleteCase());
    // 12345678909 -> mantém apenas os 4 últimos dígitos
    expect(rowValue(view, 'CPF/CNPJ do pagador')).toBe('*******8909');
  });

  it('sempre carrega o selo de reconstrução', () => {
    expect(buildPaymentReceiptView(makeCompleteCase()).stamp).toBe(PAYMENT_RECEIPT_STAMP);
  });

  it('não preenche campo ausente: sem transação, status vira só "Pix" e id fica nulo', () => {
    const medCase = makeCompleteCase();
    medCase.transaction = null;
    medCase.med = { ...medCase.med, transactionId: null };
    const view = buildPaymentReceiptView(medCase);
    expect(view.statusLine).toBe('Pix');
    expect(view.transactionId).toBeNull();
    // end-to-end ainda vem do próprio MED
    expect(rowValue(view, 'End-to-end')).toBe('E12345678202608101432abcdef01');
  });
});
