import { describe, expect, it } from 'vitest';
import { parseMedImport } from '@/domain/import/csv';
import { planImport, toCreateMedInput } from '@/services/importService';

/**
 * A conferencia e o plano tem de dar a mesma resposta que a importacao. Quando
 * divergem, a tela promete um lote que o sistema depois recusa — e quem opera
 * vai embora achando que entrou.
 */

const E2E = 'E60701190202609241408DY52WEUKTAX';

/** Cabecalho do arquivo da adquirente: nenhuma coluna de data de abertura. */
const ARQUIVO = [
  'PSP Criador;TRANSACTION ID;Tipo Origem;Valor;Nome Debitado;Pagamento transação',
  `ITAÚ UNIBANCO S.A.;${E2E};Golpe/Estelionato;89,50;NOME DE TESTE;24/09/2026 11:09`,
].join('\n');

describe('plano da importacao', () => {
  it('sem data de abertura declarada, a linha entra assim mesmo', () => {
    const parsed = parseMedImport(ARQUIVO);

    expect(parsed.fatalError).toBeNull();
    expect(parsed.rows.at(0)?.errors).toEqual([]);

    // A data de abertura nao vem no arquivo da instituicao, e exigi-la recusava
    // o lote inteiro. O caso entra sem ela; o que falta e reportado no caso, e
    // nao usado para descartar o resto da linha.
    const plan = planImport(parsed, {});
    expect(plan.ready).toBe(1);
    expect(plan.blocked).toBe(0);
  });

  it('a data ausente nao vira data nenhuma, em lugar nenhum do caso', () => {
    // O ponto de deixar entrar sem a data e que ela continue faltando. Um
    // default aqui poria na linha do tempo, na narrativa e no relatorio uma
    // abertura que nao aconteceu — que e o oposto do que este produto faz.
    const parsed = parseMedImport(ARQUIVO);
    expect(parsed.fatalError).toBeNull();
    const row = parsed.rows.at(0);
    expect(row?.openedAt).toBeNull();
    if (!row) throw new Error('arquivo de teste sem linha');

    const built = toCreateMedInput(row, {});
    expect('errors' in built).toBe(false);
    if (!('errors' in built)) expect(built.input.openedAt).toBeNull();
  });

  it('com data de abertura declarada, a linha esta pronta', () => {
    const plan = planImport(parseMedImport(ARQUIVO), {
      defaultOpenedAt: '2026-09-25T12:00:00.000Z',
    });
    expect(plan.ready).toBe(1);
    expect(plan.blocked).toBe(0);
    expect(plan.lines.at(0)?.messages).toEqual([]);
  });

  it('a data que vem no proprio arquivo dispensa a do lote', () => {
    const comData = [
      'medId;Valor;Motivo;Data abertura',
      'MED-1;89,50;Golpe/Estelionato;24/09/2026 11:09',
    ].join('\n');

    const plan = planImport(parseMedImport(comData), {});
    expect(plan.ready).toBe(1);
  });

  it('erro de leitura continua barrando, com o motivo da leitura', () => {
    const valorIlegivel = [
      'medId;Valor;Motivo',
      'MED-1;R$ mil reais;Golpe/Estelionato',
    ].join('\n');

    const plan = planImport(parseMedImport(valorIlegivel), {
      defaultOpenedAt: '2026-09-25T12:00:00.000Z',
    });
    expect(plan.ready).toBe(0);
    expect(plan.lines.at(0)?.messages.join(' ')).toMatch(/valor/i);
  });

  it('linha pronta e linha barrada convivem no mesmo lote', () => {
    const misto = [
      'medId;Valor;Motivo;Data abertura',
      'MED-1;89,50;Golpe/Estelionato;24/09/2026 11:09',
      'MED-2;R$ mil reais;Golpe/Estelionato;24/09/2026 11:09',
    ].join('\n');

    const plan = planImport(parseMedImport(misto), {});
    expect(plan.ready).toBe(1);
    expect(plan.blocked).toBe(1);
    expect(plan.lines.find((entry) => entry.line === 2)?.ready).toBe(true);
    expect(plan.lines.find((entry) => entry.line === 3)?.ready).toBe(false);
  });
});
