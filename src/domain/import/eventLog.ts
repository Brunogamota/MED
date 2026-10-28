import { detectDelimiter, normalizeHeader, parseDelimited, resolveProductTypeValue } from '@/domain/import/csv';
import { isEventPhrase, parseLogTimestamp } from '@/domain/import/deliveryLog';
import { personEmail, personName } from '@/domain/person';

export { isEventPhrase };
import type { ProductType, ShipmentStatus } from '@/domain/types';

/**
 * Planilhas de operação da Arks: "Pedidos" e "Eventos".
 *
 * - **Pedidos**: uma linha por MED. É a fonte da quantidade de MEDs e dos
 *   dados do pedido (número, natureza físico/digital, canal/distribuidor, id no
 *   fornecedor).
 * - **Eventos**: o histórico do pedido. O MESMO MED aparece em várias linhas —
 *   "Pagamento confirmado", "Pedido recebido", "Em preparação", "Pedido
 *   transmitido ao fornecedor internacional"… Conta-se MED distinto, nunca
 *   linha: quatro linhas de evento são um MED com quatro marcos.
 *
 * Cada evento vira marco do acompanhamento do pedido com a data dele. Evento
 * sem data não vira marco — marco sem data não é afirmação.
 */

export interface PedidoRow {
  line: number;
  medRef: string;
  pedido: string | null;
  natureza: ProductType | null;
  statusAtual: string | null;
  distribuidor: string | null;
  idNoFornecedor: string | null;
  email: string | null;
  /** Quando a etapa atual foi registrada ("Atualizado em"). Sem data, não é marco. */
  atualizadoEm: string | null;
  /** "Atualizado em" como veio, para o relatório dizer o que não deu para ler. */
  atualizadoEmBruto: string | null;
  /** Nome de quem comprou, quando a planilha traz (já validado como nome de pessoa). */
  nome: string | null;
  /** Link do pedido no painel da loja ("Console do Pedido"). */
  url: string | null;
}

export interface EventoRow {
  line: number;
  medRef: string;
  pedido: string | null;
  evento: string;
  occurredAt: string | null;
  /** Texto da data como veio, quando não deu para ler. */
  rawOccurredAt: string | null;
  canal: string | null;
  codigo: string | null;
  url: string | null;
  observacao: string | null;
  distribuidor: string | null;
  idExterno: string | null;
  refFornecedor: string | null;
  nome: string | null;
  email: string | null;
}

const MED_HEADERS = ['idmed', 'medid', 'iddomed', 'med', 'numerodomed', 'endtoendid', 'endtoend', 'e2e', 'e2eid', 'idendtoend'];
/** Número do pedido na loja: "Pedido", "Pedido Bulls", "Nº do pedido"… — nunca o do parceiro. */
const PEDIDO = (header: string) =>
  ['pedido', 'iddopedido', 'numerodopedido', 'idpedido', 'order', 'orderid'].includes(header) ||
  (header.startsWith('pedido') && !/extern|fornecedor|parceiro/.test(header));
/** Tipo do produto: "Natureza", "Classificação", "Tipo do produto". */
const NATUREZA_HEADERS = ['natureza', 'classificacao', 'tipodoproduto', 'tipoproduto'];
/** Etapa atual do pedido, numa linha por MED. */
const STATUS_ATUAL_HEADERS = ['statusatualdopedido', 'etapaatual', 'statusdopedido'];
const EVENTO_HEADERS = ['evento', 'etapa', 'descricaodoevento', 'nomedoevento'];
const DATA_EVENTO = (header: string) =>
  header.startsWith('datahoradoevento') ||
  ['dataevento', 'datadoevento', 'datahoraevento', 'datahora', 'data', 'registradoem', 'ocorridoem'].includes(header);

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function table(text: string): { headers: string[]; rows: string[][] } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const all = parseDelimited(trimmed, detectDelimiter(trimmed));
  const [first, ...rest] = all;
  if (!first) return null;
  return { headers: first.map(normalizeHeader), rows: rest };
}

const E2E = /^E[0-9A-Za-z]{31}$/;

