import { describe, expect, it } from 'vitest';
import {
  detectDelimiter,
  parseAmount,
  parseDateTimeBr,
  parseMedImport,
  resolveProductTypeValue,
  resolveReason,
} from '@/domain/import/csv';

describe('parseAmount', () => {
  it('interpreta o formato brasileiro', () => {
    expect(parseAmount('R$ 1.234,56')).toBe(1234.56);
    expect(parseAmount('349,90')).toBe(349.9);
    expect(parseAmount('1.234')).toBe(1234);
  });

  it('interpreta o formato internacional', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('89')).toBe(89);
  });

  it('devolve null quando nao da para interpretar', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('valor a definir')).toBeNull();
  });
});

describe('parseDateTimeBr', () => {
  it('interpreta data brasileira como horario de Brasilia', () => {
    // 10/08/2026 14:32 em -03:00 e 17:32 UTC.
    expect(parseDateTimeBr('10/08/2026 14:32')).toBe('2026-08-10T17:32:00.000Z');
  });

  it('interpreta data sem hora', () => {
    expect(parseDateTimeBr('10/08/2026')).toBe('2026-08-10T03:00:00.000Z');
  });

  it('respeita o offset quando o proprio valor traz um', () => {
    expect(parseDateTimeBr('2026-08-10T17:32:00Z')).toBe('2026-08-10T17:32:00.000Z');
  });

  it('rejeita data inexistente em vez de deslizar para o mes seguinte', () => {
    expect(parseDateTimeBr('31/02/2026')).toBeNull();
  });

  it('rejeita texto que nao e data', () => {
    expect(parseDateTimeBr('ontem')).toBeNull();
    expect(parseDateTimeBr('')).toBeNull();
  });
});

describe('resolveReason', () => {
  it('reconhece os motivos mais comuns em portugues', () => {
    expect(resolveReason('Nao reconhece a transacao').reason).toBe('UNRECOGNIZED_TRANSACTION');
    expect(resolveReason('Produto nao recebido').reason).toBe('PRODUCT_NOT_RECEIVED');
    expect(resolveReason('Golpe').reason).toBe('FRAUD_SCAM');
  });

  it('aceita o proprio valor do enum', () => {
    expect(resolveReason('PRODUCT_NOT_RECEIVED')).toEqual({
      reason: 'PRODUCT_NOT_RECEIVED',
      description: null,
    });
  });

  it('preserva o texto original quando o motivo e desconhecido', () => {
    const resolved = resolveReason('Contestacao categoria 7-B');
    expect(resolved.reason).toBe('OTHER');
    expect(resolved.description).toBe('Contestacao categoria 7-B');
  });
});

describe('resolveProductTypeValue', () => {
  it('reconhece descricoes em portugues', () => {
    expect(resolveProductTypeValue('Produto fisico')).toBe('PHYSICAL');
    expect(resolveProductTypeValue('infoproduto')).toBe('INFOPRODUCT');
  });

  it('deixa ausente o que nao reconhece, em vez de chutar', () => {
    expect(resolveProductTypeValue('categoria 9')).toBeNull();
    expect(resolveProductTypeValue('')).toBeNull();
  });
});

describe('detectDelimiter', () => {
  it('reconhece o ponto e virgula do Excel brasileiro', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });
});

describe('parseMedImport', () => {
  const csv = [
    'MED ID;Valor;Data da compra;Data abertura;Prazo;Motivo;Nome do cliente;CPF;E-mail;Instituição;Tipo de produto',
    'MED-001;R$ 349,90;10/08/2026 14:32;20/08/2026;05/09/2026;Produto não recebido;Maria Souza;123.456.789-09;maria@example.com;Banco Exemplo;Produto físico',
    'MED-002;89,90;15/08/2026 09:15;22/08/2026;07/09/2026;Não reconhece a transação;João Lima;98765432100;joao@example.com;Banco Exemplo;Infoproduto',
  ].join('\n');

  it('reconhece cabecalhos em portugues com acento', () => {
    const parsed = parseMedImport(csv);
    expect(parsed.fatalError).toBeNull();
    expect(parsed.recognized.map((entry) => entry.field)).toContain('medId');
    expect(parsed.recognized.map((entry) => entry.field)).toContain('payerDocument');
    expect(parsed.ignored).toEqual([]);
  });

  it('normaliza cada linha sem inventar nada', () => {
    const parsed = parseMedImport(csv);
    const [first, second] = parsed.rows;

    expect(first?.medId).toBe('MED-001');
    expect(first?.amount).toBe(349.9);
    expect(first?.transactionAt).toBe('2026-08-10T17:32:00.000Z');
    expect(first?.reason).toBe('PRODUCT_NOT_RECEIVED');
    expect(first?.productType).toBe('PHYSICAL');
    expect(first?.payerDocument).toBe('123.456.789-09');
    expect(first?.errors).toEqual([]);

    expect(second?.reason).toBe('UNRECOGNIZED_TRANSACTION');
    expect(second?.productType).toBe('INFOPRODUCT');
  });

  it('reporta a linha com valor ilegivel em vez de importa-la', () => {
    const parsed = parseMedImport(
      'MED ID;Valor\nMED-003;a combinar',
    );
    expect(parsed.rows[0]?.errors.some((error) => error.includes('nao pode ser interpretado'))).toBe(
      true,
    );
  });

  it('reporta a linha sem valor', () => {
    const parsed = parseMedImport('MED ID;Valor\nMED-004;');
    expect(parsed.rows[0]?.errors).toContain('Valor ausente.');
  });

  it('falha o arquivo inteiro quando nao ha coluna de identificador', () => {
    const parsed = parseMedImport('Coluna A;Coluna B\n1;2');
    expect(parsed.fatalError).toContain('identificador do MED');
    expect(parsed.rows).toEqual([]);
  });

  it('lista as colunas que nao soube mapear, em vez de encaixa-las a forca', () => {
    const parsed = parseMedImport('MED ID;Valor;Coluna Estranha\nMED-005;10,00;xyz');
    expect(parsed.ignored).toEqual(['Coluna Estranha']);
  });

  it('nao inventa data de abertura quando a coluna nao existe', () => {
    const parsed = parseMedImport('MED ID;Valor\nMED-006;10,00');
    expect(parsed.rows[0]?.openedAt).toBeNull();
    expect(parsed.rows[0]?.errors).toEqual([]);
  });

  it('aceita campos entre aspas com o separador dentro', () => {
    const parsed = parseMedImport(
      'MED ID,Valor,Nome do cliente\nMED-007,"1.234,56","Souza, Maria"',
    );
    expect(parsed.rows[0]?.amount).toBe(1234.56);
    expect(parsed.rows[0]?.payerName).toBe('Souza, Maria');
  });
});
