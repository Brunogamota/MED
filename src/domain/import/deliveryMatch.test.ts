import { describe, expect, it } from 'vitest';
import type { DeliveryLogRow } from '@/domain/import/deliveryLog';
import { matchDeliveryLog, type MatchableMed } from '@/domain/import/deliveryMatch';

function row(overrides: Partial<DeliveryLogRow> = {}): DeliveryLogRow {
  return {
    line: 2,
    transactionRef: 'txn_1',
    purchaseAt: '2026-09-18T15:30:04.000Z',
    amount: 32.8,
    customerName: 'Fulano Auto de Lima',
    customerEmail: 'fulano@exemplo.com',
    sentAt: '2026-09-18T15:31:34.000Z',
    messageId: 'msg-1@mta.exemplo',
    outcome: 'DELIVERED',
    rawStatus: 'delivered',
    deliveredAt: '2026-09-18T15:31:50.000Z',
    smtpResponse: '250 OK',
    errors: [],
    ...overrides,
  };
}

function med(overrides: Partial<MatchableMed> = {}): MatchableMed {
  return {
    id: 'med_1',
    medId: 'E000-1',
    amount: 32.8,
    transactionAt: '2026-09-18T15:30:00.000Z',
    payerName: 'Fulano Auto de Lima',
    ...overrides,
  };
}

describe('casamento do log com os MEDs', () => {
  it('casa por valor e minuto da compra', () => {
    const report = matchDeliveryLog([row()], [med()]);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0]?.med.medId).toBe('E000-1');
    expect(report.medsWithoutDelivery).toEqual([]);
  });

  it('segundos diferentes nao atrapalham: o minuto e o mesmo', () => {
    const report = matchDeliveryLog(
      [row({ purchaseAt: '2026-09-18T15:30:59.000Z' })],
      [med({ transactionAt: '2026-09-18T15:30:04.000Z' })],
    );
    expect(report.matched).toHaveLength(1);
  });

  it('centavo diferente nao casa', () => {
    const report = matchDeliveryLog([row({ amount: 32.81 })], [med()]);
    expect(report.matched).toEqual([]);
    expect(report.unmatchedRows[0]?.reason).toMatch(/Nenhum MED/);
  });

  it('nome divergente recusa o casamento, mesmo com valor e hora iguais', () => {
    // Valor e minuto coincidindo por acaso acontece num arquivo de 65 linhas.
    const report = matchDeliveryLog([row({ customerName: 'Outra Pessoa' })], [med()]);
    expect(report.matched).toEqual([]);
  });

  it('aceita nome abreviado de um dos lados', () => {
    const report = matchDeliveryLog(
      [row({ customerName: 'Fulano Auto de Lima' })],
      [med({ payerName: 'Fulano Auto de Lima Silva' })],
    );
    expect(report.matched).toHaveLength(1);
  });

  it('ambiguidade vira relatorio, e nao sorteio', () => {
    // Mesma pessoa, mesmo valor, mesmo minuto, dois MEDs: o log nao distingue.
    const report = matchDeliveryLog(
      [row()],
      [med({ id: 'a', medId: 'E000-A' }), med({ id: 'b', medId: 'E000-B' })],
    );
    expect(report.matched).toEqual([]);
    expect(report.unmatchedRows[0]?.reason).toContain('E000-A');
    expect(report.unmatchedRows[0]?.reason).toContain('E000-B');
  });

  it('nao usa o mesmo MED para duas linhas', () => {
    const report = matchDeliveryLog([row(), row({ line: 3, transactionRef: 'txn_2' })], [med()]);
    expect(report.matched).toHaveLength(1);
    expect(report.unmatchedRows).toHaveLength(1);
  });

  it('lista os MEDs que ficaram sem registro de envio', () => {
    const semEnvio = med({
      id: 'med_2',
      medId: 'E000-2',
      amount: 19.9,
      transactionAt: '2026-09-19T11:41:00.000Z',
      payerName: 'Beltrano Correia',
    });
    const report = matchDeliveryLog([row()], [med(), semEnvio]);
    // E o que a defesa nao tem: sem isso o operador nao sabe onde falta prova.
    expect(report.medsWithoutDelivery.map((entry) => entry.medId)).toEqual(['E000-2']);
  });

  it('linha sem valor ou sem data nao tenta adivinhar', () => {
    const report = matchDeliveryLog([row({ amount: null })], [med()]);
    expect(report.unmatchedRows[0]?.reason).toMatch(/não há como identificar/);
  });
});
