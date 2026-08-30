import type { EvidenceSource, IsoDateTime, JsonValue } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { formatDateTimeSmart } from '@/lib/format';

/**
 * Comprovante de comunicação — reconstrução da mensagem que o estabelecimento
 * enviou ao cliente (confirmação de compra, entrega de acesso, confirmação de
 * entrega).
 *
 * O que esta feature é, e o que ela NÃO é:
 *
 *  - É a reconstrução, na visão do cliente, de uma comunicação que o
 *    estabelecimento realmente enviou. O prazo curto do MED não deixa esperar
 *    o comprador confirmar que recebeu; o que o estabelecimento controla e pode
 *    comprovar é o envio. Isto é a mesma lógica do registro manual de marco de
 *    entrega: transcrição de um fato real, gravada com origem.
 *
 *  - NÃO é uma captura da caixa de entrada do cliente, e nunca pode ser
 *    apresentada como tal. Todo artefato gerado carrega um selo visível de
 *    reconstrução (RECONSTRUCTION_STAMP). Sem esse selo o documento seria uma
 *    falsificação; com ele, é a representação honesta do que foi enviado.
 *
 * A reconstrução é evidência documental (categoria DOCUMENTATION, força WEAK) e
 * fica fora da matriz de requisitos: ela ilustra a entrega, não infla o score
 * nem gera afirmação factual automática.
 */

export const COMMUNICATION_TEMPLATES = [
  'PURCHASE_CONFIRMATION',
  'ACCESS_DELIVERY',
  'DELIVERY_CONFIRMATION',
  'GENERIC',
] as const;
export type CommunicationTemplate = (typeof COMMUNICATION_TEMPLATES)[number];

export const COMMUNICATION_TEMPLATE_LABEL: Record<CommunicationTemplate, string> = {
  PURCHASE_CONFIRMATION: 'Confirmação de compra',
  ACCESS_DELIVERY: 'Entrega de acesso',
  DELIVERY_CONFIRMATION: 'Confirmação de entrega',
  GENERIC: 'Mensagem ao cliente',
};

/** Texto do selo. Vai na tela, na rota de impressão e no PDF, sem exceção. */
export const RECONSTRUCTION_STAMP =
  'RECONSTRUÇÃO — Representação do painel de envios, gerada a partir dos registros do caso. ' +
  'Não é uma captura real do painel administrativo.';

/**
 * Quem efetivamente envia as comunicações transacionais desta operação — o
 * gateway, não a loja. A peça representa o painel de envios dele, então o
 * remetente é sempre este, independente do estabelecimento do caso.
 */
export const EMAIL_SENDER_NAME = 'IronPay';

/** Conteúdo estruturado da reconstrução, guardado no `value` da evidência. */
export interface CommunicationReceipt {
  template: CommunicationTemplate;
  from: string;
  to: string;
  subject: string;
  sentAt: IsoDateTime | null;
  body: string;
  /** Referência do que foi entregue: link de acesso, código, rastreio. */
  reference?: string | null;
}

/** Ação em destaque derivada da referência (link de acesso, código, rastreio). */
export interface ClientEmailAction {
  kind: 'LINK' | 'CODE' | 'TRACKING' | 'TEXT';
  label: string;
  value: string;
}

/** Modelo de visão do cliente, pronto para renderizar (UI e PDF). */
export interface ClientEmailView {
  template: CommunicationTemplate;
  from: string;
  /** Inicial do remetente, para o monograma da marca. */
  fromInitial: string;
  to: string;
  subject: string;
  sentAtLabel: string | null;
  paragraphs: string[];
  reference: string | null;
  /** Referência apresentada como ação em destaque, quando há uma. */
  action: ClientEmailAction | null;
  stamp: string;
}

function deriveAction(
  template: CommunicationTemplate,
  reference: string | null | undefined,
): ClientEmailAction | null {
  const value = reference?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return {
      kind: 'LINK',
      label: template === 'ACCESS_DELIVERY' ? 'Acessar agora' : 'Abrir link',
      value,
    };
  }
  if (template === 'DELIVERY_CONFIRMATION') {
    return { kind: 'TRACKING', label: 'Código de rastreio', value };
  }
  if (template === 'ACCESS_DELIVERY') {
    return { kind: 'CODE', label: 'Acessar agora', value };
  }
  return { kind: 'TEXT', label: 'Referência', value };
}

