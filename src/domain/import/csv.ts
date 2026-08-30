import type { MedReason, ProductType } from '@/domain/types';

/**
 * Importacao de MEDs em lote a partir do arquivo da adquirente.
 *
 * Regras que valem para todo este arquivo:
 *  - celula vazia vira campo ausente, nunca valor default;
 *  - valor que nao pode ser interpretado com seguranca vira erro da linha, e a
 *    linha nao e importada — adivinhar uma data ou um valor seria inventar um
 *    fato;
 *  - texto original de motivo desconhecido e preservado, em vez de ser
 *    forcado dentro de uma categoria que talvez nao seja a certa.
 */

// ---------------------------------------------------------------------------
// Leitura do arquivo
// ---------------------------------------------------------------------------

/** Detecta o separador olhando a linha de cabecalho. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** Parser de CSV com suporte a aspas e quebra de linha dentro do campo. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === delimiter) {
      pushField();
    } else if (character === '\n') {
      pushRow();
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

// ---------------------------------------------------------------------------
// Cabecalhos
// ---------------------------------------------------------------------------

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export type ImportField =
  | 'medId'
  | 'transactionId'
  | 'endToEndId'
  | 'pixId'
  | 'amount'
  | 'transactionAt'
  | 'openedAt'
  | 'responseDeadlineAt'
  | 'reason'
  | 'requestingInstitution'
  | 'productType'
  | 'payerName'
  | 'payerDocument'
  | 'payerEmail'
  | 'payerPhone'
  | 'merchantName'
  | 'orderReference';

/**
 * Nomes de coluna aceitos. A lista e generosa porque cada adquirente exporta
 * com um cabecalho diferente, mas nunca adivinha: coluna nao reconhecida e
 * reportada ao operador em vez de ser encaixada a forca em algum campo.
 */
const COLUMN_ALIASES: Record<ImportField, string[]> = {
  medId: ['medid', 'id', 'idmed', 'iddomed', 'numeromed', 'protocolo', 'protocolomed', 'codigomed', 'identificadormed'],
  transactionId: ['transactionid', 'idtransacao', 'idtransaction', 'transacao', 'idpagamento', 'paymentid'],
  endToEndId: ['endtoendid', 'e2eid', 'endtoend', 'ide2e', 'idendtoend'],
  pixId: ['pixid', 'idpix', 'txid'],
  amount: ['valor', 'amount', 'valortransacao', 'valorcontestado', 'valordacompra', 'valorpix', 'vlr'],
  transactionAt: [
    'datatransacao', 'datadatransacao', 'datacompra', 'datadacompra', 'datahoracompra',
    'datahoratransacao', 'transactionat', 'transactiondate', 'datapagamento', 'datahorapagamento',
  ],
  openedAt: ['dataabertura', 'dataaberturamed', 'dataabertura med', 'aberturamed', 'openedat', 'datasolicitacao', 'datamed', 'datanotificacao'],
  responseDeadlineAt: ['prazo', 'prazoresposta', 'prazoderesposta', 'datalimite', 'datalimiteresposta', 'deadline', 'vencimento', 'dataprazo'],
  reason: ['motivo', 'motivomed', 'motivocontestacao', 'reason', 'motivodadevolucao', 'tipogolpe', 'categoria'],
  requestingInstitution: ['instituicao', 'instituicaosolicitante', 'banco', 'ispb', 'instituicaorequerente', 'psp', 'participante'],
  productType: ['tipoproduto', 'tipodeproduto', 'producttype', 'tipo', 'segmento'],
  payerName: ['nome', 'nomecliente', 'nomepagador', 'cliente', 'pagador', 'payername', 'nomedocliente', 'nomecomprador'],
  payerDocument: ['cpf', 'cnpj', 'cpfcnpj', 'documento', 'documentocliente', 'documentopagador', 'payerdocument', 'cpfdocliente'],
  payerEmail: ['email', 'emailcliente', 'emailpagador', 'payeremail', 'emaildocliente'],
  payerPhone: ['telefone', 'celular', 'telefonecliente', 'payerphone', 'fone', 'whatsapp'],
  merchantName: ['merchant', 'estabelecimento', 'loja', 'nomeloja', 'nomeestabelecimento', 'recebedor'],
  orderReference: ['pedido', 'numeropedido', 'idpedido', 'orderid', 'order', 'referenciapedido'],
};

