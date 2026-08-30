import type {
  Claim,
  Evidence,
  EvidenceCategory,
  EvidenceType,
  ProductType,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { evidenceStringValue, firstUsableEvidence } from '@/domain/case';
import { weakestOf } from '@/domain/evidence/strength';
import { formatAmount, formatDate, formatDateTime } from '@/lib/format';

/**
 * Claim templates.
 *
 * A claim is a factual sentence the defense is allowed to make. Each template
 * declares exactly which evidence types must be present for the sentence to be
 * allowed at all (`requires`), and renders the sentence only from those values.
 *
 * The question "which evidence lets us say this?" always has an answer, because
 * the answer is the template's own `requires` list, materialised as
 * `Claim.evidenceIds`. A template that cannot fill every slot returns null and
 * the sentence is simply not made.
 */

export interface ClaimContext {
  medCase: MedCase;
  /** Raw string value of the first usable evidence of a type. */
  value: (type: EvidenceType) => string | null;
  /** Same, formatted as a pt-BR date. Null when absent or unparseable. */
  date: (type: EvidenceType) => string | null;
  dateTime: (type: EvidenceType) => string | null;
}

export interface ClaimTemplate {
  id: string;
  category: EvidenceCategory;
  /** Every one of these must be AVAILABLE for the claim to be considered. */
  requires: EvidenceType[];
  /** Restricts the template to certain product types. Unset means all. */
  productTypes?: ProductType[];
  render: (context: ClaimContext) => string | null;
}

/** Rotulos dos canais, usados apenas para redigir a frase da defesa. */
const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: 'e-mail',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  PLATFORM: 'área de membros da plataforma',
  OTHER: 'canal informado no pedido',
};

const PHYSICAL_TYPES: ProductType[] = ['PHYSICAL', 'MARKETPLACE'];
const DIGITAL_TYPES: ProductType[] = [
  'DIGITAL',
  'INFOPRODUCT',
  'SAAS',
  'SUBSCRIPTION',
  'TICKET',
];
const SERVICE_TYPES: ProductType[] = ['SERVICE'];

