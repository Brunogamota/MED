import { looksZipped, readZipEntries, ZipError } from '@/lib/zip';
import { looksXlsx, xlsxToCsv, xlsxToCsvTables, XlsxError } from '@/lib/xlsx';

/**
 * Arquivo enviado → tabelas de texto, para os leitores de CSV.
 *
 * Usado pelas importações do console e pela conta Master, que precisa também
 * do nome de cada arquivo (ele diz de qual empresa a tabela é, quando a
 * planilha não diz).
 */

export interface NamedTable {
  /** Nome do arquivo (ou do arquivo dentro do zip). */
  name: string;
  text: string;
}

/** Byte nulo nao existe em CSV e existe em todo formato binario de planilha. */
function looksBinary(content: string): boolean {
  return content.includes('\u0000');
}

/** Teto do que um zip pode carregar descompactado, por importacao. */
const MAX_UNZIPPED = 32 * 1024 * 1024;

/** Extensoes que valem como tabela dentro de um zip. */
const TABLE_EXTENSIONS = ['.csv', '.tsv', '.txt'];

/**
 * Abre um arquivo enviado como uma lista de textos.
 *
 * Zip vira a lista dos arquivos de dentro; qualquer outro vira uma lista de
 * um. O export do provedor quase sempre chega zipado, e mandar quem opera
 * descompactar antes so acrescenta um passo onde ja da errado.
 *
 * Dentro do zip, o que nao e tabela e ignorado em silencio — README, pasta do
 * macOS, logo. Nao e erro; e o que vem junto.
 */
export async function openAsNamedTexts(
  file: File,
  // Uma tabela por aba diferente: o .xlsx de operação traz "Pedidos" e "Linha
  // do Tempo" como abas do mesmo arquivo. A importação de MEDs lê só o lote.
  { everyTab = false }: { everyTab?: boolean } = {},
): Promise<{ ok: true; tables: NamedTable[] } | { ok: false; error: string }> {
  const lerPlanilha = (planilha: Uint8Array) => (everyTab ? xlsxToCsvTables(planilha) : [xlsxToCsv(planilha)]);
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Antes do zip, e nao depois: um .xlsx **e** um zip, e cairia no ramo de
  // baixo, que procuraria .csv dentro dele e diria que o export saiu
  // incompleto — quando o arquivo esta inteiro e certo.
  if (looksXlsx(bytes)) {
    try {
      return { ok: true, tables: lerPlanilha(bytes).map((text) => ({ name: file.name, text })) };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof XlsxError
            ? error.message
            : `Não foi possível ler a planilha "${file.name}". Salve como CSV e suba o CSV.`,
      };
    }
  }

  if (looksZipped(bytes)) {
    try {
      const tabelas: NamedTable[] = [];
      for (const entry of readZipEntries(bytes, MAX_UNZIPPED)) {
        const nome = entry.name.toLowerCase();
        if (nome.includes('__macosx/') || nome.startsWith('.')) continue;
        // Planilha dentro do zip vira tabela do mesmo jeito: quem zipa o que a
        // instituicao mandou nao devia ter de abrir para converter primeiro.
        if (looksXlsx(entry.bytes)) {
          tabelas.push(...lerPlanilha(entry.bytes).map((text) => ({ name: entry.name, text })));
          continue;
        }
        if (TABLE_EXTENSIONS.some((extensao) => nome.endsWith(extensao))) {
          tabelas.push({ name: entry.name, text: entry.bytes.toString('utf8') });
        }
      }
      if (tabelas.length === 0) {
        return {
          ok: false,
          error: `"${file.name}" não tem nenhuma tabela dentro. Confira se o export saiu completo.`,
        };
      }
      return { ok: true, tables: tabelas };
    } catch (error) {
      if (error instanceof ZipError || error instanceof XlsxError) {
        return { ok: false, error: error.message };
      }
      return { ok: false, error: `Não foi possível abrir "${file.name}".` };
    }
  }

  const content = new TextDecoder('utf-8').decode(bytes);
  if (looksBinary(content)) {
    return {
      ok: false,
      // `.xlsx` ja foi tratado acima. O que sobra aqui e outro binario: .xls
      // antigo, PDF, imagem de print.
      error: `"${file.name}" não é texto nem planilha .xlsx. Salve como CSV e suba o CSV.`,
    };
  }
  return { ok: true, tables: [{ name: file.name, text: content }] };
}

/** O mesmo, só com os textos — o que as importações do console usam. */
export async function openAsTexts(
  file: File,
  options: { everyTab?: boolean } = {},
): Promise<{ ok: true; texts: string[] } | { ok: false; error: string }> {
  const opened = await openAsNamedTexts(file, options);
  return opened.ok ? { ok: true, texts: opened.tables.map((table) => table.text) } : opened;
}
