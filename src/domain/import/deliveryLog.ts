import { detectDelimiter, parseAmount, parseDelimited, normalizeHeader } from '@/domain/import/csv';

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
  errors: string[];
}

export interface ParsedDeliveryLog {
  rows: DeliveryLogRow[];
  fatalError: string | null;
}

const FIELD_ALIASES: Record<keyof Omit<DeliveryLogRow, 'line' | 'outcome' | 'errors'>, string[]> = {
  transactionRef: ['txnid', 'transactionid', 'idtransacao', 'reference'],
  purchaseAt: ['purchaseat', 'datacompra', 'compraem', 'purchasedate', 'eventts', 'datahora'],
  amount: ['amountbrl', 'amount', 'valor', 'valorbrl'],
  customerName: ['customername', 'nomecliente', 'cliente', 'nome'],
  customerEmail: ['customeremail', 'emailcliente', 'email', 'destinatario', 'to'],
  sentAt: ['confirmationsentat', 'sentat', 'enviadoem', 'dataenvio'],
  messageId: ['messageid', 'idmensagem', 'msgid', 'smtpid', 'mailid', 'envelopeid', 'idenvio'],
  rawStatus: ['status', 'resultado', 'situacao'],
  deliveredAt: ['deliveredat', 'entregueem', 'dataentrega'],
  smtpResponse: ['smtpresponse', 'respostasmtp', 'smtp', 'response'],
  productUrl: ['producturl', 'urlproduto', 'urldoproduto', 'linkacesso', 'url'],
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
const BR_OFFSET = '-03:00';

export function parseLogTimestamp(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;
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
    const field = ALIAS_TO_FIELD.get(normalizeHeader(header));
    if (field && ![...fieldByIndex.values()].includes(field)) fieldByIndex.set(index, field);
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
    const outcome = classifyOutcome(rawStatus ?? '');

    // Entrega sem hora nao e entrega comprovada: o horario e metade do que a
    // instituicao confere. Recusa sem hora e esperado — nao houve entrega.
    const deliveredAt = orNull(value('deliveredAt'));
    const parsedDeliveredAt = deliveredAt ? parseLogTimestamp(deliveredAt) : null;
    if (outcome === 'DELIVERED' && parsedDeliveredAt === null) {
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
      errors,
    };
  });

  return { rows, fatalError: null };
}
