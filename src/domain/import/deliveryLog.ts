import {
  detectDelimiter,
  normalizeHeader,
  parseAmount,
  parseDelimited,
  resolveProductTypeValue,
} from '@/domain/import/csv';
import type { ProductType } from '@/domain/types';

/**
 * Log de envio do provedor de e-mail.
 *
 * E o registro que prova comunicacao: message-id, hora do envio, hora da
 * entrega e a resposta SMTP do servidor de destino. Diferente do comprovante
 * reconstruido na tela, isto nao e representacao — e o que o MTA anotou, e a
 * instituicao pode cruzar pelo message-id.
 *
 * Uma coisa que este arquivo **nao** prova: que o produto chegou. Ele mostra
 * que uma mensagem foi aceita pelo servidor do comprador. Se o que foi
 * comprado era recarga de jogo, quem responde "chegou?" e o log de acesso do
 * console, nao o do e-mail. Manter essa distincao e o que impede a defesa de
 * afirmar mais do que tem.
 */

/** Resultado do envio, como o provedor classificou. */
export type DeliveryOutcome = 'DELIVERED' | 'BOUNCED' | 'OTHER';

export interface DeliveryLogRow {
  line: number;
  transactionRef: string | null;
  purchaseAt: string | null;
  amount: number | null;
  customerName: string | null;
  customerEmail: string | null;
  sentAt: string | null;
  /** Identificador RFC 5322 da mensagem. E por ele que se confere na origem. */
  messageId: string | null;
  outcome: DeliveryOutcome;
  /** Texto do status, como veio. Preservado mesmo quando reconhecido. */
  rawStatus: string | null;
  deliveredAt: string | null;
  smtpResponse: string | null;
  /** Onde o acesso foi liberado. Vira `platform` no registro de entrega. */
  productUrl: string | null;
  productName: string | null;
  orderRef: string | null;
  /**
   * Primeiro acesso registrado pelo console.
   *
   * E a evidencia mais forte que este arquivo carrega: mostra que o comprador
   * **usou** o que comprou. Entrega de e-mail prova que a mensagem chegou;
   * so isto responde "nao recebi".
   */
  firstAccessAt: string | null;
  /** Tentativas de envio. Mais de uma indica reenvio, e a tela deve dizer. */
  attempts: number | null;
  /**
   * Tipo do produto da venda, quando o arquivo traz. Decide se o comprovante e
   * de acompanhamento do pedido (fisico) ou de acesso liberado (digital).
   */
  productType: ProductType | null;
  errors: string[];
}

export interface ParsedDeliveryLog {
  rows: DeliveryLogRow[];
  fatalError: string | null;
}

const FIELD_ALIASES: Record<keyof Omit<DeliveryLogRow, 'line' | 'outcome' | 'errors'>, string[]> = {
  productType: ['producttype', 'tipoproduto', 'tipodeproduto', 'tipodoproduto', 'tipo', 'categoria'],
  transactionRef: ['txnid', 'transactionid', 'idtransacao', 'reference', 'e2e', 'e2eid', 'endtoend', 'endtoendid', 'idfimafim'],
  purchaseAt: ['purchaseat', 'datacompra', 'compraem', 'purchasedate', 'eventts', 'datahora', 'horariodacompra', 'horariocompra', 'datadacompra'],
  amount: ['amountbrl', 'amount', 'valor', 'valorbrl'],
  customerName: ['customername', 'nomecliente', 'cliente', 'nome'],
  customerEmail: ['customeremail', 'emailcliente', 'email', 'destinatario', 'to'],
  sentAt: ['confirmationsentat', 'sentat', 'enviadoem', 'dataenvio', 'lancadonosistema', 'lancadoem'],
  messageId: ['messageid', 'idmensagem', 'msgid', 'smtpid', 'mailid', 'envelopeid', 'idenvio'],
  rawStatus: ['status', 'resultado', 'situacao'],
  deliveredAt: ['deliveredat', 'entregueem', 'dataentrega', 'confirmacaorecebida', 'confirmacaorecebidaem'],
  smtpResponse: ['smtpresponse', 'respostasmtp', 'smtp', 'response'],
  productUrl: [
    'producturl',
    'urlproduto',
    'urldoproduto',
    'linkacesso',
    'url',
    'urldeacesso',
    'urldeacessoconfirmacaodepedidoparalogistica',
    'urldeacessoconfirmacaodepedido',
  ],
  productName: ['productname', 'produto', 'nomeproduto'],
  orderRef: ['orderid', 'pedido', 'idpedido', 'numeropedido'],
  firstAccessAt: ['firstaccessat', 'primeiroacesso', 'dataprimeiroacesso', 'acessoem'],
  attempts: ['attempts', 'tentativas'],
};

