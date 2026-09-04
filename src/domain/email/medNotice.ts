/**
 * Leitura de um aviso de MED recebido por e-mail.
 *
 * O que sai daqui e um **rascunho**, nao um MED. Campo que o aviso nao trouxe
 * fica ausente e e listado em `missing`; rotulo que nao reconhecemos vai para
 * `unmapped` com o texto original. Nada e completado com valor plausivel — a
 * pessoa confirma o que faltou, e o sistema registra que veio dela.
 *
 * Puro: entra o texto cru da mensagem, sai o rascunho. Sem I/O e sem relogio.
 */

import { MED_REASONS, PRODUCT_TYPES, type MedReason, type ProductType } from '@/domain/types';
import { parseMessage } from '@/domain/email/mime';

/**
 * Fuso assumido para as datas do aviso.
 *
 * O aviso escreve "03/09/2026 14:32" sem dizer o fuso. Um MED e um instrumento
 * do arranjo Pix, operado no Brasil, e o prazo de resposta se conta em horario
 * de Brasilia — entao assumimos -03:00 e **dizemos** que assumimos, em vez de
 * gravar um instante que parece exato e nao e. Quem confere o prazo precisa
 * saber disso.
 */
export const ASSUMED_OFFSET = '-03:00';

export interface MedNoticeDraft {
  medId: string | null;
  transactionId: string | null;
  endToEndId: string | null;
  pixId: string | null;
  /** Em centavos, como o resto do sistema. */
  amountCents: number | null;
  currency: string | null;
  transactionAt: string | null;
  openedAt: string | null;
  responseDeadlineAt: string | null;
  reason: MedReason | null;
  reasonDescription: string | null;
  requestingInstitution: string | null;
  productType: ProductType | null;
  payerName: string | null;
  payerDocument: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  merchantName: string | null;
  additionalInformation: string | null;
}

export interface MedNoticeReading {
  draft: MedNoticeDraft;
  /** Campos do rascunho que ficaram sem valor. */
  missing: (keyof MedNoticeDraft)[];
  /** Rotulos presentes no aviso que este leitor nao sabe traduzir. */
  unmapped: { label: string; value: string }[];
  /** Datas lidas sem fuso declarado, gravadas com `ASSUMED_OFFSET`. */
  assumedTimezone: (keyof MedNoticeDraft)[];
  /** `true` quando o texto tem cara de aviso de MED. */
  recognized: boolean;
}

/** Rotulo no aviso -> campo do rascunho. Sem acento e sem caixa, para casar. */
const LABELS: Record<string, keyof MedNoticeDraft> = {
  'id do med': 'medId',
  'instituicao solicitante': 'requestingInstitution',
  'data de abertura': 'openedAt',
  'prazo para resposta': 'responseDeadlineAt',
  motivo: 'reason',
  descricao: 'reasonDescription',
  'id da transacao': 'transactionId',
  'end-to-end id': 'endToEndId',
  'chave pix': 'pixId',
  valor: 'amountCents',
  'data da transacao': 'transactionAt',
  nome: 'payerName',
  cpf: 'payerDocument',
  cnpj: 'payerDocument',
  'e-mail': 'payerEmail',
  email: 'payerEmail',
  telefone: 'payerPhone',
  'razao social': 'merchantName',
  'tipo de produto': 'productType',
};

/** Titulos de secao. Nao sao campos: separam blocos e nao viram `unmapped`. */
const SECTIONS = new Set([
  'dados da solicitacao',
  'dados da transacao',
  'dados do pagador',
  'dados do recebedor',
  'informacoes adicionais',
]);

/**
 * Uma linha com forma de rotulo, conhecido ou nao.
 *
 * Serve para saber onde um valor termina. Antes a continuacao so parava em
 * rotulo conhecido, e um campo novo do banco era colado no valor anterior —
 * o que nao perde so o campo novo: estraga o bom, que passa a carregar texto
 * que nao e dele.
 *
 * Comeca com letra, no maximo 40 caracteres antes dos dois pontos. A hora
 * `23:59` nao casa porque comeca com digito, e continuacao de frase nao casa
 * porque nao tem dois pontos.
 */
