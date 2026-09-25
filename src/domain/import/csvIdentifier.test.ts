import { describe, expect, it } from 'vitest';
import { matchColumn, matchWeakColumn, parseMedImport } from '@/domain/import/csv';

/**
 * O identificador do MED e o que amarra o caso a transacao contestada. Errar a
 * coluna dele nao produz um campo ruim: produz um caso que nao aponta para
 * transacao nenhuma, com numero que colide com o do proximo arquivo.
 */

const E2E_A = 'E18236120202609220604s1415b933c2';
const E2E_B = 'E9040088820260922104470415645487';

describe('coluna do identificador do MED', () => {
  it('numero de linha nao vira numero do MED quando ha coluna de End-to-End', () => {
    // Cabecalho do export do lojista: `id` e a chave da tabela dele.
    const csv = [
      'id,purchase_at,amount_brl,customer_name,customer_email,psp,tipo_origem,txn_id',
      `10,2026-09-22 03:04:33,34.80,Fulano de Tal,fulano@example.com,NU PAGAMENTOS S.A.,Golpe/Estelionato,${E2E_A}`,
      `9,2026-09-22 03:08:25,12.90,Beltrano Silva,beltrano@example.com,ITAÚ UNIBANCO S.A.,Transação não autorizada,${E2E_B}`,
    ].join('\n');

    const parsed = parseMedImport(csv);

    expect(parsed.fatalError).toBeNull();
    expect(parsed.rows.map((row) => row.medId)).toEqual([E2E_A, E2E_B]);
    // A coluna aparece no mapeamento, para o operador ver de onde saiu.
    expect(parsed.recognized).toEqual(
      expect.arrayContaining([{ header: 'txn_id', field: 'medId' }]),
    );
  });

  it('o resto da linha do export do lojista entra junto', () => {
    const csv = [
      'id,created_at,purchase_at,amount_brl,customer_name,customer_email,psp,tipo_origem,txn_id',
      `10,2026-09-22 03:04:38,2026-09-22 03:04:33,34.80,Fulano de Tal,fulano@example.com,NU PAGAMENTOS S.A.,Golpe/Estelionato,${E2E_A}`,
    ].join('\n');

    const parsed = parseMedImport(csv);
    const row = parsed.rows.at(0);

    expect(row?.errors).toEqual([]);
    expect(row?.amount).toBe(34.8);
    expect(row?.payerName).toBe('Fulano de Tal');
    expect(row?.payerEmail).toBe('fulano@example.com');
    expect(row?.requestingInstitution).toBe('NU PAGAMENTOS S.A.');
    expect(row?.transactionAt).not.toBeNull();
    // `created_at` e a hora em que a linha nasceu no banco do lojista, nao a
    // abertura do MED. Preencher `openedAt` com ela seria afirmar uma data que
    // ninguem declarou.
    expect(parsed.ignored).toContain('created_at');
    expect(row?.openedAt).toBeNull();
  });

  it('coluna `id` ainda serve quando e a unica que identifica', () => {
    const csv = ['id,valor,motivo', 'MED-2026-0001,34.80,Golpe/Estelionato'].join('\n');

    const parsed = parseMedImport(csv);

    expect(parsed.fatalError).toBeNull();
    expect(parsed.rows.at(0)?.medId).toBe('MED-2026-0001');
    expect(parsed.recognized).toEqual(expect.arrayContaining([{ header: 'id', field: 'medId' }]));
  });

  it('coluna propria de MED ganha da coluna de End-to-End', () => {
    const csv = [
      `medId,txn_id,valor`,
      `MED-2026-0001,${E2E_A},34.80`,
    ].join('\n');

    const parsed = parseMedImport(csv);

    expect(parsed.rows.at(0)?.medId).toBe('MED-2026-0001');
    expect(parsed.rows.at(0)?.transactionId).toBe(E2E_A);
  });

  it('coluna de identificador fora do formato End-to-End nao e promovida', () => {
    const csv = ['id,txn_id,valor', '1,txn_9f3a11,34.80', '2,txn_4b0c92,12.90'].join('\n');

    const parsed = parseMedImport(csv);

    // Sem End-to-End em toda linha, `id` volta a valer — e o que sobrou.
    expect(parsed.rows.map((row) => row.medId)).toEqual(['1', '2']);
  });

  it('uma linha fora do formato basta para nao promover a coluna', () => {
    const csv = [
      'id,txn_id,valor',
      `1,${E2E_A},34.80`,
      '2,pendente,12.90',
    ].join('\n');

    const parsed = parseMedImport(csv);

    expect(parsed.rows.map((row) => row.medId)).toEqual(['1', '2']);
  });

  it('`id` fica fora do reconhecimento por nome, e so entra como reserva', () => {
    expect(matchColumn('id')).toBeNull();
    expect(matchWeakColumn('id')).toBe('medId');
    expect(matchColumn('medId')).toBe('medId');
    expect(matchColumn('txn_id')).toBe('transactionId');
  });
});
