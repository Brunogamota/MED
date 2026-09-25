import { looksZipped, readZipEntries, ZipError } from '@/lib/zip';

/**
 * Leitor de planilha do Excel, o suficiente para um arquivo de adquirente.
 *
 * Existe porque e nesse formato que a planilha chega. A tela dizia "exporte
 * como CSV antes", e essa frase custa cinco passos fora do sistema — abrir o
 * Excel, Salvar como, escolher o separador, achar o arquivo, voltar — justo no
 * passo em que quem opera acabou de receber o arquivo da instituicao e so quer
 * subir. Pior: o CSV salvo a mao sai com o separador da regiao do computador,
 * que e onde a importacao costuma quebrar depois.
 *
 * Um `.xlsx` e um zip de XML, e o leitor de zip ja existe aqui. Converte para
 * a mesma tabela delimitada que o resto do caminho ja sabe ler, em vez de
 * abrir um segundo caminho de importacao.
 *
 * O que nao faz, de proposito: formula (le o valor guardado, que e o que a
 * planilha mostra), varias abas (le a primeira), formato de data do Excel
 * (numero de serie fica como numero, e o leitor de CSV recusa em vez de
 * adivinhar um dia). Nenhum desses aparece em export de adquirente, e
 * adivinhar daria erro mais dificil de achar que recusar.
 */

export class XlsxError extends Error {}

/** Teto do conteudo descompactado de uma planilha. */
const MAX_UNZIPPED = 64 * 1024 * 1024;

/**
 * `true` quando estes bytes sao uma planilha do Excel.
 *
 * O nome do arquivo nao decide: pela API ele pode chegar sem extensao, e com a
 * extensao errada a planilha cairia no ramo do zip, que procuraria .csv dentro
 * e diria que o export saiu incompleto. Todo OOXML se identifica por dentro,
 * pela parte `xl/workbook.xml`, e e nela que este teste olha.
 */
export function looksXlsx(bytes: Uint8Array): boolean {
  if (!looksZipped(bytes)) return false;
  return Buffer.from(bytes).includes('xl/workbook.xml');
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // `&amp;` por ultimo: antes dele, um `&amp;lt;` viraria `<`.
    .replace(/&amp;/g, '&');
}

/** Junta o texto de todos os `<t>` de uma celula ou de uma string partilhada. */
function textOf(xml: string): string {
  const partes: string[] = [];
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) {
    partes.push(decodeEntities(match[1] ?? ''));
  }
  return partes.join('');
}

/**
 * `A` -> 0, `B` -> 1, `AA` -> 26. Serve para achar a coluna da celula.
 *
 * O indice importa porque celula vazia simplesmente **nao aparece** no XML:
 * ler as celulas em sequencia deslocaria a linha inteira para a esquerda a
 * partir do primeiro vazio, e cada valor cairia na coluna do vizinho.
 */
function columnIndex(reference: string): number {
  const letras = /^([A-Z]+)/.exec(reference.toUpperCase())?.[1] ?? '';
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

function sharedStrings(xml: string): string[] {
  const lista: string[] = [];
  for (const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si(?:\s[^>]*)?\/>/g)) {
    lista.push(textOf(match[1] ?? ''));
  }
  return lista;
}

function cellValue(xml: string, type: string | null, shared: string[]): string {
  if (type === 's') {
    const indice = Number.parseInt(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(xml)?.[1] ?? '', 10);
    return Number.isInteger(indice) ? (shared[indice] ?? '') : '';
  }
  // `inlineStr` guarda o texto na propria celula; `str` e resultado de formula.
  if (type === 'inlineStr' || type === 'str') return textOf(xml);
  const bruto = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(xml)?.[1];
  if (bruto !== undefined) return decodeEntities(bruto);
  // Sem `<v>`, sobra o texto: celula formatada como texto cai aqui.
  return textOf(xml);
}

/** Linhas da primeira aba, cada uma com as celulas na posicao certa. */
export function readXlsxRows(input: Uint8Array): string[][] {
  let entries;
  try {
    entries = readZipEntries(input, MAX_UNZIPPED);
  } catch (error) {
    if (error instanceof ZipError) {
      throw new XlsxError(
        'Não foi possível abrir a planilha. Confira se o arquivo não está corrompido — ' +
          'ou salve como CSV e suba o CSV.',
      );
    }
    throw error;
  }

  const byName = new Map(entries.map((entry) => [entry.name.replace(/^\/+/, ''), entry.bytes]));
  const sheetName = [...byName.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .at(0);
  if (!sheetName) {
    throw new XlsxError('A planilha não tem nenhuma aba de dados que o sistema saiba ler.');
  }

  const sharedEntry = byName.get('xl/sharedStrings.xml');
  const shared = sharedEntry ? sharedStrings(sharedEntry.toString('utf-8')) : [];
  const sheet = (byName.get(sheetName) as Buffer).toString('utf-8');

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>|<row(?:\s[^>]*)?\/>/g)) {
    const corpo = rowMatch[1] ?? '';
    const linha: string[] = [];
    for (const cellMatch of corpo.matchAll(/<c\s([^>]*?)\/>|<c\s([^>]*?)>([\s\S]*?)<\/c>/g)) {
      const atributos = cellMatch[1] ?? cellMatch[2] ?? '';
      const referencia = /\br="([^"]+)"/.exec(atributos)?.[1] ?? '';
      const tipo = /\bt="([^"]+)"/.exec(atributos)?.[1] ?? null;
      const indice = referencia ? columnIndex(referencia) : linha.length;
      while (linha.length < indice) linha.push('');
      linha[indice] = cellValue(cellMatch[3] ?? '', tipo, shared);
    }
    rows.push(linha);
  }
  return rows;
}

/**
 * Planilha -> CSV, para o leitor de CSV seguir daqui sem saber a diferenca.
 *
 * Usa `;` porque o arquivo da adquirente ja vem assim e o detector de
 * separador reconhece os dois; e cita o campo que contem separador, aspas ou
 * quebra de linha, para nao criar coluna onde nao havia. Um nome com virgula
 * ("Silva Junior, Antonio") partiria a linha em duas colunas silenciosamente.
 */
export function xlsxToCsv(input: Uint8Array): string {
  const rows = readXlsxRows(input);
  const usadas = rows.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (usadas.length === 0) throw new XlsxError('A planilha está vazia.');

  return usadas
    .map((row) =>
      row
        .map((cell) => (/[;"\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(';'),
    )
    .join('\n');
}
