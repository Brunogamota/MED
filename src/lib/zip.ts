import { inflateRawSync } from 'node:zlib';

/**
 * Leitor de ZIP, o suficiente para um export de provedor.
 *
 * Existe porque o export quase sempre chega zipado, e obrigar quem opera a
 * descompactar antes de subir e transformar um clique em quatro — justo no
 * passo em que a pessoa ja esta perdida. Nao vale uma dependencia nova: o
 * formato e simples e o `zlib` do Node ja faz a unica parte dificil.
 *
 * Le o diretorio central, e nao os cabecalhos locais em sequencia: o local
 * pode declarar tamanho zero e remeter a um descritor depois dos dados, e o
 * diretorio central sempre tem os tamanhos de verdade.
 *
 * O que nao faz, de proposito: ZIP64, arquivo cifrado e metodo de compressao
 * fora de "guardado" e "deflate". Nenhum dos tres aparece em export de
 * planilha, e tentar adivinhar daria erro pior que recusar.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/** Tamanho maximo do comentario final, pelo formato: e onde o EOCD pode estar. */
const MAX_COMMENT = 0xffff;

export interface ZipEntry {
  name: string;
  bytes: Buffer;
}

export class ZipError extends Error {}

/** `true` quando os primeiros bytes sao a assinatura de um ZIP. */
export function looksZipped(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const menor = Math.max(0, buffer.length - MAX_COMMENT - 22);
  for (let posicao = buffer.length - 22; posicao >= menor; posicao -= 1) {
    if (buffer.readUInt32LE(posicao) === EOCD_SIGNATURE) return posicao;
  }
  throw new ZipError('O arquivo .zip está truncado ou não é um zip válido.');
}

/**
 * Devolve os arquivos de dentro do zip, em ordem.
 *
 * `maxBytes` limita o total **descompactado**: um zip de poucos KB pode
 * carregar gigabytes, e o limite do upload sozinho nao protege disso.
 */
export function readZipEntries(input: Uint8Array, maxBytes: number): ZipEntry[] {
  const buffer = Buffer.from(input);
  const eocd = findEndOfCentralDirectory(buffer);
  const total = buffer.readUInt16LE(eocd + 10);
  let posicao = buffer.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  let acumulado = 0;

  for (let indice = 0; indice < total; indice += 1) {
    if (posicao + 46 > buffer.length || buffer.readUInt32LE(posicao) !== CENTRAL_SIGNATURE) {
      throw new ZipError('O índice do .zip está corrompido.');
    }

    const flags = buffer.readUInt16LE(posicao + 8);
    const metodo = buffer.readUInt16LE(posicao + 10);
    const comprimido = buffer.readUInt32LE(posicao + 20);
    const descomprimido = buffer.readUInt32LE(posicao + 24);
    const tamanhoNome = buffer.readUInt16LE(posicao + 28);
    const tamanhoExtra = buffer.readUInt16LE(posicao + 30);
    const tamanhoComentario = buffer.readUInt16LE(posicao + 32);
    const inicioLocal = buffer.readUInt32LE(posicao + 42);
    const name = buffer.toString('utf8', posicao + 46, posicao + 46 + tamanhoNome);

    posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;

    // Pasta: o formato marca com barra no fim e tamanho zero.
    if (name.endsWith('/')) continue;
    if (flags & 0x1) throw new ZipError(`"${name}" está protegido por senha.`);
    if (metodo !== 0 && metodo !== 8) {
      throw new ZipError(`"${name}" usa uma compressão que não é lida aqui.`);
    }

    acumulado += descomprimido;
    if (acumulado > maxBytes) {
      throw new ZipError('O conteúdo do .zip passa do limite permitido para esta importação.');
    }

    if (buffer.readUInt32LE(inicioLocal) !== LOCAL_SIGNATURE) {
      throw new ZipError(`"${name}" não foi encontrado dentro do .zip.`);
    }
    const nomeLocal = buffer.readUInt16LE(inicioLocal + 26);
    const extraLocal = buffer.readUInt16LE(inicioLocal + 28);
    const inicioDados = inicioLocal + 30 + nomeLocal + extraLocal;
    const dados = buffer.subarray(inicioDados, inicioDados + comprimido);

    entries.push({
      name,
      bytes: metodo === 0 ? Buffer.from(dados) : inflateRawSync(dados),
    });
  }

  return entries;
}