type LogField = keyof typeof FIELD_ALIASES;

const ALIAS_TO_FIELD = new Map<string, LogField>();
for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [LogField, string[]][]) {
  ALIAS_TO_FIELD.set(normalizeHeader(field), field);
  for (const alias of aliases) ALIAS_TO_FIELD.set(normalizeHeader(alias), field);
}

/**
 * `2026-09-17 09:29:42` -> ISO, no fuso de Brasilia.
 *
 * O log do provedor nao declara fuso, e o MTA e brasileiro. Assumir -03:00 e
 * o unico caminho; o que nao se faz e apresentar o instante como se o arquivo
 * o tivesse declarado — por isso o campo que registra a suposicao existe.
 */
/**
 * Cabecalho que nao bate exato com nenhum nome conhecido: decide pela palavra
 * que ele contem. "E-mail sintetico", "URL de acesso / tracking", "Data da
 * confirmacao", "Horario do disparo" — o que importa e o que a coluna e, nao
 * como cada cliente resolveu chama-la.
 */
const HEADER_HINTS: [string[], LogField][] = [
  [['messageid', 'idmensagem', 'idenvio', 'msgid', 'mailid'], 'messageId'],
  [['e2e', 'endtoend', 'fimafim', 'idtransac', 'transactionid', 'txn'], 'transactionRef'],
  [['email'], 'customerEmail'],
  [['url', 'link'], 'productUrl'],
  [['primeiroacesso', 'firstaccess'], 'firstAccessAt'],
  [['confirm', 'receb', 'entreg', 'deliver'], 'deliveredAt'],
  [['envi', 'lanc', 'disparo', 'sent'], 'sentAt'],
  [['compra', 'pagamento', 'purchase', 'venda'], 'purchaseAt'],
  [['tipo', 'categoria', 'natureza'], 'productType'],
  [['status', 'situacao', 'resultado'], 'rawStatus'],
  [['nome', 'cliente', 'comprador', 'destinatario', 'pagador', 'name'], 'customerName'],
  [['valor', 'amount', 'preco'], 'amount'],
  [['pedido', 'order'], 'orderRef'],
];

function fieldByPrefix(header: string): LogField | undefined {
  return HEADER_HINTS.find(([words]) => words.some((word) => header.includes(word)))?.[1];
}

const E2E_PATTERN = /^E[0-9A-Za-z]{31}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * O que a coluna e, pelo que ela contem: quando o cabecalho nao diz nada que
 * se reconheca, os valores dizem. Decide pela maioria das celulas preenchidas.
 */
