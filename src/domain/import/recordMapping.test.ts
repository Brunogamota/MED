import { describe, expect, it } from 'vitest';
import { buildCustomerInput, buildOrderInput, buildTransactionInput } from '@/domain/import/recordMapping';
import type { ImportedMedRow } from '@/domain/import/csv';

function row(overrides: Partial<ImportedMedRow> = {}): ImportedMedRow {
  return {
    line: 2,
    medId: 'MED-008',
    transactionId: null,
    endToEndId: null,
    pixId: null,
    amount: 349.9,
    transactionAt: '2026-08-10T17:32:00.000Z',
    openedAt: '2026-08-20T09:00:00.000Z',
    responseDeadlineAt: null,
    reason: 'PRODUCT_NOT_RECEIVED',
    reasonDescription: null,
    requestingInstitution: null,
    productType: null,
    payerName: 'Maria Souza',
    payerDocument: '12345678909',
    payerEmail: null,
    payerPhone: null,
    merchantName: null,
    orderReference: null,
    errors: [],
    ...overrides,
  };
}

describe('buildTransactionInput', () => {
  it('usa a mesma data de compra para autorizacao e captura', () => {
    const input = buildTransactionInput(row());
    expect(input).toEqual({
      externalId: undefined,
      endToEndId: undefined,
      amount: 349.9,
      currency: 'BRL',
      authorizedAt: '2026-08-10T17:32:00.000Z',
      capturedAt: '2026-08-10T17:32:00.000Z',
    });
  });

  it('sem valor, nao ha transacao para criar', () => {
    expect(buildTransactionInput(row({ amount: null }))).toBeNull();
  });

  it('carrega id da transacao e end-to-end quando o arquivo traz', () => {
    const input = buildTransactionInput(
      row({ transactionId: 'TX-1', endToEndId: 'E123' }),
    );
    expect(input?.externalId).toBe('TX-1');
    expect(input?.endToEndId).toBe('E123');
  });
});

describe('buildCustomerInput', () => {
  it('monta a identificacao a partir do que o arquivo tem', () => {
    const input = buildCustomerInput(row({ payerEmail: 'maria@example.com' }));
    expect(input?.identification).toEqual({
      name: 'Maria Souza',
      document: '12345678909',
      email: 'maria@example.com',
      phone: undefined,
    });
  });

  it('sem nenhum dado de identidade, nao ha cliente para criar', () => {
    const input = buildCustomerInput(
      row({ payerName: null, payerDocument: null, payerEmail: null, payerPhone: null }),
    );
    expect(input).toBeNull();
  });
});

describe('buildOrderInput', () => {
  it('sem nada que identifique um pedido, nao cria Pedido — seria copia da transacao', () => {
    expect(buildOrderInput(row())).toBeNull();
  });

  it('com numero do pedido mas sem tipo, usa OTHER — o "nao classificado" do dominio', () => {
    const input = buildOrderInput(row({ orderReference: 'PED-30' }));
    expect(input?.externalId).toBe('PED-30');
    expect(input?.productType).toBe('OTHER');
  });

  it('com tipo de produto, o pedido nasce completo com o que o arquivo tem', () => {
    const input = buildOrderInput(
      row({ productType: 'PHYSICAL', orderReference: 'PED-1' }),
    );
    expect(input).toEqual({
      externalId: 'PED-1',
      productType: 'PHYSICAL',
      totalAmount: 349.9,
      placedAt: '2026-08-10T17:32:00.000Z',
      items: [],
    });
  });
});