export const CLAIM_TEMPLATES: ClaimTemplate[] = [
  {
    id: 'transaction.executed',
    category: 'TRANSACTION',
    requires: ['END_TO_END_ID'],
    render: ({ medCase, value }) => {
      const endToEnd = value('END_TO_END_ID');
      if (!endToEnd) return null;
      const amount = formatAmount(medCase.med.amount, medCase.med.currency);
      return `A transação contestada, no valor de ${amount}, está registrada sob o end-to-end ID ${endToEnd}.`;
    },
  },
  {
    id: 'transaction.authorized',
    category: 'TRANSACTION',
    requires: ['PAYMENT_AUTHORIZATION'],
    render: ({ value }) => {
      const authorization = value('PAYMENT_AUTHORIZATION');
      if (!authorization) return null;
      return `O pagamento foi autorizado pelo provedor sob a referência ${authorization}.`;
    },
  },
  {
    id: 'order.placed',
    category: 'TRANSACTION',
    requires: ['ORDER_RECORD', 'ORDER_PLACED_AT'],
    render: ({ value, dateTime }) => {
      const order = value('ORDER_RECORD');
      const placedAt = dateTime('ORDER_PLACED_AT');
      if (!order || !placedAt) return null;
      return `O pedido ${order} foi registrado em ${placedAt}.`;
    },
  },
  {
    id: 'identity.document_match',
    category: 'IDENTITY',
    requires: ['PAYER_DOCUMENT_MATCH', 'CUSTOMER_DOCUMENT'],
    render: ({ value }) => {
      const document = value('CUSTOMER_DOCUMENT');
      if (!document) return null;
      return `O documento utilizado no pagamento (${document}) corresponde ao documento cadastrado no pedido.`;
    },
  },
  {
    id: 'identity.email_match',
    category: 'IDENTITY',
    requires: ['PAYER_EMAIL_MATCH', 'CUSTOMER_EMAIL'],
    render: ({ value }) => {
      const email = value('CUSTOMER_EMAIL');
      if (!email) return null;
      return `O e-mail utilizado na compra (${email}) corresponde ao e-mail do titular do pagamento.`;
    },
  },
  {
    id: 'identity.account_history',
    category: 'IDENTITY',
    requires: ['ACCOUNT_CREATED_AT'],
    render: ({ date }) => {
      const createdAt = date('ACCOUNT_CREATED_AT');
      if (!createdAt) return null;
      return `O cliente possui cadastro ativo desde ${createdAt}.`;
    },
  },
  {
    id: 'technical.checkout_session',
    category: 'TECHNICAL',
    requires: ['CHECKOUT_IP'],
    render: ({ value }) => {
      const ip = value('CHECKOUT_IP');
      if (!ip) return null;
      const device = value('DEVICE_FINGERPRINT');
      return device
        ? `A compra foi realizada a partir do IP ${ip}, no dispositivo identificado por ${device}.`
        : `A compra foi realizada a partir do IP ${ip}.`;
    },
  },
  {
    id: 'technical.terms_accepted',
    category: 'TECHNICAL',
    requires: ['TERMS_ACCEPTANCE'],
    render: ({ value }) => {
      const acceptance = value('TERMS_ACCEPTANCE');
      if (!acceptance) return null;
      return `Os termos de uso foram aceitos no momento da compra (registro ${acceptance}).`;
    },
  },
  {
    id: 'delivery.shipped',
    category: 'DELIVERY',
    productTypes: PHYSICAL_TYPES,
    requires: ['TRACKING_CODE', 'POSTED_AT'],
    render: ({ value, date }) => {
      const code = value('TRACKING_CODE');
      const postedAt = date('POSTED_AT');
      if (!code || !postedAt) return null;
      const carrier = value('CARRIER');
      return carrier
        ? `O pedido foi postado em ${postedAt} pela transportadora ${carrier}, sob o código de rastreio ${code}.`
        : `O pedido foi postado em ${postedAt} sob o código de rastreio ${code}.`;
    },
  },
  {
    id: 'delivery.delivered',
    category: 'DELIVERY',
    productTypes: PHYSICAL_TYPES,
    requires: ['DELIVERY_CONFIRMATION', 'DELIVERED_AT'],
    render: ({ dateTime }) => {
      const deliveredAt = dateTime('DELIVERED_AT');
      if (!deliveredAt) return null;
      return `A entrega do pedido foi registrada em ${deliveredAt}.`;
    },
  },
  {
    id: 'delivery.receiver',
    category: 'DELIVERY',
    productTypes: PHYSICAL_TYPES,
    requires: ['RECEIVER_NAME', 'DELIVERED_AT'],
    render: ({ value }) => {
      const receiver = value('RECEIVER_NAME');
      if (!receiver) return null;
      return `A mercadoria foi recebida por ${receiver}.`;
    },
  },
  {
    id: 'delivery.address',
    category: 'DELIVERY',
    productTypes: PHYSICAL_TYPES,
    requires: ['SHIPPING_ADDRESS', 'DELIVERY_CONFIRMATION'],
    render: ({ value }) => {
      const address = value('SHIPPING_ADDRESS');
      if (!address) return null;
      return `A entrega ocorreu no endereço informado no momento da compra: ${address}.`;
    },
  },
  {
    id: 'digital.access_sent',
    category: 'DELIVERY',
    productTypes: DIGITAL_TYPES,
    requires: ['ACCESS_SENT_AT', 'ACCESS_SENT_TO'],
    render: ({ value, dateTime }) => {
      const sentTo = value('ACCESS_SENT_TO');
      const sentAt = dateTime('ACCESS_SENT_AT');
      if (!sentTo || !sentAt) return null;
      const channel = value('ACCESS_DELIVERY_CHANNEL');
      const channelLabel = channel ? CHANNEL_LABEL[channel] : null;
      return channelLabel
        ? `O acesso ao produto adquirido foi enviado para ${sentTo} em ${sentAt}, por ${channelLabel}.`
        : `O acesso ao produto adquirido foi enviado para ${sentTo} em ${sentAt}.`;
    },
  },
  {
    id: 'service.delivered_access',
    category: 'DELIVERY',
    productTypes: SERVICE_TYPES,
    requires: ['ACCESS_SENT_AT', 'ACCESS_SENT_TO'],
    render: ({ value, dateTime }) => {
      const sentTo = value('ACCESS_SENT_TO');
      const sentAt = dateTime('ACCESS_SENT_AT');
      if (!sentTo || !sentAt) return null;
      return `Os dados de acesso ao serviço contratado foram enviados para ${sentTo} em ${sentAt}.`;
    },
  },
  {
    id: 'digital.first_access',
    category: 'DELIVERY',
    productTypes: DIGITAL_TYPES,
    requires: ['FIRST_ACCESS_AT'],
    render: ({ dateTime }) => {
      const firstAccess = dateTime('FIRST_ACCESS_AT');
      if (!firstAccess) return null;
      return `O primeiro acesso ao produto digital adquirido ocorreu em ${firstAccess}.`;
    },
  },
  {
    id: 'digital.access_volume',
    category: 'DELIVERY',
    productTypes: DIGITAL_TYPES,
    requires: ['ACCESS_LOG', 'ACCESS_COUNT'],
    render: ({ value }) => {
      const count = value('ACCESS_COUNT');
      if (!count) return null;
      return `O sistema registra ${count} acessos do titular ao conteúdo adquirido.`;
    },
  },
  {
    id: 'digital.download',
    category: 'DELIVERY',
    productTypes: DIGITAL_TYPES,
    requires: ['DOWNLOAD_LOG'],
    render: ({ value }) => {
      const log = value('DOWNLOAD_LOG');
      if (!log) return null;
      return `Há registro de download do material entregue (referência ${log}).`;
    },
  },
  {
    id: 'service.accepted',
    category: 'DELIVERY',
    productTypes: SERVICE_TYPES,
    requires: ['SERVICE_ACCEPTANCE'],
    render: ({ value }) => {
      const acceptance = value('SERVICE_ACCEPTANCE');
      if (!acceptance) return null;
      return `A contratacao do serviço foi aceita pelo contratante (registro ${acceptance}).`;
    },
  },
  {
    id: 'service.executed',
    category: 'DELIVERY',
    productTypes: SERVICE_TYPES,
    requires: ['SERVICE_EXECUTION'],
    render: ({ value }) => {
      const execution = value('SERVICE_EXECUTION');
      if (!execution) return null;
      return `A execucao do serviço está registrada sob a referência ${execution}.`;
    },
  },
  {
    id: 'documentation.invoice',
    category: 'DOCUMENTATION',
    requires: ['INVOICE'],
    render: ({ value }) => {
      const invoice = value('INVOICE');
      if (!invoice) return null;
      return `Foi emitida nota fiscal para a operação (${invoice}).`;
    },
  },
  {
    id: 'documentation.communication',
    category: 'DOCUMENTATION',
    requires: ['COMMUNICATION_HISTORY'],
    render: ({ value }) => {
      const history = value('COMMUNICATION_HISTORY');
      if (!history) return null;
      return `Há histórico de comunicação com o cliente referente a esta compra (${history}).`;
    },
  },
];