function fieldByContent(values: string[]): LogField | 'date' | undefined {
  const filled = values.map((value) => value.trim()).filter((value) => value.length > 0).slice(0, 30);
  if (filled.length === 0) return undefined;
  const share = (test: (value: string) => boolean) => filled.filter(test).length / filled.length;
  if (share((v) => E2E_PATTERN.test(v)) >= 0.6) return 'transactionRef';
  if (share((v) => EMAIL_PATTERN.test(v)) >= 0.6) return 'customerEmail';
  if (share((v) => /^https?:\/\//i.test(v)) >= 0.6) return 'productUrl';
  if (share((v) => parseLogTimestamp(v) !== null) >= 0.6) return 'date';
  if (share((v) => resolveProductTypeValue(v) !== null) >= 0.6) return 'productType';
  if (share((v) => /^<?[^\s@<>]+@[^\s@<>]+>?$/.test(v)) >= 0.6) return 'messageId';
  if (share((v) => /^[A-Za-zÀ-ÿ'.]+(\s+[A-Za-zÀ-ÿ'.]+)+$/.test(v)) >= 0.6) return 'customerName';
  return undefined;
}

const BR_OFFSET = '-03:00';

export function parseLogTimestamp(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Data de planilha (.xlsx) chega como numero de dias desde 1899-12-30, com
  // a hora na fracao. E o horario de Brasilia que estava na celula.
  if (/^\d{5}(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial < 20000 || serial > 80000) return null;
    const ms = Math.round((serial - 25569) * 86400) * 1000;
    const d = new Date(ms);
    return parseLogTimestamp(
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    );
  }

  // Formato brasileiro: 24/09/2026 07:06 ou 24/09/2026 07:06:29.
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[\s,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (br) {
    const [, dia, mes, ano, hora, minuto, segundo = '00'] = br as unknown as string[];
    return parseLogTimestamp(
      `${ano}-${pad(Number(mes))}-${pad(Number(dia))} ${pad(Number(hora))}:${minuto}:${segundo}`,
    );
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '00'] = match as unknown as string[];
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${BR_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Classifica o status sem apagar o texto original.
 *
 * Tudo que nao for entrega ou recusa explicita fica em OTHER, e nao em
 * DELIVERED: `deferred`, `queued` e `soft-bounce` nao sao entrega, e trata-los
 * como tal faria a defesa afirmar que a mensagem chegou quando ela ainda
 * estava no caminho — ou nunca chegou.
 */
export function classifyOutcome(raw: string): DeliveryOutcome {
  const value = normalizeHeader(raw);
  if (value === 'delivered' || value === 'entregue' || value === 'delivery') return 'DELIVERED';
  if (value.includes('bounce') || value.includes('rejected') || value === 'failed') return 'BOUNCED';
  return 'OTHER';
}

/** Extrai o message-id sem os sinais de menor e maior, se vierem. */
function cleanMessageId(raw: string): string | null {
  const value = raw.trim().replace(/^<|>$/g, '');
  return value.length > 0 ? value : null;
}

export function parseDeliveryLog(text: string): ParsedDeliveryLog {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { rows: [], fatalError: 'Arquivo vazio.' };

  const table = parseDelimited(trimmed, detectDelimiter(trimmed));
  const headerRow = table[0];
  if (!headerRow || table.length < 2) {
    return {
      rows: [],
      fatalError: 'O arquivo precisa ter cabeçalho e ao menos uma linha de dados.',
    };
  }

  const fieldByIndex = new Map<number, LogField>();
  headerRow.forEach((header, index) => {
    const field = ALIAS_TO_FIELD.get(normalizeHeader(header)) ?? fieldByPrefix(normalizeHeader(header));
    if (field && ![...fieldByIndex.values()].includes(field)) fieldByIndex.set(index, field);
  });

  // Colunas que o cabecalho nao explicou: o conteudo decide. Datas sem nome
  // reconhecivel entram, na ordem em que aparecem, como compra, envio e
  // confirmacao — a ordem natural de qualquer planilha de envio.
  const usados = () => new Set(fieldByIndex.values());
  const datasSemNome: number[] = [];
  headerRow.forEach((_, index) => {
    if (fieldByIndex.has(index)) return;
    const guess = fieldByContent(table.slice(1).map((row) => row[index] ?? ''));
    if (guess === 'date') datasSemNome.push(index);
    else if (guess && !usados().has(guess)) fieldByIndex.set(index, guess);
  });
  const ordemDasDatas: LogField[] = ['purchaseAt', 'sentAt', 'deliveredAt'];
  const faltando = ordemDasDatas.filter((field) => !usados().has(field));
  const restantes =
    datasSemNome.length >= faltando.length ? faltando : faltando.slice(faltando.length - datasSemNome.length);
  datasSemNome.forEach((index, i) => {
    const field = restantes[i];
    if (field) fieldByIndex.set(index, field);
  });

  // O arquivo precisa ao menos parecer um log de envio. O message-id nao entra
  // aqui de proposito: ele decide se o envio e conferivel na origem, e isso e
  // exigencia de quem gera a peca de prova, nao de quem so quer o dado do
  // comprador no painel. Barrar tudo na porta por causa de uma coluna joga
  // fora e-mail, URL e primeiro acesso junto.
  const reconhecidos = [...fieldByIndex.values()];
  const identifica = ['customerEmail', 'customerName', 'transactionRef', 'orderRef'] as const;
  if (!identifica.some((campo) => reconhecidos.includes(campo))) {
    return {
      rows: [],
      fatalError:
        'Este arquivo não parece um log de envio: nenhuma coluna identifica o destinatário ' +
        '(e-mail, nome, id da transação ou do pedido). Confira se não é o arquivo do lote de MEDs.',
    };
  }

  const semColunaDeStatus = !reconhecidos.includes('rawStatus');

  const rows: DeliveryLogRow[] = table.slice(1).map((rawRow, index) => {
    const value = (field: LogField): string => {
      for (const [columnIndex, mapped] of fieldByIndex) {
        if (mapped === field) return rawRow[columnIndex]?.trim() ?? '';
      }
      return '';
    };
    const orNull = (raw: string): string | null => (raw.length > 0 ? raw : null);

    const errors: string[] = [];
    // Sem message-id a linha continua valendo como dado — o que ela nao vale e
    // como prova conferivel na origem. Quem decide isso e o servico, na hora
    // de gerar a peca; aqui a ausencia so fica registrada.
    const messageId = cleanMessageId(value('messageId'));

    const rawSentAt = value('sentAt');
    const sentAt = rawSentAt.length > 0 ? parseLogTimestamp(rawSentAt) : null;
    if (rawSentAt.length > 0 && sentAt === null) {
      errors.push(`Data de envio "${rawSentAt}" não pôde ser interpretada.`);
    }

    const rawStatus = orNull(value('rawStatus'));
    // Planilha sem coluna de status: a confirmacao de recebimento preenchida e
    // o que diz que a mensagem chegou. Vazia, nao ha entrega a afirmar.
    const outcome = semColunaDeStatus
      ? value('deliveredAt').length > 0 || value('sentAt').length > 0
        ? 'DELIVERED'
        : 'OTHER'
      : classifyOutcome(rawStatus ?? '');

    // Entrega sem hora nao e entrega comprovada: o horario e metade do que a
    // instituicao confere. Recusa sem hora e esperado — nao houve entrega.
    const deliveredAt = orNull(value('deliveredAt'));
    const parsedDeliveredAt = deliveredAt ? parseLogTimestamp(deliveredAt) : null;
    if (outcome === 'DELIVERED' && parsedDeliveredAt === null && sentAt === null) {
      errors.push('Status é entrega, mas a data da entrega está ausente ou ilegível.');
    }

    const rawAmount = value('amount');
    const rawAttempts = value('attempts');
    const attempts = rawAttempts.length > 0 ? Number.parseInt(rawAttempts, 10) : null;

    const rawFirstAccess = value('firstAccessAt');
    const firstAccessAt = rawFirstAccess.length > 0 ? parseLogTimestamp(rawFirstAccess) : null;
    if (rawFirstAccess.length > 0 && firstAccessAt === null) {
      errors.push(`Primeiro acesso "${rawFirstAccess}" não pôde ser interpretado.`);
    }

    return {
      line: index + 2,
      transactionRef: orNull(value('transactionRef')),
      purchaseAt: value('purchaseAt').length > 0 ? parseLogTimestamp(value('purchaseAt')) : null,
      amount: rawAmount.length > 0 ? parseAmount(rawAmount) : null,
      customerName: orNull(value('customerName')),
      customerEmail: orNull(value('customerEmail')),
      sentAt,
      messageId,
      outcome,
      rawStatus,
      deliveredAt: parsedDeliveredAt,
      smtpResponse: orNull(value('smtpResponse')),
      productUrl: orNull(value('productUrl')),
      productName: orNull(value('productName')),
      orderRef: orNull(value('orderRef')),
      firstAccessAt,
      attempts: attempts !== null && Number.isFinite(attempts) ? attempts : null,
      productType: resolveProductTypeValue(value('productType')),
      errors,
    };
  });

  return { rows, fatalError: null };
}

/**
 * Colunas que so um log de envio tem.
 *
 * Nome, e-mail e id da transacao aparecem tambem no arquivo da instituicao, e
 * por isso nao servem para distinguir um do outro. Message-id, hora do envio,
 * hora da entrega, resposta SMTP e primeiro acesso, sim: nenhum lote de MED
 * traz isso.
 */
const DELIVERY_ONLY_FIELDS: LogField[] = [
  'messageId',
  'sentAt',
  'deliveredAt',
  'smtpResponse',
  'firstAccessAt',
];

/**
 * O arquivo e um log de envio, e nao um lote de MEDs?
 *
 * Existe para a importacao de MEDs reconhecer o arquivo que subiu pela porta
 * errada e mandar para o fluxo de entregas, em vez de recusar o lote inteiro
 * por nao achar a coluna do MED.
 */
export function isDeliveryLog(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const headerRow = parseDelimited(trimmed, detectDelimiter(trimmed))[0] ?? [];
  return headerRow.some((header) => {
    const field = ALIAS_TO_FIELD.get(normalizeHeader(header));
    return field !== undefined && DELIVERY_ONLY_FIELDS.includes(field);
  });
}