export function buildClientEmailView(receipt: CommunicationReceipt): ClientEmailView {
  return {
    template: receipt.template,
    from: receipt.from,
    fromInitial: (receipt.from.trim()[0] ?? '?').toUpperCase(),
    to: receipt.to,
    subject: receipt.subject,
    sentAtLabel: formatDateTimeSmart(receipt.sentAt),
    paragraphs: receipt.body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0),
    reference: receipt.reference ?? null,
    action: deriveAction(receipt.template, receipt.reference),
    stamp: RECONSTRUCTION_STAMP,
  };
}

/**
 * Rascunho inicial de uma reconstrução, a partir do que o caso já tem.
 *
 * Preenche remetente, destinatário, data e um corpo padrão apenas com dados
 * que já existem no caso — nunca inventa e-mail, data ou produto. Campos sem
 * dado ficam vazios para o operador completar com o que realmente enviou.
 */
export function draftCommunication(
  medCase: MedCase,
  template: CommunicationTemplate,
): CommunicationReceipt {
  const { customer, order, digitalDelivery, tracking, med } = medCase;
  const to =
    digitalDelivery?.sentTo ??
    customer?.identification.email ??
    med.payer.email ??
    '';
  const productName = order?.items[0]?.name ?? '';
  const sentAt = digitalDelivery?.sentAt ?? order?.placedAt ?? med.transactionAt ?? null;

  const base = { from: EMAIL_SENDER_NAME, to, sentAt };

  switch (template) {
    case 'PURCHASE_CONFIRMATION':
      return {
        ...base,
        template,
        subject: productName
          ? `Confirmação da sua compra — ${productName}`
          : 'Confirmação da sua compra',
        body:
          `Olá,\n\n` +
          `Recebemos e confirmamos a sua compra${productName ? ` de ${productName}` : ''}${
            order?.externalId ? ` (pedido ${order.externalId})` : ''
          }.\n\n` +
          `Qualquer dúvida, é só responder a este e-mail.`,
        reference: order?.externalId ?? null,
      };
    case 'ACCESS_DELIVERY':
      return {
        ...base,
        template,
        subject: productName ? `Seu acesso — ${productName}` : 'Seu acesso está liberado',
        body:
          `Olá,\n\n` +
          `Seu acesso${productName ? ` a ${productName}` : ''} já está liberado.\n\n` +
          `[Inclua aqui o link ou as instruções de acesso que foram realmente enviados.]`,
        reference: digitalDelivery?.platform ?? null,
      };
    case 'DELIVERY_CONFIRMATION':
      return {
        ...base,
        template,
        subject: 'Seu pedido foi entregue',
        body:
          `Olá,\n\n` +
          `Seu pedido${order?.externalId ? ` ${order.externalId}` : ''} foi entregue` +
          `${tracking?.trackingCode ? ` (rastreio ${tracking.trackingCode})` : ''}.\n\n` +
          `Obrigado pela preferência.`,
        reference: tracking?.trackingCode ?? null,
      };
    default:
      return { ...base, template, subject: '', body: '', reference: null };
  }
}

/** Lê a reconstrução de volta do `value` da evidência, com validação leve. */
export function parseCommunicationReceipt(value: JsonValue): CommunicationReceipt | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, JsonValue>;
  const str = (key: string): string =>
    typeof record[key] === 'string' ? (record[key] as string) : '';
  const template = str('template') as CommunicationTemplate;
  if (!COMMUNICATION_TEMPLATES.includes(template)) return null;
  return {
    template,
    from: str('from'),
    to: str('to'),
    subject: str('subject'),
    sentAt: typeof record.sentAt === 'string' ? (record.sentAt as string) : null,
    body: str('body'),
    reference: typeof record.reference === 'string' ? (record.reference as string) : null,
  };
}

/** Origens permitidas para uma reconstrução: quem atesta o envio. */
export const COMMUNICATION_SOURCES: EvidenceSource[] = ['MERCHANT', 'MANUAL', 'API', 'SHOPIFY', 'ERP'];
