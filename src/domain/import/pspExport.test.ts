import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMedImport, parsePayerDetails } from '@/domain/import/csv';

/**
 * Export de gateway com os MEDs recusados do periodo.
 *
 * O arquivo e o de um caso real, com as pessoas trocadas: nome, documento e
 * identificador de transacao sao ficticios, e os cabecalhos e a estrutura sao
 * exatamente os que chegaram. Fixture em git e para sempre, e CPF de quem
 * contestou uma cobranca nao entra em repositorio.
 */
const RAW = readFileSync(join(__dirname, 'fixtures/psp-rejeitados.csv'), 'utf8');

describe('parsePayerDetails', () => {
  it('separa nome e documento do campo composto', () => {
    expect(parsePayerDetails('Payer Name: Fulano de Tal | Payer Document: CPF 11122233344')).toEqual(
      { name: 'Fulano de Tal', document: '11122233344' },
    );
  });

  it('aceita CNPJ', () => {
    expect(
      parsePayerDetails('Payer Name: EMPRESA | Payer Document: CNPJ 63.180.963/0001-34').document,
    ).toBe('63180963000134');
  });

  it('rotulo ausente vira campo ausente, sem deduzir do outro', () => {
    expect(parsePayerDetails('Payer Name: So o nome')).toEqual({
      name: 'So o nome',
      document: null,
    });
    expect(parsePayerDetails('')).toEqual({ name: null, document: null });
  });
});

describe('export de MEDs recusados', () => {
  const parsed = parseMedImport(RAW);

  it('reconhece as colunas do arquivo', () => {
    const fields = parsed.recognized.map((entry) => entry.field).sort();
    expect(fields).toContain('medId');
    expect(fields).toContain('amount');
    expect(fields).toContain('reason');
    expect(fields).toContain('reasonDescription');
    expect(fields).toContain('requestingInstitution');
    expect(fields).toContain('payerName');
    expect(fields).toContain('payerDetails');
    expect(fields).toContain('transactionAt');
    expect(fields).toContain('merchantName');
  });

  it('nao trata linha de total e de multa como MED', () => {
    // `=SUM(E2:E8)` chega a virar numero se alguem mandar parseAmount nele;
    // rodape tem de sair antes disso, e sem virar erro de linha no relatorio.
    expect(parsed.rows.every((row) => row.medId !== null || row.errors.length > 0)).toBe(true);
    expect(parsed.rows.map((row) => row.medId)).not.toContain(null);
  });

  it('le a primeira linha inteira', () => {
    const row = parsed.rows[0];
    expect(row?.medId).toBe('E00000000202609181529s1699875627');
    expect(row?.amount).toBe(32.8);
    expect(row?.payerName).toBe('Fulano de Tal');
    expect(row?.payerDocument).toBe('11111111111');
    expect(row?.requestingInstitution).toBe('BANCO EXEMPLO S.A.');
    expect(row?.merchantName).toBe('Loja Exemplo LTDA');
    expect(row?.transactionId).toBe('c99b6e44-58fd-4085-94af-433e5ed3f696');
    expect(row?.transactionAt).toBe('2026-09-18T15:30:00.000Z');
    expect(row?.errors).toEqual([]);
  });

  it('traduz os motivos do arquivo', () => {
    const byId = new Map(parsed.rows.map((row) => [row.medId, row]));
    expect(byId.get('E00000000202609181529s1699875627')?.reason).toBe('FRAUD_SCAM');
    expect(byId.get('E000000012026091816409rz2b026ad0')?.reason).toBe('UNRECOGNIZED_TRANSACTION');
    expect(byId.get('E00000002202609191934kPpIWU7SAvh')?.reason).toBe('OTHER');
  });

  it('guarda o relato do comprador, e nao o rotulo da categoria', () => {
    const row = parsed.rows.find((entry) => entry.medId?.endsWith('U5w7yF3JU6S'));
    expect(row?.reasonDescription).toContain('recarga de moedas digital');
  });

  it('relato vazio fica ausente, em vez de virar o texto do motivo', () => {
    const row = parsed.rows.find((entry) => entry.medId?.endsWith('2246702767674'));
    expect(row?.reasonDescription).toBe('Golpe/Estelionato');
  });

  it('linha sem pagador entra assim mesmo: falta dado, nao falta MED', () => {
    const row = parsed.rows.find((entry) => entry.medId?.endsWith('s110e8a67de'));
    expect(row?.payerName).toBeNull();
    expect(row?.amount).toBe(59.99);
    expect(row?.errors).toEqual([]);
  });

  it('nenhuma linha traz data de abertura: o arquivo nao tem a coluna', () => {
    // O operador informa a data de abertura do lote; o sistema nao arbitra uma.
    expect(parsed.rows.every((row) => row.openedAt === null)).toBe(true);
  });
});
