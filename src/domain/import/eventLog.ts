import { detectDelimiter, normalizeHeader, parseDelimited, resolveProductTypeValue } from '@/domain/import/csv';
import { parseLogTimestamp } from '@/domain/import/deliveryLog';
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
}

const MED_HEADERS = ['idmed', 'medid', 'iddomed', 'endtoendid', 'endtoend', 'e2e', 'e2eid', 'idendtoend'];
const EVENTO_HEADERS = ['evento', 'etapa', 'descricaodoevento', 'nomedoevento'];
const DATA_EVENTO = (header: string) =>
  header.startsWith('datahoradoevento') ||
  ['dataevento', 'datadoevento', 'datahoraevento', 'datahora', 'data'].includes(header);

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

/** A aba de Eventos: tem o ID do MED, o nome do evento e a data do evento. */
export function isEventLog(text: string): boolean {
  const parsed = table(text);
  if (!parsed) return false;
  const { headers } = parsed;
  return (
    headerIndex(headers, MED_HEADERS) !== -1 &&
    headerIndex(headers, EVENTO_HEADERS) !== -1 &&
    headers.some(DATA_EVENTO)
  );
}

/** A aba de Pedidos: ID do MED com os dados do pedido, sem coluna de evento. */
export function isPedidosFile(text: string): boolean {
  const parsed = table(text);
  if (!parsed) return false;
  const { headers } = parsed;
  return (
    headerIndex(headers, MED_HEADERS) !== -1 &&
    headerIndex(headers, EVENTO_HEADERS) === -1 &&
    (headers.includes('natureza') || headers.includes('statusatualdopedido'))
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
  const at = {
    med: headerIndex(h, MED_HEADERS),
    pedido: headerIndex(h, ['pedido', 'iddopedido', 'numerodopedido']),
    evento: headerIndex(h, EVENTO_HEADERS),
    data: h.findIndex(DATA_EVENTO),
    canal: headerIndex(h, ['canal']),
    codigo: headerIndex(h, ['codigodoevento', 'codigo']),
    url: headerIndex(h, ['urloperacional', 'url']),
    observacao: headerIndex(h, ['observacao', 'obs']),
    distribuidor: headerIndex(h, ['canaldistribuidor', 'distribuidor']),
    idExterno: headerIndex(h, ['idexternodopedido', 'idexterno']),
    refFornecedor: headerIndex(h, ['referenciadofornecedor']),
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
      } satisfies EventoRow;
    })
    .filter((row): row is EventoRow => row !== null);
}

export function parsePedidos(text: string): PedidoRow[] {
  const parsed = table(text);
  if (!parsed) return [];
  const h = parsed.headers;
  const at = {
    med: headerIndex(h, MED_HEADERS),
    pedido: headerIndex(h, ['pedido', 'iddopedido', 'numerodopedido']),
    natureza: headerIndex(h, ['natureza', 'tipodoproduto']),
    status: headerIndex(h, ['statusatualdopedido']),
    distribuidor: headerIndex(h, ['canaldistribuidor', 'distribuidor']),
    idNoFornecedor: headerIndex(h, ['iddopedidonofornecedor']),
    email: h.findIndex((header) => header.includes('email')),
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
        email: cell(row, at.email),
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
  if (e.includes('transmitido') || e.includes('fornecedor') || e.includes('distribuidor')) {
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
