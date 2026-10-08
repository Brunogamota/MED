import type { EvidenceSource, IsoDateTime, JsonValue } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { formatDateTimeSmart } from '@/lib/format';
import { isPlaceholderValue } from '@/domain/import/deliveryLog';

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
  'ORDER_TRACKING',
  'GENERIC',
] as const;
export type CommunicationTemplate = (typeof COMMUNICATION_TEMPLATES)[number];

export const COMMUNICATION_TEMPLATE_LABEL: Record<CommunicationTemplate, string> = {
  PURCHASE_CONFIRMATION: 'Confirmação de compra',
  ACCESS_DELIVERY: 'Entrega de acesso',
  DELIVERY_CONFIRMATION: 'Confirmação de entrega',
  ORDER_TRACKING: 'Acompanhamento do pedido',
  GENERIC: 'Mensagem ao cliente',
};

/** Texto do selo. Vai na tela, na rota de impressão e no PDF, sem exceção. */
export const RECONSTRUCTION_STAMP =
  'Documento gerado a partir do registro de envio. Não é uma captura de tela do painel.';

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
  /** Nome do destinatário, quando o caso tem — o e-mail sozinho não identifica ninguém no painel. */
  toName?: string | null;
  subject: string;
  sentAt: IsoDateTime | null;
  body: string;
  /** Referência do que foi entregue: link de acesso, código, rastreio. */
  reference?: string | null;
}

/**
 * Ação em destaque da mensagem — o botão que o cliente viu.
 *
 * `BUTTON` é o caso normal: toda mensagem transacional tem um call-to-action
 * ("Acessar agora", "Rastrear pedido", "Ver pedido"), e é ele que a
 * reconstrução mostra. `href` só existe quando a referência é uma URL de
 * verdade; sem URL o botão aparece igual, mas não é clicável — representar o
 * botão que existia não é inventar destino que não temos.
 */
export type ClientEmailAction =
  | {
      kind: 'BUTTON';
      label: string;
      valueLabel: string;
      value: string;
      href: string | null;
      /** Forma curta para a legenda impressa. */
      display: string;
    }
  | { kind: 'NOTE'; valueLabel: string; value: string; display: string };

/**
 * Como a referência aparece impressa.
 *
 * Link vira domínio mais reticências. O endereço completo de uma área de
 * membros é caminho de acesso: a peça vai para a instituição, entra em análise
 * de PLD e passa por gente que não tem nada a ver com a compra. O botão
 * continua levando ao destino real — o que sai do papel é só a URL por extenso.
 */
export function displayReference(value: string): string {
  if (!isUrl(value)) return value;
  try {
    return `${new URL(value).host}/…`;
  } catch {
    return value;
  }
}

/**
 * Como a referência se chama em cada modelo — para o rótulo do campo no
 * formulário e para a legenda abaixo do botão. Um nome concreto ("Link de
 * acesso") faz o operador entender o que preencher; "Referência do conteúdo"
 * não faz.
 */
export const REFERENCE_FIELD: Record<
  CommunicationTemplate,
  { label: string; hint: string; placeholder: string; buttonLabel: string | null }
> = {
  ACCESS_DELIVERY: {
    label: 'Link de acesso',
    hint: 'Vira o botão "Acessar agora" no comprovante.',
    placeholder: 'https://... ou nome da área de membros',
    buttonLabel: 'Acessar agora',
  },
  DELIVERY_CONFIRMATION: {
    label: 'Código de rastreio',
    hint: 'Vira o botão "Rastrear pedido" no comprovante.',
    placeholder: 'AA123456789BR',
    buttonLabel: 'Rastrear pedido',
  },
  ORDER_TRACKING: {
    label: 'Link de acompanhamento',
    hint: 'Vira o botão "Acompanhar pedido" no comprovante.',
    placeholder: 'https://... ou código de rastreio',
    buttonLabel: 'Acompanhar pedido',
  },
  PURCHASE_CONFIRMATION: {
    label: 'Número do pedido',
    hint: 'Vira o botão "Ver pedido" no comprovante.',
    placeholder: 'PED-1234',
    buttonLabel: 'Ver pedido',
  },
  GENERIC: {
    label: 'Link ou código (opcional)',
    hint: 'Se preencher, aparece em destaque no comprovante.',
    placeholder: 'https://... ou um código',
    buttonLabel: null,
  },
};

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Modelo de visão do cliente, pronto para renderizar (UI e PDF). */
export interface ClientEmailView {
  template: CommunicationTemplate;
  from: string;
  /** Inicial do remetente, para o monograma da marca. */
  fromInitial: string;
  to: string;
  toName: string | null;
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

  const field = REFERENCE_FIELD[template];
  const href = isUrl(value) ? value : null;

  // Modelo com call-to-action próprio: sempre botão, clicável ou não.
  if (field.buttonLabel) {
    return {
      kind: 'BUTTON',
      label: field.buttonLabel,
      valueLabel: field.label,
      value,
      href,
      display: displayReference(value),
    };
  }

