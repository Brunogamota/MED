import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { looksXlsx, readXlsxRows, xlsxToCsv, XlsxError } from '@/lib/xlsx';
import { parseMedImport } from '@/domain/import/csv';

/**
 * Monta um .xlsx de verdade, em vez de usar arquivo binario de fixture: o
 * arquivo da adquirente tem nome e CPF de gente real, e isso nao entra no
 * repositorio. Montar aqui tambem deixa visivel o que cada teste exercita.
 */
function xlsx(files: Record<string, string>): Uint8Array {
  const entradas = Object.entries(files).map(([name, content]) => {
    const nome = Buffer.from(name, 'utf-8');
    const cru = Buffer.from(content, 'utf-8');
    const comprimido = deflateRawSync(cru);
    return { nome, cru, comprimido };
  });

  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let deslocamento = 0;

  for (const { nome, cru, comprimido } of entradas) {
    const crc = crc32(cru);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(cru.length, 22);
    local.writeUInt16LE(nome.length, 26);
    locais.push(local, nome, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(cru.length, 24);
    central.writeUInt16LE(nome.length, 28);
    central.writeUInt32LE(deslocamento, 42);
    centrais.push(central, nome);

    deslocamento += 30 + nome.length + comprimido.length;
  }

  const corpo = Buffer.concat(locais);
  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(corpo.length, 16);

  return new Uint8Array(Buffer.concat([corpo, diretorio, fim]));
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const WORKBOOK = '<workbook><sheets><sheet name="Plan1" sheetId="1" r:id="rId1"/></sheets></workbook>';

function planilha(sheet: string, extras: Record<string, string> = {}): Uint8Array {
  return xlsx({
    '[Content_Types].xml': '<Types/>',
    'xl/workbook.xml': WORKBOOK,
    'xl/worksheets/sheet1.xml': sheet,
    ...extras,
  });
}

function linhas(...rows: string[]): string {
  return `<worksheet><sheetData>${rows.join('')}</sheetData></worksheet>`;
}

function inline(ref: string, texto: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t>${texto}</t></is></c>`;
}

describe('leitor de planilha', () => {
  it('reconhece a planilha pelo conteudo, nao pelo nome do arquivo', () => {
    expect(looksXlsx(planilha(linhas(`<row r="1">${inline('A1', 'x')}</row>`)))).toBe(true);
    expect(looksXlsx(new Uint8Array(Buffer.from('PSP;medId\nx;y')))).toBe(false);
    expect(looksXlsx(new Uint8Array(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])))).toBe(false);
  });

  it('le texto embutido na celula', () => {
    const rows = readXlsxRows(
      planilha(
        linhas(
          `<row r="1">${inline('A1', 'PSP Criador')}${inline('B1', 'Valor')}</row>`,
          `<row r="2">${inline('A2', 'ITAÚ UNIBANCO S.A.')}${inline('B2', '110,98')}</row>`,
        ),
      ),
    );
    expect(rows).toEqual([
      ['PSP Criador', 'Valor'],
      ['ITAÚ UNIBANCO S.A.', '110,98'],
    ]);
  });

  it('le string partilhada pelo indice', () => {
    const rows = readXlsxRows(
      planilha(
        linhas(
          `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>`,
          `<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>42</v></c></row>`,
        ),
        { 'xl/sharedStrings.xml': '<sst><si><t>Nome</t></si><si><t>Valor</t></si></sst>' },
      ),
    );
    expect(rows).toEqual([
      ['Nome', 'Valor'],
      ['Valor', '42'],
    ]);
  });

  it('celula vazia nao desloca a linha', () => {
    // A celula sem valor simplesmente nao aparece no XML. Lendo em sequencia, o
    // "Valor" de C2 cairia na coluna do "Nome Debitado" — cada campo no lugar do
    // vizinho, e um MED com o valor no nome do pagador.
    const rows = readXlsxRows(
      planilha(
        linhas(
          `<row r="1">${inline('A1', 'PSP')}${inline('B1', 'Nome')}${inline('C1', 'Valor')}</row>`,
          `<row r="2">${inline('A2', 'ITAÚ')}${inline('C2', '110,98')}</row>`,
        ),
      ),
    );
    expect(rows.at(1)).toEqual(['ITAÚ', '', '110,98']);
  });

  it('desfaz as entidades do XML, inclusive o E comercial', () => {
    const rows = readXlsxRows(
      planilha(
        linhas(
          `<row r="1">${inline('A1', 'Pagamento transa&#231;&#227;o')}${inline('B1', 'Jo&#227;o &amp; Maria')}${inline('C1', '&lt;tag&gt;')}</row>`,
        ),
      ),
    );
    expect(rows.at(0)).toEqual(['Pagamento transação', 'João & Maria', '<tag>']);
  });

  it('cita o campo que contem o separador, para nao criar coluna', () => {
    // Nome com ponto e virgula partiria a linha em duas colunas, calado.
    const csv = xlsxToCsv(
      planilha(
        linhas(
          `<row r="1">${inline('A1', 'Nome')}${inline('B1', 'Valor')}</row>`,
          `<row r="2">${inline('A2', 'Silva Junior; Antonio')}${inline('B2', '19,90')}</row>`,
        ),
      ),
    );
    expect(csv.split('\n').at(1)).toBe('"Silva Junior; Antonio";19,90');
  });

  it('planilha vazia diz que esta vazia', () => {
    expect(() => xlsxToCsv(planilha(linhas()))).toThrow(XlsxError);
  });

  it('arquivo que nao e planilha recusa com motivo', () => {
    const semAba = xlsx({ 'xl/workbook.xml': WORKBOOK, '[Content_Types].xml': '<Types/>' });
    expect(() => readXlsxRows(semAba)).toThrow(XlsxError);
  });
});

describe('planilha da adquirente ate o leitor de MEDs', () => {
  it('o arquivo que a instituicao manda entra inteiro', () => {
    // Mesmo cabecalho do arquivo real, com dado inventado. Nao ha coluna
    // chamada medId: o identificador sai do formato End-to-End em TRANSACTION ID.
    const sheet = linhas(
      `<row r="1">${inline('A1', 'PSP Criador')}${inline('B1', 'TRANSACTION ID')}${inline('C1', 'Tipo Origem')}${inline('D1', 'Valor')}${inline('E1', 'Nome Debitado')}${inline('F1', 'REFERENCE')}${inline('G1', 'Company')}${inline('H1', 'Customer')}${inline('I1', 'Pagamento transa&#231;&#227;o')}${inline('J1', 'Dados do usu&#225;rio no pedido')}</row>`,
      `<row r="2">${inline('A2', 'ITA&#218; UNIBANCO S.A.')}${inline('B2', 'E60701190202609241408DY52WEUKTAX')}${inline('C2', 'Golpe/Estelionato')}${inline('D2', '89,50')}${inline('E2', 'NOME DE TESTE')}${inline('F2', 'cce58545-c6e3-4fb5-b122-276e85681205')}${inline('G2', 'IronPay')}${inline('H2', 'Loja Teste LTDA')}${inline('I2', '24/09/2026 11:09')}${inline('J2', 'Payer Name: NOME DE TESTE | Payer Document: CPF 00000000191')}</row>`,
    );

    const parsed = parseMedImport(xlsxToCsv(planilha(sheet)));

    expect(parsed.fatalError).toBeNull();
    const row = parsed.rows.at(0);
    expect(row?.errors).toEqual([]);
    expect(row?.medId).toBe('E60701190202609241408DY52WEUKTAX');
    expect(row?.amount).toBe(89.5);
    expect(row?.payerName).toBe('NOME DE TESTE');
    expect(row?.payerDocument).toBe('00000000191');
    expect(row?.requestingInstitution).toBe('ITAÚ UNIBANCO S.A.');
    expect(row?.reason).toBe('FRAUD_SCAM');
    expect(row?.transactionAt).not.toBeNull();
    // A data de abertura do MED nao vem no arquivo, e nao e inventada: quem
    // declara e quem opera, no campo da tela de importacao.
    expect(row?.openedAt).toBeNull();
  });
});