function share(rows: string[][], index: number, test: (value: string) => boolean): number {
  const filled = rows
    .map((row) => row[index]?.trim() ?? '')
    .filter((value) => value.length > 0)
    .slice(0, 50);
  if (filled.length === 0) return 0;
  return filled.filter(test).length / filled.length;
}

/**
 * Onde estão o MED, o evento e a data. Primeiro pelo cabeçalho; o que o
 * cabeçalho não disser, o conteúdo diz — a planilha não precisa seguir nome
 * de coluna nenhum.
 */
function eventColumns(parsed: { headers: string[]; rows: string[][] }): {
  med: number;
  evento: number;
  data: number;
} {
  const { headers, rows } = parsed;
  const colunas = headers.map((_, index) => index);
  let med = headerIndex(headers, MED_HEADERS);
  if (med === -1) med = colunas.find((i) => share(rows, i, (v) => E2E.test(v)) >= 0.6) ?? -1;
  let evento = headerIndex(headers, EVENTO_HEADERS);
  if (evento === -1) {
    evento = colunas.find((i) => i !== med && share(rows, i, isEventPhrase) >= 0.6) ?? -1;
  }
  const porNome = headers.findIndex(DATA_EVENTO);
  let data = porNome;
  if (data === -1 || share(rows, data, (v) => parseLogTimestamp(v) !== null) < 0.6) {
    // A coluna que o cabeçalho diz ser a data, mesmo ilegível, continua sendo
    // a data: a planilha é reconhecida e o relatório mostra o valor que não
    // deu para ler, em vez de a aba inteira sumir sem explicação.
    data =
      colunas.find(
        (i) => i !== med && i !== evento && share(rows, i, (v) => parseLogTimestamp(v) !== null) >= 0.6,
      ) ?? porNome;
  }
  return { med, evento, data };
}

/**
 * A aba de Eventos: o MED, o nome do evento e a data do evento. E o MED se
 * repete — é histórico, uma linha por etapa.
 */
export function isEventLog(text: string): boolean {
  const parsed = table(text);
  if (!parsed) return false;
  const { med, evento, data } = eventColumns(parsed);
  if (med === -1 || evento === -1 || data === -1) return false;
  return share(parsed.rows, evento, isEventPhrase) >= 0.5 || headerIndex(parsed.headers, EVENTO_HEADERS) !== -1;
}

/** A aba de Pedidos: ID do MED com os dados do pedido, sem coluna de evento. */
/** Coluna do MED: pelo cabeçalho, ou pela coluna cheia de end-to-end. */
function medColumn(parsed: { headers: string[]; rows: string[][] }): number {
  const porNome = headerIndex(parsed.headers, MED_HEADERS);
  if (porNome !== -1) return porNome;
  return parsed.headers.findIndex((_, i) => share(parsed.rows, i, (v) => E2E.test(v)) >= 0.6);
}

const NOME_HEADERS = [
  'comprador', 'compradora', 'cliente', 'nome', 'nomedocliente', 'nomedocomprador', 'nomecompleto',
  'destinatario', 'titular', 'nomedopagador', 'pagador', 'nomecliente', 'customername', 'name',
];

/**
 * Onde estão o nome e o e-mail de quem comprou. Pelo cabeçalho quando o
 * conteúdo confirma; senão, pela coluna que de fato tem nomes de pessoa ou
 * e-mails. Assim a planilha não precisa seguir nome de coluna nenhum.
 */