  // Mensagem genérica: só vira botão quando há um link de verdade para abrir.
  if (href) {
    return {
      kind: 'BUTTON',
      label: 'Abrir link',
      valueLabel: 'Link',
      value,
      href,
      display: displayReference(value),
    };
  }
  return { kind: 'NOTE', valueLabel: 'Referência', value, display: displayReference(value) };
}

/**
 * Destinatario como a peca mostra: sem "Em branco"/"Padrao Nubank" no lugar do
 * nome e sem nome no lugar do e-mail. Comprovantes gravados antes da limpeza
 * na importacao saem certos sem precisar regerar.
 */
function displayRecipient(receipt: CommunicationReceipt): { to: string; toName: string | null } {
  const to = receipt.to.trim();
  const toIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) && !to.endsWith('.invalid');
  const name = receipt.toName?.trim() ?? '';
  const nameOk = !isPlaceholderValue(name) && !name.includes('@');
  const toLooksLikeName = !toIsEmail && !isPlaceholderValue(to) && /^[A-Za-zÀ-ÿ'.]+(\s+[A-Za-zÀ-ÿ'.]+)+$/.test(to);
  return {
    to: toIsEmail ? to : '',
    toName: nameOk ? name : toLooksLikeName ? to : null,
  };
}

/**
 * A saudacao gravada pode ter saido de um placeholder ("Olá, Em" de "Em
 * branco"). Ela e derivada do nome, entao acompanha o destinatario corrigido.
 */
function fixGreeting(paragraphs: string[], toName: string | null): string[] {
  const first = paragraphs[0];
  const match = first?.match(/^Olá,\s*(\S+)$/);
  if (!first || !match) return paragraphs;
  const firstName = toName?.split(/\s+/)[0] ?? null;
  if (firstName && match[1] === firstName) return paragraphs;
  return [firstName ? `Olá, ${firstName}` : 'Olá', ...paragraphs.slice(1)];
}