const ALIAS_TO_FIELD = new Map<string, ImportField>();
for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [ImportField, string[]][]) {
  ALIAS_TO_FIELD.set(normalizeHeader(field), field);
  for (const alias of aliases) ALIAS_TO_FIELD.set(normalizeHeader(alias), field);
}

export function matchColumn(header: string): ImportField | null {
  return ALIAS_TO_FIELD.get(normalizeHeader(header)) ?? null;
}

/** Nomes de coluna sugeridos ao operador quando falta algo obrigatorio. */
export function suggestedHeaders(field: ImportField): string[] {
  return [field, ...(COLUMN_ALIASES[field] ?? [])].slice(0, 4);
}

// ---------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------

/**
 * Interpreta valores monetarios em formato brasileiro ou internacional.
 * Quando ha ponto e virgula, o ultimo separador e o decimal. Com apenas um
 * ponto e exatamente dois digitos depois, trata-se de decimal; caso contrario,
 * milhar. Formato que nao se encaixa nessas regras vira erro, nao um palpite.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (cleaned.length === 0) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.');
  } else if (lastDot >= 0) {
    const decimals = cleaned.length - lastDot - 1;
    normalized = decimals === 2 ? cleaned : cleaned.replace(/\./g, '');
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Fuso usado para datas sem offset explicito.
 * O Brasil nao tem horario de verao desde 2019, entao -03:00 e fixo e correto
 * para os arquivos das adquirentes brasileiras.
 */
const BR_OFFSET = '-03:00';

/**
 * Aceita ISO-8601, dd/mm/aaaa e aaaa-mm-dd, com hora opcional.
 * Data ambigua ou incompleta vira null, e a linha e reportada como erro.
 */