function buildContext(medCase: MedCase): ClaimContext {
  const lookup = (type: EvidenceType): Evidence | null =>
    firstUsableEvidence(medCase.evidences, type);

  const value = (type: EvidenceType): string | null => {
    const evidence = lookup(type);
    if (!evidence) return null;
    return evidence.displayValue ?? evidenceStringValue(evidence);
  };

  return {
    medCase,
    value,
    date: (type) => {
      const evidence = lookup(type);
      if (!evidence) return null;
      const raw = evidenceStringValue(evidence);
      return raw ? formatDate(raw) : null;
    },
    dateTime: (type) => {
      const evidence = lookup(type);
      if (!evidence) return null;
      const raw = evidenceStringValue(evidence);
      return raw ? formatDateTime(raw) : null;
    },
  };
}

export interface BuildClaimsInput {
  medCase: MedCase;
  /** Evidence types the Evidence Engine reported as AVAILABLE. */
  availableTypes: EvidenceType[];
  productType: ProductType;
}

export function buildClaims(input: BuildClaimsInput): Claim[] {
  const { medCase, availableTypes, productType } = input;
  const available = new Set(availableTypes);
  const context = buildContext(medCase);
  const claims: Claim[] = [];

  for (const template of CLAIM_TEMPLATES) {
    if (template.productTypes && !template.productTypes.includes(productType)) continue;
    if (!template.requires.every((type) => available.has(type))) continue;

    const supporting = template.requires
      .map((type) => firstUsableEvidence(medCase.evidences, type))
      .filter((evidence): evidence is Evidence => evidence !== null);

    // A template can only run when every required slot resolved to a real
    // evidence record. Anything less and the sentence is not made.
    if (supporting.length !== template.requires.length) continue;

    const statement = template.render(context);
    if (!statement) continue;

    claims.push({
      id: template.id,
      category: template.category,
      statement,
      evidenceIds: supporting.map((evidence) => evidence.id),
      strength: weakestOf(supporting) ?? 'WEAK',
    });
  }

  return claims;
}