function peopleColumns(parsed: { headers: string[]; rows: string[][] }, skip: number[]): {
  nome: number;
  email: number;
} {
  const { headers, rows } = parsed;
  const colunas = headers.map((_, i) => i).filter((i) => !skip.includes(i));
  const ehEmail = (v: string) => personEmail(v) !== null;
  const ehNome = (v: string) => personName(v) !== null;

  let email = colunas.find(
    (i) => /email|contato/.test(headers[i] ?? '') && share(rows, i, ehEmail) >= 0.5,
  );
  if (email === undefined) email = colunas.find((i) => share(rows, i, ehEmail) >= 0.6);

  let nome = colunas.find(
    (i) => i !== email &&
      (NOME_HEADERS.includes(headers[i] ?? '') || /nome|cliente|compr|titular|destinat|pagador/.test(headers[i] ?? '')) &&
      share(rows, i, ehNome) >= 0.5,
  );
  if (nome === undefined) {
    // Sem cabeçalho que diga: a coluna com mais nomes de pessoa (duas
    // palavras ou mais), desde que seja a maioria das linhas.
    let melhor = { i: -1, nota: 0 };
    for (const i of colunas) {
      if (i === email) continue;
      // Nome de comprador muda de um caso para outro; coluna com o mesmo
      // valor em tudo ("Parceiro X") é outra coisa.
      const distintos = new Set(rows.map((row) => row[i]?.trim()).filter(Boolean)).size;
      if (distintos < 2) continue;
      const nota = share(rows, i, (v) => ehNome(v) && v.trim().includes(' '));
      if (nota > melhor.nota) melhor = { i, nota };
    }
    if (melhor.nota >= 0.6) nome = melhor.i;
  }
  return { nome: nome ?? -1, email: email ?? -1 };
}

export function isPedidosFile(text: string): boolean {
  const parsed = table(text);
  if (!parsed) return false;
  const { headers } = parsed;
  return (
    medColumn(parsed) !== -1 &&
    headerIndex(headers, EVENTO_HEADERS) === -1 &&
    (headerIndex(headers, NATUREZA_HEADERS) !== -1 ||
      headerIndex(headers, STATUS_ATUAL_HEADERS) !== -1)
  );
}