function looksLikeLabel(line: string): boolean {
  return /^[A-Za-zÀ-ÿ][^:]{0,39}:(\s|$)/.test(line.trim());
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Rotulos em pt-BR dos motivos, na forma em que um aviso os escreve.
 *
 * Duplica `MED_REASON_LABEL` de proposito: aquele mapa serve a interface e pode
 * ser reescrito para caber numa coluna; este e contrato de leitura, e mudar o
 * texto aqui muda o que o sistema entende de um e-mail.
 */
const REASON_TEXT: Record<MedReason, string[]> = {
  UNRECOGNIZED_TRANSACTION: ['transacao nao reconhecida'],
  PRODUCT_NOT_RECEIVED: ['produto nao recebido'],
  PRODUCT_NOT_AS_DESCRIBED: ['diferente do anunciado', 'produto diferente do anunciado'],
  FRAUD_SCAM: ['suspeita de golpe', 'golpe'],
  FRAUD_COERCION: ['transacao sob coacao', 'coacao'],
  FRAUD_ACCOUNT_TAKEOVER: ['invasao de conta'],
  DUPLICATE_CHARGE: ['cobranca em duplicidade', 'duplicidade'],
  OPERATIONAL_ERROR: ['erro operacional'],
  OTHER: ['outro motivo', 'outro'],
};

const PRODUCT_TEXT: Record<ProductType, string[]> = {
  PHYSICAL: ['fisico', 'produto fisico'],
  DIGITAL: ['digital', 'produto digital'],
  SERVICE: ['servico'],
  SUBSCRIPTION: ['assinatura'],
  TICKET: ['ingresso'],
  INFOPRODUCT: ['infoproduto'],
  MARKETPLACE: ['marketplace'],
  SAAS: ['saas'],
  OTHER: ['outro'],
};

function matchFromTable<T extends string>(
  value: string,
  table: Record<T, string[]>,
  keys: readonly T[],
): T | null {
  const wanted = normalize(value);
  for (const key of keys) {
    if (table[key].includes(wanted)) return key;
  }
  return null;
}

/** `28/08/2026 10:47` -> ISO com o fuso assumido. Sem data valida, `null`. */
export function parseBrazilianDateTime(value: string): string | null {
  const match = /(\d{2})\/(\d{2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  if (!match) return null;
  const [, day, month, year, hour = '00', minute = '00', second = '00'] = match as unknown as [
    string,
    string,
    string,
    string,
    string | undefined,
    string | undefined,
    string | undefined,
  ];
  const iso = `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute}:${second}${ASSUMED_OFFSET}`;
  // Data impossivel (31/02) e recusada aqui, e nao gravada como outro dia.
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getUTCDate() !== Number(day) && parsed.getUTCDate() !== Number(day) + 1) return null;
  return parsed.toISOString();
}

/** `R$ 349,90` -> 34990. Formato brasileiro: ponto milhar, virgula decimal. */
export function parseBrazilianMoney(value: string): number | null {
  const match = /(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/.exec(value.replace(/\s/g, ''));
  if (!match) return null;
  const whole = (match[1] as string).replace(/\./g, '');
  const cents = (match[2] ?? '').padEnd(2, '0');
  const total = Number(`${whole}${cents}`);
  return Number.isFinite(total) ? total : null;
}

const EMPTY_DRAFT: MedNoticeDraft = {
  medId: null,
  transactionId: null,
  endToEndId: null,
  pixId: null,
  amountCents: null,
  currency: null,
  transactionAt: null,
  openedAt: null,
  responseDeadlineAt: null,
  reason: null,
  reasonDescription: null,
  requestingInstitution: null,
  productType: null,
  payerName: null,
  payerDocument: null,
  payerEmail: null,
  payerPhone: null,
  merchantName: null,
  additionalInformation: null,
};

const DATE_FIELDS = new Set<keyof MedNoticeDraft>([
  'openedAt',
  'responseDeadlineAt',
  'transactionAt',
]);

/**
 * Junta um valor que continua na linha seguinte.
 *
 * O aviso real quebrava a descricao em duas linhas. Sem isto, `descricao`
 * guardaria meia frase — e meia frase e pior que nenhuma, porque parece
 * inteira.
 */
function collectValue(lines: string[], start: number): { value: string; next: number } {
  let value = lines[start] ?? '';
  let index = start + 1;
  while (index < lines.length) {
    const line = lines[index] as string;
    if (line.trim() === '') break;
    if (looksLikeLabel(line)) break;
    if (SECTIONS.has(normalize(line))) break;
    value += ` ${line.trim()}`;
    index += 1;
  }
  return { value: value.trim(), next: index };
}

/** Le o texto ja decodificado de um aviso. */
export function readMedNoticeText(text: string): MedNoticeReading {
  const draft: MedNoticeDraft = { ...EMPTY_DRAFT };
  const unmapped: { label: string; value: string }[] = [];
  const assumedTimezone: (keyof MedNoticeDraft)[] = [];
  const lines = text.split(/\r?\n/);

  let sawAdditionalHeading = false;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] as string;
    const line = raw.trim();
    if (line === '') continue;

    if (SECTIONS.has(normalize(line))) {
      sawAdditionalHeading = normalize(line) === 'informacoes adicionais';
      continue;
    }

    // Bloco livre: o texto que segue o titulo, ate a linha em branco.
    if (sawAdditionalHeading) {
      const collected = collectValue(lines, i);
      draft.additionalInformation = collected.value;
      i = collected.next - 1;
      sawAdditionalHeading = false;
      continue;
    }

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const label = normalize(line.slice(0, colon));
    const field = LABELS[label];
    const collected = collectValue([line.slice(colon + 1).trim(), ...lines.slice(i + 1)], 0);
    i += collected.next - 1;
    const value = collected.value;
    if (value === '') continue;

    if (!field) {
      unmapped.push({ label: line.slice(0, colon).trim(), value });
      continue;
    }

    if (DATE_FIELDS.has(field)) {
      const parsed = parseBrazilianDateTime(value);
      if (parsed) {
        draft[field] = parsed as never;
        assumedTimezone.push(field);
      }
      continue;
    }

    if (field === 'amountCents') {
      draft.amountCents = parseBrazilianMoney(value);
      if (/R\$/i.test(value)) draft.currency = 'BRL';
      continue;
    }

    if (field === 'reason') {
      const reason = matchFromTable(value, REASON_TEXT, MED_REASONS);
      if (reason) draft.reason = reason;
      // Motivo que nao reconhecemos nao vira OTHER: OTHER e uma escolha, e
      // quem escolhe e a pessoa. Fica em unmapped, com o texto que veio.
      else unmapped.push({ label: 'Motivo', value });
      continue;
    }

    if (field === 'productType') {
      const product = matchFromTable(value, PRODUCT_TEXT, PRODUCT_TYPES);
      if (product) draft.productType = product;
      else unmapped.push({ label: 'Tipo de produto', value });
      continue;
    }

    if (field === 'payerDocument') {
      draft.payerDocument = value.replace(/\D/g, '') || null;
      continue;
    }

    draft[field] = value as never;
  }

  const missing = (Object.keys(draft) as (keyof MedNoticeDraft)[]).filter(
    (key) => draft[key] === null,
  );

  return {
    draft,
    missing,
    unmapped,
    assumedTimezone,
    // Um aviso sem identificador nao da para tratar como aviso: sem ele nao ha
    // como evitar criar o mesmo caso duas vezes.
    recognized: draft.medId !== null,
  };
}

/** Le a mensagem crua (RFC 822), decodificando antes de casar rotulo. */
export function readMedNotice(rawMessage: string): MedNoticeReading & { subject: string | null } {
  const message = parseMessage(rawMessage);
  return {
    ...readMedNoticeText(message.text),
    subject: message.headers.get('subject') ?? null,
  };
}