export function buildClientEmailView(receipt: CommunicationReceipt): ClientEmailView {
  const recipient = displayRecipient(receipt);
  return {
    template: receipt.template,
    from: receipt.from,
    fromInitial: (receipt.from.trim()[0] ?? '?').toUpperCase(),
    to: recipient.to,
    toName: recipient.toName,
    subject: receipt.subject,
    sentAtLabel: formatDateTimeSmart(receipt.sentAt),
    paragraphs: fixGreeting(
      receipt.body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0),
      recipient.toName,
    ),
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
/**
 * A última reconstrução salva deste modelo, se houver.
 *
 * O rascunho era montado do zero a cada carregamento da tela. O que o operador
 * digitava — endereço do cliente, link ou código de acesso, o texto real da
 * mensagem — não estava em lugar nenhum do caso, então sumia do formulário e
 * precisava ser redigitado a cada comprovante. Parecia apagar, e na prática
 * apagava: o trabalho existia só dentro da evidência já gravada.
 *
 * Agora o formulário volta de lá. A evidência é a fonte, e não o log: ela
 * guarda a mensagem inteira, enquanto a auditoria só registra destinatário e
 * assunto.
 */
function lastSavedReceipt(
  medCase: MedCase,
  template: CommunicationTemplate,
): CommunicationReceipt | null {
  const saved = medCase.evidences
    .filter((evidence) => evidence.type === 'DELIVERY_COMMUNICATION')
    .map((evidence) => ({ evidence, receipt: parseCommunicationReceipt(evidence.value) }))
    .filter((entry) => entry.receipt?.template === template)
    // Mais recente primeiro: é a última correção que o operador fez.
    .sort((a, b) => b.evidence.createdAt.localeCompare(a.evidence.createdAt));
  return saved[0]?.receipt ?? null;
}

export function draftCommunication(
  medCase: MedCase,
  template: CommunicationTemplate,
  options: { reuseSaved?: boolean } = {},
): CommunicationReceipt {
  // Retomar o que já foi escrito vem antes de propor um texto novo: o texto
  // novo é um palpite do sistema, e o salvo é o que de fato foi enviado. A
  // importação desliga isso: ela monta a peça com o envio que acabou de ler.
  const previous = options.reuseSaved === false ? null : lastSavedReceipt(medCase, template);
  if (previous) return previous;

  const { customer, order, digitalDelivery, tracking, med } = medCase;
  const to =
    digitalDelivery?.sentTo ??
    customer?.identification.email ??
    med.payer.email ??
    '';
  const toName = customer?.identification.name ?? med.payer.name ?? null;
  const productName = order?.items[0]?.name ?? '';
  const sentAt = digitalDelivery?.sentAt ?? order?.placedAt ?? med.transactionAt ?? null;

  const base = { from: EMAIL_SENDER_NAME, to, toName, sentAt };
  // Saudacao com o primeiro nome quando o caso tem o nome. E como a mensagem
  // transacional de verdade abre; "Ola," sozinho so aparece quando nao ha nome.
  const greeting =
    toName && !isPlaceholderValue(toName) ? `Olá, ${toName.trim().split(/\s+/)[0]}` : 'Olá';

  switch (template) {
    case 'PURCHASE_CONFIRMATION':
      return {
        ...base,
        template,
        subject: productName
          ? `Confirmação da sua compra — ${productName}`
          : 'Confirmação da sua compra',
        body:
          `${greeting}\n\n` +
          `Recebemos e confirmamos a sua compra${productName ? ` de ${productName}` : ''}${
            order?.externalId ? ` (pedido ${order.externalId})` : ''
          }.\n\n` +
          `Qualquer dúvida, é só responder a este e-mail.`,
        reference: order?.externalId ?? null,
      };
    case 'ACCESS_DELIVERY': {
      // O link entra como referencia e vira o botao. Quando o caso nao tem
      // link, o corpo pede o texto real em vez de fingir que ele existe — mas
      // quando tem, a instrucao ao operador sairia impressa no comprovante.
      const accessLink = digitalDelivery?.platform ?? null;
      return {
        ...base,
        template,
        subject: productName ? `Seu acesso — ${productName}` : 'Seu acesso está liberado',
        body:
          `${greeting}\n\n` +
          `Seu acesso${productName ? ` a ${productName}` : ''} já está liberado.` +
          (accessLink
            ? ''
            : `\n\n[Inclua aqui o link ou as instruções de acesso que foram realmente enviados.]`),
        reference: accessLink,
      };
    }
    case 'DELIVERY_CONFIRMATION':
      return {
        ...base,
        template,
        subject: 'Seu pedido foi entregue',
        body:
          `${greeting}\n\n` +
          `Seu pedido${order?.externalId ? ` ${order.externalId}` : ''} foi entregue` +
          `${tracking?.trackingCode ? ` (rastreio ${tracking.trackingCode})` : ''}.\n\n` +
          `Obrigado pela preferência.`,
        reference: tracking?.trackingCode ?? null,
      };
    case 'ORDER_TRACKING': {
      const link = tracking?.trackingCode ?? null;
      return { ...base, template, ...orderTrackingMessage(toName, link), reference: link };
    }
    default:
      return { ...base, template, subject: '', body: '', reference: null };
  }
}

function firstNameGreeting(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Olá, ${first}` : 'Olá';
}

/**
 * Mensagem de produto físico: o comprador acompanha o pedido até a entrega.
 *
 * O botão só é prometido no texto quando existe para onde ele levar. Sem link
 * nem código, a frase não manda clicar em nada que a peça não mostra.
 */
export function orderTrackingMessage(
  name: string | null | undefined,
  link: string | null,
): { subject: string; body: string } {
  return {
    subject: 'Obrigado pela sua compra',
    body:
      `${firstNameGreeting(name)}\n\nObrigado por comprar com a gente! ` +
      (link
        ? 'Clique no botão abaixo para acompanhar o seu pedido até ser entregue.'
        : 'Você vai poder acompanhar o seu pedido até ser entregue.'),
  };
}

/** Mensagem de produto digital: o acesso liberado. */
export function accessDeliveryMessage(name: string | null | undefined): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Seu acesso está liberado',
    body: `${firstNameGreeting(name)}\n\nSegue o seu acesso. Já está liberado.`,
  };
}

/** O tipo de produto decide a mensagem: físico se acompanha, digital se acessa. */
export type ProductKind = 'PHYSICAL' | 'DIGITAL';

const DIGITAL_TYPES = new Set(['DIGITAL', 'INFOPRODUCT', 'SUBSCRIPTION', 'SAAS', 'TICKET', 'SERVICE']);

/**
 * Físico ou digital, a partir do tipo de produto do caso.
 *
 * Marketplace e "outro" não dizem qual é, e o que não se sabe fica sem resposta:
 * quem decide nesse caso é o padrão que o operador escolheu na importação.
 */
export function productKindOf(productType: string | null | undefined): ProductKind | null {
  if (!productType) return null;
  if (productType === 'PHYSICAL') return 'PHYSICAL';
  return DIGITAL_TYPES.has(productType) ? 'DIGITAL' : null;
}

export function templateForKind(kind: ProductKind): CommunicationTemplate {
  return kind === 'PHYSICAL' ? 'ORDER_TRACKING' : 'ACCESS_DELIVERY';
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
    toName: typeof record.toName === 'string' ? (record.toName as string) : null,
    subject: str('subject'),
    sentAt: typeof record.sentAt === 'string' ? (record.sentAt as string) : null,
    body: str('body'),
    reference: typeof record.reference === 'string' ? (record.reference as string) : null,
  };
}

/** Origens permitidas para uma reconstrução: quem atesta o envio. */
export const COMMUNICATION_SOURCES: EvidenceSource[] = ['MERCHANT', 'MANUAL', 'API', 'SHOPIFY', 'ERP'];