function cell(row: string[], index: number): string | null {
  if (index < 0) return null;
  const value = row[index]?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export function parseEventLog(text: string): EventoRow[] {
  const parsed = table(text);
  if (!parsed) return [];
  const h = parsed.headers;
  const base = eventColumns(parsed);
  const conhecidas = {
    pedido: h.findIndex(PEDIDO),
    canal: headerIndex(h, ['canal', 'modulo']),
    codigo: headerIndex(h, ['codigodoevento', 'codigo']),
    url: headerIndex(h, ['urloperacional', 'url', 'recurso', 'link']),
    observacao: headerIndex(h, ['observacao', 'obs', 'detalhe', 'detalhes']),
    distribuidor: headerIndex(h, ['canaldistribuidor', 'distribuidor', 'parceiro', 'parceirodeorigem']),
    idExterno: headerIndex(h, ['idexternodopedido', 'idexterno', 'pedidoexterno']),
    refFornecedor: headerIndex(h, ['referenciadofornecedor', 'refparceiro', 'referenciadoparceiro']),
  };
  const pessoas = peopleColumns(parsed, [base.med, base.evento, base.data, ...Object.values(conhecidas)]);
  const at = {
    ...base,
    ...pessoas,
    pedido: h.findIndex(PEDIDO),
    canal: headerIndex(h, ['canal', 'modulo']),
    codigo: headerIndex(h, ['codigodoevento', 'codigo']),
    url: headerIndex(h, ['urloperacional', 'url', 'recurso', 'link']),
    observacao: headerIndex(h, ['observacao', 'obs', 'detalhe', 'detalhes']),
    distribuidor: headerIndex(h, ['canaldistribuidor', 'distribuidor', 'parceiro', 'parceirodeorigem']),
    idExterno: headerIndex(h, ['idexternodopedido', 'idexterno', 'pedidoexterno']),
    refFornecedor: headerIndex(h, ['referenciadofornecedor', 'refparceiro', 'referenciadoparceiro']),
  };
  return parsed.rows
    .map((row, index) => {
      const medRef = cell(row, at.med);
      const evento = cell(row, at.evento);
      if (!medRef || !evento) return null;
      const rawOccurredAt = cell(row, at.data);
      return {
        line: index + 2,
        medRef,
        pedido: cell(row, at.pedido),
        evento,
        occurredAt: rawOccurredAt ? parseLogTimestamp(rawOccurredAt) : null,
        rawOccurredAt,
        canal: cell(row, at.canal),
        codigo: cell(row, at.codigo),
        url: cell(row, at.url),
        observacao: cell(row, at.observacao),
        distribuidor: cell(row, at.distribuidor),
        idExterno: cell(row, at.idExterno),
        refFornecedor: cell(row, at.refFornecedor),
        nome: personName(cell(row, at.nome)),
        email: personEmail(cell(row, at.email)),
      } satisfies EventoRow;
    })
    .filter((row): row is EventoRow => row !== null);
}

export function parsePedidos(text: string): PedidoRow[] {
  const parsed = table(text);
  if (!parsed) return [];
  const h = parsed.headers;
  const at = {
    med: medColumn(parsed),
    pedido: h.findIndex(PEDIDO),
    natureza: headerIndex(h, NATUREZA_HEADERS),
    status: headerIndex(h, STATUS_ATUAL_HEADERS),
    distribuidor: headerIndex(h, ['canaldistribuidor', 'distribuidor', 'parceirodeorigem', 'parceiro']),
    idNoFornecedor: headerIndex(h, ['iddopedidonofornecedor', 'pedidoexterno', 'idexterno']),
    ...peopleColumns(parsed, [medColumn(parsed)]),
    atualizadoEm: headerIndex(h, ['atualizadoem', 'ultimaatualizacao', 'datadaetapa', 'dataetapaatual']),
    url: h.findIndex((header) => header.startsWith('console') || ['urldopedido', 'linkdopedido', 'url'].includes(header)),
  };
  return parsed.rows
    .map((row, index) => {
      const medRef = cell(row, at.med);
      if (!medRef) return null;
      return {
        line: index + 2,
        medRef,
        pedido: cell(row, at.pedido),
        natureza: resolveProductTypeValue(cell(row, at.natureza) ?? ''),
        statusAtual: cell(row, at.status),
        distribuidor: cell(row, at.distribuidor),
        idNoFornecedor: cell(row, at.idNoFornecedor),
        email: personEmail(cell(row, at.email)),
        nome: personName(cell(row, at.nome)),
        atualizadoEm: (() => {
          const bruto = cell(row, at.atualizadoEm);
          return bruto ? parseLogTimestamp(bruto) : null;
        })(),
        atualizadoEmBruto: cell(row, at.atualizadoEm),
        url: cell(row, at.url),
      } satisfies PedidoRow;
    })
    .filter((row): row is PedidoRow => row !== null);
}

function semAcento(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * O marco do acompanhamento que o evento representa.
 *
 * `null` para o que não é logística (pagamento: o MED já tem a data da
 * transação). O que não for reconhecido continua no histórico como UNKNOWN,
 * com o texto do evento — nada é descartado, mas também não é promovido a
 * marco que não é.
 */
export function statusForEvent(evento: string): ShipmentStatus | null {
  const e = semAcento(evento);
  if (e.includes('pagamento')) return null;
  if (e.includes('nao entregue') || e.includes('falha na entrega') || e.includes('tentativa')) {
    return 'NOT_DELIVERED';
  }
  if (e.includes('devolvid') || e.includes('retornado ao remetente')) return 'RETURNED';
  if (e.includes('saiu para entrega')) return 'OUT_FOR_DELIVERY';
  if (e.includes('entregue')) return 'DELIVERED';
  if (e.includes('transito') || e.includes('em rota') || e.includes('alfandega') || e.includes('desembaraco')) {
    return 'IN_TRANSIT';
  }
  if (e.includes('postado') || e.includes('coletado') || e.includes('despachado') || e.includes('expedido')) {
    return 'POSTED';
  }
  if (
    e.includes('transmitido') ||
    e.includes('fornecedor') ||
    e.includes('distribuidor') ||
    e.includes('parceiro') ||
    e.includes('encaminhad')
  ) {
    return 'IN_PRODUCTION';
  }
  if (e.includes('recebido') || e.includes('preparacao') || e.includes('criado') || e.includes('registrado')) {
    return 'CREATED';
  }
  return 'UNKNOWN';
}

/** Agrupa os eventos por MED: é por MED que se conta e que se registra. */
export function groupByMed(rows: EventoRow[]): Map<string, EventoRow[]> {
  const groups = new Map<string, EventoRow[]>();
  for (const row of rows) {
    const key = row.medRef.trim();
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}
