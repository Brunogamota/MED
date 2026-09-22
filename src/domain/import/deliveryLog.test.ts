import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyOutcome, parseDeliveryLog, parseLogTimestamp } from '@/domain/import/deliveryLog';

/**
 * Export de MTA com os envios de confirmacao.
 *
 * Estrutura e respostas SMTP sao as de um arquivo real; as pessoas e o dominio
 * do remetente foram trocados. O bounce por dominio digitado errado
 * (`gmial.com`) ficou porque e justamente o caso que o leitor precisa tratar
 * direito — e o que um arquivo forjado nunca traria.
 */
const RAW = readFileSync(join(__dirname, 'fixtures/delivery-log.csv'), 'utf8');

describe('classifyOutcome', () => {
  it('reconhece entrega e recusa', () => {
    expect(classifyOutcome('delivered')).toBe('DELIVERED');
    expect(classifyOutcome('bounced')).toBe('BOUNCED');
  });

  it('o que nao e entrega nem recusa fica em OTHER, e nao vira entrega', () => {
    // `deferred` e `queued` sao mensagem a caminho. Contar como entregue faria
    // a defesa afirmar que chegou o que ainda nao chegou.
    expect(classifyOutcome('deferred')).toBe('OTHER');
    expect(classifyOutcome('queued')).toBe('OTHER');
    expect(classifyOutcome('')).toBe('OTHER');
  });
});

describe('parseLogTimestamp', () => {
  it('le o formato do log no fuso de Brasilia', () => {
    // 09:29:42 em -03:00 sao 12:29:42 em UTC.
    expect(parseLogTimestamp('2026-09-17 09:29:42')).toBe('2026-09-17T12:29:42.000Z');
  });

  it('texto que nao e data vira null, em vez de virar hoje', () => {
    expect(parseLogTimestamp('')).toBeNull();
    expect(parseLogTimestamp('sem data')).toBeNull();
  });
});

describe('log de entrega', () => {
  const parsed = parseDeliveryLog(RAW);

  it('le a linha inteira, com message-id sem os sinais', () => {
    const row = parsed.rows[0];
    expect(row?.messageId).toBe('20260917092942.311152766e@mta03.exemplo.com.br');
    expect(row?.customerEmail).toBe('fulano.azevedo@outlook.com');
    expect(row?.amount).toBe(35.12);
    expect(row?.sentAt).toBe('2026-09-17T12:29:42.000Z');
    expect(row?.deliveredAt).toBe('2026-09-17T12:29:54.000Z');
    expect(row?.outcome).toBe('DELIVERED');
    expect(row?.smtpResponse).toContain('250 2.6.0');
    expect(row?.errors).toEqual([]);
  });

  it('recusa por dominio inexistente entra como recusa, e sem data de entrega', () => {
    const bounced = parsed.rows.filter((row) => row.outcome === 'BOUNCED');
    expect(bounced).toHaveLength(2);
    expect(bounced[0]?.deliveredAt).toBeNull();
    expect(bounced[0]?.smtpResponse).toContain('Domain gmial.com not found');
    // Recusa sem hora de entrega e o esperado: nao houve entrega para datar.
    expect(bounced[0]?.errors).toEqual([]);
  });

  it('entrega sem hora e erro de linha: o horario e metade da prova', () => {
    const row = parsed.rows.find((entry) => entry.customerName === 'Sem Hora Exemplo');
    expect(row?.errors).toContain(
      'Status é entrega, mas a data da entrega está ausente ou ilegível.',
    );
  });

  it('status intermediario nao e promovido a entrega', () => {
    const row = parsed.rows.find((entry) => entry.customerName === 'Deferido Exemplo');
    expect(row?.outcome).toBe('OTHER');
    expect(row?.rawStatus).toBe('deferred');
    expect(row?.deliveredAt).toBeNull();
  });

  it('arquivo sem message-id e recusado inteiro', () => {
    const semId = parseDeliveryLog('customer_email,status\na@b.com,delivered');
    expect(semId.fatalError).toMatch(/message-id/);
    expect(semId.rows).toEqual([]);
  });
});
