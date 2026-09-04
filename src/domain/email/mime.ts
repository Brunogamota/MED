/**
 * Leitura de mensagem RFC 822, o suficiente para ler um aviso de MED.
 *
 * Nao e uma biblioteca de e-mail. Faz tres coisas que um aviso real exige, e
 * que foram descobertas lendo um: decodificar quoted-printable, decodificar
 * assunto em RFC 2047, e escolher a parte `text/plain` de um multipart.
 *
 * Puro: entra texto, sai texto. Sem I/O, sem rede, sem relogio.
 */

/**
 * Quoted-printable -> bytes -> texto.
 *
 * Duas armadilhas, as duas presentes no primeiro aviso que lemos:
 *
 * 1. `=C3=A7` e um caractere de dois bytes. Decodificar par a par para string
 *    quebraria o UTF-8 no meio; por isso montamos os bytes primeiro e so
 *    depois decodificamos tudo de uma vez.
 * 2. `=` no fim da linha e quebra **suave**: ela nao existe no texto original.
 *    O aviso trazia `28/08/202=\n6`, que e `28/08/2026`. Casar a data antes de
 *    juntar as duas metades daria o ano errado — ou nenhuma data.
 */
export function decodeQuotedPrintable(input: string, charset = 'utf-8'): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] as string;
    if (char !== '=') {
      // O texto de origem e ASCII fora das sequencias `=XX`; charCodeAt basta.
      bytes.push(char.charCodeAt(0));
      continue;
    }
    const next = input.slice(i + 1, i + 3);
    if (next === '\r\n' || next[0] === '\n') {
      i += next[0] === '\r' ? 2 : 1; // quebra suave: some
      continue;
    }
    if (/^[0-9A-Fa-f]{2}$/.test(next)) {
      bytes.push(Number.parseInt(next, 16));
      i += 2;
      continue;
    }
    // `=` solto nao e sequencia valida; preservamos em vez de descartar.
    bytes.push(char.charCodeAt(0));
  }
  return decodeBytes(Uint8Array.from(bytes), charset);
}

/** Base64 -> bytes -> texto, para partes e para RFC 2047. */
export function decodeBase64(input: string, charset = 'utf-8'): string {
  const clean = input.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return decodeBytes(bytes, charset);
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  const label = charset.toLowerCase().replace(/^"|"$/g, '');
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    // Charset que este runtime nao conhece: latin1 nunca falha e preserva os
    // bytes, o que e melhor do que devolver vazio e fingir que nao havia texto.
    return new TextDecoder('iso-8859-1').decode(bytes);
  }
}

/**
 * Palavras codificadas de cabecalho (RFC 2047): `=?UTF-8?B?...?=`.
 *
 * Duas palavras codificadas coladas por espaco em branco sao um valor so — o
 * espaco entre elas e artefato do dobramento de linha e some. Espaco entre
 * palavra codificada e texto comum, esse fica.
 */
export function decodeEncodedWords(input: string): string {
  const pattern = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;
  let result = '';
  let lastEnd = 0;
  let previousWasEncoded = false;

  for (const match of input.matchAll(pattern)) {
    const start = match.index ?? 0;
    const between = input.slice(lastEnd, start);
    // Espaco entre duas palavras codificadas nao faz parte do texto.
    if (!(previousWasEncoded && between.trim() === '')) result += between;

    const [, charset = 'utf-8', encoding = 'B', payload = ''] = match;
    result +=
      encoding.toUpperCase() === 'B'
        ? decodeBase64(payload, charset)
        : // Em Q, `_` representa espaco. Fora isso, e quoted-printable.
          decodeQuotedPrintable(payload.replace(/_/g, ' '), charset);

    lastEnd = start + match[0].length;
    previousWasEncoded = true;
  }
  return result + input.slice(lastEnd);
}

export interface ParsedMessage {
  /** Cabecalhos em minusculas, ja desdobrados e decodificados. */
  headers: Map<string, string>;
  /** Corpo em `text/plain`, decodificado. Vazio quando a mensagem nao tem um. */
  text: string;
}

/** Desdobra continuacao de cabecalho (linha que comeca com espaco ou tab). */
function unfold(headerBlock: string): string[] {
  const lines: string[] = [];
  for (const line of headerBlock.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.replace(/^[ \t]+/, ' ');
    } else {
      lines.push(line);
    }
  }
  return lines.filter((line) => line.length > 0);
}

function splitHeadersAndBody(raw: string): { head: string; body: string } {
  const separator = raw.search(/\r?\n\r?\n/);
  if (separator === -1) return { head: raw, body: '' };
  const match = /\r?\n\r?\n/.exec(raw.slice(separator));
  return {
    head: raw.slice(0, separator),
    body: raw.slice(separator + (match?.[0].length ?? 2)),
  };
}

function parseHeaders(head: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of unfold(head)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    // Primeiro vence: `Received` e outros repetem, e o de cima e o mais recente.
    if (!headers.has(name)) headers.set(name, decodeEncodedWords(line.slice(colon + 1).trim()));
  }
  return headers;
}

function parameterOf(value: string | undefined, name: string): string | null {
  if (!value) return null;
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, 'i').exec(value);
  return match?.[2] ?? match?.[1] ?? null;
}

function decodeBody(body: string, encoding: string | null, charset: string): string {
  const kind = encoding?.trim().toLowerCase();
  if (kind === 'quoted-printable') return decodeQuotedPrintable(body, charset);
  if (kind === 'base64') return decodeBase64(body, charset);
  return body;
}

/**
 * A mensagem, com o corpo em texto puro.
 *
 * Em `multipart/alternative` escolhemos `text/plain`, e nao `text/html`: o
 * mesmo conteudo, sem marcacao para atrapalhar o casamento de rotulo. Se so
 * houver HTML, devolvemos vazio — inventar um texto a partir de tags seria
 * adivinhar onde termina cada campo.
 */
export function parseMessage(raw: string): ParsedMessage {
  const { head, body } = splitHeadersAndBody(raw);
  const headers = parseHeaders(head);
  const contentType = headers.get('content-type') ?? 'text/plain';
  const boundary = parameterOf(contentType, 'boundary');

  if (!boundary) {
    const charset = parameterOf(contentType, 'charset') ?? 'utf-8';
    const text = /text\/plain/i.test(contentType)
      ? decodeBody(body, headers.get('content-transfer-encoding') ?? null, charset)
      : '';
    return { headers, text };
  }

  for (const part of body.split(`--${boundary}`)) {
    const trimmed = part.replace(/^\r?\n/, '');
    if (trimmed.startsWith('--') || trimmed.trim() === '') continue;
    const parsed = splitHeadersAndBody(trimmed);
    const partHeaders = parseHeaders(parsed.head);
    const partType = partHeaders.get('content-type') ?? '';
    if (!/text\/plain/i.test(partType)) continue;
    return {
      headers,
      text: decodeBody(
        parsed.body,
        partHeaders.get('content-transfer-encoding') ?? null,
        parameterOf(partType, 'charset') ?? 'utf-8',
      ),
    };
  }

  return { headers, text: '' };
}