export function parseDateTimeBr(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;

  // ISO com offset ou Z: confia no proprio valor.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const brazilian = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  const isoLike = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  let year: string;
  let month: string;
  let day: string;
  let hour = '00';
  let minute = '00';
  let second = '00';

  if (brazilian) {
    day = brazilian[1]!.padStart(2, '0');
    month = brazilian[2]!.padStart(2, '0');
    year = brazilian[3]!;
    hour = (brazilian[4] ?? '00').padStart(2, '0');
    minute = brazilian[5] ?? '00';
    second = brazilian[6] ?? '00';
  } else if (isoLike) {
    year = isoLike[1]!;
    month = isoLike[2]!;
    day = isoLike[3]!;
    hour = (isoLike[4] ?? '00').padStart(2, '0');
    minute = isoLike[5] ?? '00';
    second = isoLike[6] ?? '00';
  } else {
    return null;
  }

  const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}${BR_OFFSET}`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;

  // Rejeita datas que "existem" so por rollover (31/02 virando 03/03).
  const check = new Date(`${year}-${month}-${day}T12:00:00${BR_OFFSET}`);
  if (check.getUTCDate() !== Number(day)) return null;

  return parsed.toISOString();
}

/**
 * Traduz o motivo informado pela instituicao. Texto que nao corresponde a
 * nenhuma categoria conhecida vira OTHER com o texto original preservado em
 * `reasonDescription` — encaixar na categoria errada mudaria quais evidencias o
 * sistema passa a exigir.
 */
const REASON_KEYWORDS: [MedReason, string[]][] = [
  ['PRODUCT_NOT_RECEIVED', ['naorecebido', 'naorecebeu', 'produtonaorecebido', 'naoentregue', 'mercadorianaorecebida', 'nãorecebido']],
  ['PRODUCT_NOT_AS_DESCRIBED', ['diferentedoanunciado', 'produtodiferente', 'naoconformecomanunciado', 'produtodivergente']],
  ['UNRECOGNIZED_TRANSACTION', ['naoreconhece', 'naoreconhecida', 'naoreconhecimento', 'desconhecea', 'transacaodesconhecida']],
  ['FRAUD_ACCOUNT_TAKEOVER', ['invasaodeconta', 'containvadida', 'accounttakeover', 'ato']],
  ['FRAUD_COERCION', ['coacao', 'sequestro', 'sobcoacao']],
  ['FRAUD_SCAM', ['golpe', 'fraude', 'estelionato', 'scam', 'fraudulenta']],
  ['DUPLICATE_CHARGE', ['duplicidade', 'cobrancaduplicada', 'duplicado', 'duplicata']],
  ['OPERATIONAL_ERROR', ['errooperacional', 'erronovalor', 'valorincorreto', 'erro']],
];

const MED_REASON_VALUES = new Set<string>([
  'UNRECOGNIZED_TRANSACTION',
  'PRODUCT_NOT_RECEIVED',
  'PRODUCT_NOT_AS_DESCRIBED',
  'FRAUD_SCAM',
  'FRAUD_COERCION',
  'FRAUD_ACCOUNT_TAKEOVER',
  'DUPLICATE_CHARGE',
  'OPERATIONAL_ERROR',
  'OTHER',
]);

export interface ReasonResolution {
  reason: MedReason;
  /** Texto original, guardado sempre que a categoria nao foi reconhecida. */
  description: string | null;
}

export function resolveReason(raw: string): ReasonResolution {
  const value = raw.trim();
  if (value.length === 0) return { reason: 'OTHER', description: null };

  const upper = value.toUpperCase();
  if (MED_REASON_VALUES.has(upper)) {
    return { reason: upper as MedReason, description: null };
  }

  const normalized = normalizeHeader(value);
  for (const [reason, keywords] of REASON_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(normalizeHeader(keyword)))) {
      return { reason, description: value };
    }
  }

  return { reason: 'OTHER', description: value };
}

const PRODUCT_KEYWORDS: [ProductType, string[]][] = [
  ['PHYSICAL', ['fisico', 'physical', 'produtofisico', 'mercadoria']],
  ['INFOPRODUCT', ['infoproduto', 'infoproduct', 'curso', 'ebook']],
  ['SUBSCRIPTION', ['assinatura', 'subscription', 'recorrencia']],
  ['TICKET', ['ingresso', 'ticket', 'evento']],
  ['MARKETPLACE', ['marketplace']],
  ['SAAS', ['saas', 'software']],
  ['SERVICE', ['servico', 'service']],
  ['DIGITAL', ['digital', 'produtodigital', 'download']],
];

const PRODUCT_TYPE_VALUES = new Set<string>([
  'PHYSICAL', 'DIGITAL', 'SERVICE', 'SUBSCRIPTION', 'TICKET',
  'INFOPRODUCT', 'MARKETPLACE', 'SAAS', 'OTHER',
]);

/** Tipo de produto nao reconhecido fica ausente: o operador escolhe depois. */
export function resolveProductTypeValue(raw: string): ProductType | null {
  const value = raw.trim();
  if (value.length === 0) return null;

  const upper = value.toUpperCase();
  if (PRODUCT_TYPE_VALUES.has(upper)) return upper as ProductType;

  const normalized = normalizeHeader(value);
  for (const [productType, keywords] of PRODUCT_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return productType;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Linhas
// ---------------------------------------------------------------------------

export interface ImportedMedRow {
  /** Numero da linha no arquivo, contando o cabecalho. */
  line: number;
  medId: string | null;
  transactionId: string | null;
  endToEndId: string | null;
  pixId: string | null;
  amount: number | null;
  transactionAt: string | null;
  openedAt: string | null;
  responseDeadlineAt: string | null;
  reason: MedReason;
  reasonDescription: string | null;
  requestingInstitution: string | null;
  productType: ProductType | null;
  payerName: string | null;
  payerDocument: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  merchantName: string | null;
  orderReference: string | null;
  /** Linha so e importavel quando esta lista esta vazia. */
  errors: string[];
}

export interface ParsedImport {
  /** Cabecalhos como vieram no arquivo. */
  headers: string[];
  /** Colunas reconhecidas, na ordem do arquivo. */
  recognized: { header: string; field: ImportField }[];
  /** Colunas que o sistema nao soube mapear e simplesmente ignorou. */
  ignored: string[];
  rows: ImportedMedRow[];
  /** Erro estrutural do arquivo inteiro (vazio, sem cabecalho util). */
  fatalError: string | null;
}

function cell(values: Map<ImportField, string>, field: ImportField): string {
  return values.get(field)?.trim() ?? '';
}

function orNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function parseMedImport(text: string): ParsedImport {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { headers: [], recognized: [], ignored: [], rows: [], fatalError: 'Arquivo vazio.' };
  }

  const delimiter = detectDelimiter(trimmed);
  const table = parseDelimited(trimmed, delimiter);
  const headerRow = table[0];

  if (!headerRow || table.length < 2) {
    return {
      headers: headerRow ?? [],
      recognized: [],
      ignored: [],
      rows: [],
      fatalError: 'O arquivo precisa ter uma linha de cabeçalho e ao menos uma linha de dados.',
    };
  }

  const recognized: { header: string; field: ImportField }[] = [];
  const ignored: string[] = [];
  const fieldByIndex = new Map<number, ImportField>();

  headerRow.forEach((header, index) => {
    const field = matchColumn(header);
    if (field && !fieldByIndex.has(index)) {
      // Primeira coluna reconhecida para um campo vence; repetidas sao ignoradas.
      if (recognized.some((entry) => entry.field === field)) {
        ignored.push(header);
        return;
      }
      fieldByIndex.set(index, field);
      recognized.push({ header, field });
    } else if (header.length > 0) {
      ignored.push(header);
    }
  });

  if (!recognized.some((entry) => entry.field === 'medId')) {
    return {
      headers: headerRow,
      recognized,
      ignored,
      rows: [],
      fatalError: `Nenhuma coluna com o identificador do MED foi encontrada. Renomeie a coluna para um destes nomes: ${suggestedHeaders('medId').join(', ')}.`,
    };
  }

  const rows: ImportedMedRow[] = table.slice(1).map((rawRow, index) => {
    const values = new Map<ImportField, string>();
    fieldByIndex.forEach((field, columnIndex) => {
      values.set(field, rawRow[columnIndex] ?? '');
    });

    const errors: string[] = [];

    const medId = orNull(cell(values, 'medId'));
    if (!medId) errors.push('Identificador do MED ausente.');

    const rawAmount = cell(values, 'amount');
    const amount = rawAmount.length > 0 ? parseAmount(rawAmount) : null;
    if (rawAmount.length === 0) {
      errors.push('Valor ausente.');
    } else if (amount === null || amount <= 0) {
      errors.push(`Valor "${rawAmount}" não pode ser interpretado.`);
    }

    const rawOpenedAt = cell(values, 'openedAt');
    const openedAt = rawOpenedAt.length > 0 ? parseDateTimeBr(rawOpenedAt) : null;
    if (rawOpenedAt.length > 0 && openedAt === null) {
      errors.push(`Data de abertura "${rawOpenedAt}" não pode ser interpretada.`);
    }

    const parseOptionalDate = (field: ImportField, label: string): string | null => {
      const raw = cell(values, field);
      if (raw.length === 0) return null;
      const parsed = parseDateTimeBr(raw);
      if (parsed === null) errors.push(`${label} "${raw}" não pode ser interpretada.`);
      return parsed;
    };

    const transactionAt = parseOptionalDate('transactionAt', 'Data da compra');
    const responseDeadlineAt = parseOptionalDate('responseDeadlineAt', 'Prazo de resposta');

    const resolvedReason = resolveReason(cell(values, 'reason'));

    return {
      line: index + 2,
      medId,
      transactionId: orNull(cell(values, 'transactionId')),
      endToEndId: orNull(cell(values, 'endToEndId')),
      pixId: orNull(cell(values, 'pixId')),
      amount,
      transactionAt,
      // Sem data de abertura no arquivo, o MED nao ganha uma data inventada:
      // quem importa registra o momento da importacao como abertura conhecida.
      openedAt,
      responseDeadlineAt,
      reason: resolvedReason.reason,
      reasonDescription: resolvedReason.description,
      requestingInstitution: orNull(cell(values, 'requestingInstitution')),
      productType: resolveProductTypeValue(cell(values, 'productType')),
      payerName: orNull(cell(values, 'payerName')),
      payerDocument: orNull(cell(values, 'payerDocument')),
      payerEmail: orNull(cell(values, 'payerEmail')),
      payerPhone: orNull(cell(values, 'payerPhone')),
      merchantName: orNull(cell(values, 'merchantName')),
      orderReference: orNull(cell(values, 'orderReference')),
      errors,
    };
  });

  return { headers: headerRow, recognized, ignored, rows, fatalError: null };
}
