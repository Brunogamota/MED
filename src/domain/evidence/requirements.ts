import type {
  EvidenceCategory,
  EvidenceType,
  MedReason,
  Necessity,
  ProductType,
} from '@/domain/types';
import { EVIDENCE_CATEGORIES } from '@/domain/types';

/**
 * Which evidence a defense needs, as an explicit matrix of
 * (product type) x (MED reason). Nothing here is inferred at runtime and no
 * model decides what is required — the rules live in code and are tested.
 */

export interface EvidenceRequirement {
  type: EvidenceType;
  necessity: Necessity;
}

export type CategoryWeights = Record<EvidenceCategory, number>;

interface RequirementProfile {
  categoryWeights: CategoryWeights;
  requirements: EvidenceRequirement[];
}

const NECESSITY_RANK: Record<Necessity, number> = {
  REQUIRED: 3,
  RECOMMENDED: 2,
  OPTIONAL: 1,
};

function req(type: EvidenceType, necessity: Necessity): EvidenceRequirement {
  return { type, necessity };
}

/** Evidence every defense wants, regardless of what was sold. */
const BASE_REQUIREMENTS: EvidenceRequirement[] = [
  req('CUSTOMER_NAME', 'REQUIRED'),
  req('CUSTOMER_DOCUMENT', 'REQUIRED'),
  req('CUSTOMER_EMAIL', 'RECOMMENDED'),
  req('CUSTOMER_PHONE', 'OPTIONAL'),
  req('PAYER_DOCUMENT_MATCH', 'RECOMMENDED'),
  req('PAYER_NAME_MATCH', 'OPTIONAL'),
  req('PAYER_EMAIL_MATCH', 'OPTIONAL'),
  req('ACCOUNT_CREATED_AT', 'OPTIONAL'),
  req('TRANSACTION_RECEIPT', 'REQUIRED'),
  req('END_TO_END_ID', 'REQUIRED'),
  req('PAYMENT_AUTHORIZATION', 'RECOMMENDED'),
  req('ORDER_RECORD', 'REQUIRED'),
  req('ORDER_PLACED_AT', 'REQUIRED'),
  req('CHECKOUT_IP', 'RECOMMENDED'),
  req('DEVICE_FINGERPRINT', 'RECOMMENDED'),
  req('USER_AGENT', 'OPTIONAL'),
  req('TERMS_ACCEPTANCE', 'OPTIONAL'),
  req('ANTIFRAUD_SCORE', 'OPTIONAL'),
  req('COMMUNICATION_HISTORY', 'OPTIONAL'),
  req('REFUND_POLICY', 'OPTIONAL'),
];

const PHYSICAL_REQUIREMENTS: EvidenceRequirement[] = [
  req('SHIPPING_ADDRESS', 'REQUIRED'),
  req('CARRIER', 'RECOMMENDED'),
  req('TRACKING_CODE', 'REQUIRED'),
  req('POSTED_AT', 'RECOMMENDED'),
  req('TRACKING_EVENTS', 'RECOMMENDED'),
  req('DELIVERY_CONFIRMATION', 'RECOMMENDED'),
  req('DELIVERED_AT', 'RECOMMENDED'),
  req('RECEIVER_NAME', 'OPTIONAL'),
  req('DELIVERY_RECEIPT_SIGNED', 'OPTIONAL'),
  req('INVOICE', 'REQUIRED'),
];

const DIGITAL_REQUIREMENTS: EvidenceRequirement[] = [
  // A entrega do digital e o envio do acesso. O uso pelo cliente reforca, mas
  // depender dele deixaria a defesa refem de uma confirmacao que o comprador
  // contestante nao tem motivo para dar.
  req('ACCESS_SENT_AT', 'REQUIRED'),
  req('ACCESS_SENT_TO', 'REQUIRED'),
  req('ACCESS_DELIVERY_CHANNEL', 'RECOMMENDED'),
  req('FIRST_ACCESS_AT', 'RECOMMENDED'),
  req('ACCESS_LOG', 'RECOMMENDED'),
  req('ACCESS_COUNT', 'RECOMMENDED'),
  req('CONTENT_CONSUMPTION', 'RECOMMENDED'),
  req('DOWNLOAD_LOG', 'RECOMMENDED'),
  req('LOGIN_LOG', 'RECOMMENDED'),
  req('PASSWORD_CHANGE', 'OPTIONAL'),
  req('SESSION_LOG', 'RECOMMENDED'),
  req('INVOICE', 'RECOMMENDED'),
];

const SERVICE_REQUIREMENTS: EvidenceRequirement[] = [
  req('SERVICE_DESCRIPTION', 'REQUIRED'),
  req('SERVICE_ACCEPTANCE', 'REQUIRED'),
  req('SERVICE_CONTRACT', 'RECOMMENDED'),
  req('SERVICE_EXECUTION', 'REQUIRED'),
  req('SERVICE_SCHEDULE', 'RECOMMENDED'),
  req('SERVICE_PROFESSIONAL', 'OPTIONAL'),
  req('SERVICE_USAGE_PROOF', 'RECOMMENDED'),
  req('INVOICE', 'RECOMMENDED'),
];

const GENERIC_REQUIREMENTS: EvidenceRequirement[] = [
  req('INVOICE', 'RECOMMENDED'),
  req('SESSION_LOG', 'OPTIONAL'),
];

const PHYSICAL_WEIGHTS: CategoryWeights = {
  IDENTITY: 20,
  TRANSACTION: 20,
  DELIVERY: 30,
  TECHNICAL: 15,
  DOCUMENTATION: 15,
};

const DIGITAL_WEIGHTS: CategoryWeights = {
  IDENTITY: 20,
  TRANSACTION: 20,
  DELIVERY: 30,
  TECHNICAL: 20,
  DOCUMENTATION: 10,
};

const SERVICE_WEIGHTS: CategoryWeights = {
  IDENTITY: 20,
  TRANSACTION: 20,
  DELIVERY: 30,
  TECHNICAL: 10,
  DOCUMENTATION: 20,
};

const GENERIC_WEIGHTS: CategoryWeights = {
  IDENTITY: 25,
  TRANSACTION: 30,
  DELIVERY: 15,
  TECHNICAL: 15,
  DOCUMENTATION: 15,
};

const PROFILES: Record<ProductType, RequirementProfile> = {
  PHYSICAL: { categoryWeights: PHYSICAL_WEIGHTS, requirements: PHYSICAL_REQUIREMENTS },
  MARKETPLACE: { categoryWeights: PHYSICAL_WEIGHTS, requirements: PHYSICAL_REQUIREMENTS },
  DIGITAL: { categoryWeights: DIGITAL_WEIGHTS, requirements: DIGITAL_REQUIREMENTS },
  INFOPRODUCT: { categoryWeights: DIGITAL_WEIGHTS, requirements: DIGITAL_REQUIREMENTS },
  SAAS: { categoryWeights: DIGITAL_WEIGHTS, requirements: DIGITAL_REQUIREMENTS },
  SUBSCRIPTION: { categoryWeights: DIGITAL_WEIGHTS, requirements: DIGITAL_REQUIREMENTS },
  TICKET: { categoryWeights: DIGITAL_WEIGHTS, requirements: DIGITAL_REQUIREMENTS },
  SERVICE: { categoryWeights: SERVICE_WEIGHTS, requirements: SERVICE_REQUIREMENTS },
  OTHER: { categoryWeights: GENERIC_WEIGHTS, requirements: GENERIC_REQUIREMENTS },
};

/**
 * Reason-driven overlay. A MED opened for "product not received" makes delivery
 * evidence mandatory; one opened for "unrecognized transaction" makes identity
 * and technical evidence mandatory. Only escalation is possible — an overlay
 * can never make a required item optional.
 */
interface ReasonOverlay {
  escalate: EvidenceRequirement[];
  weightBias?: Partial<CategoryWeights>;
}

const REASON_OVERLAYS: Partial<Record<MedReason, ReasonOverlay>> = {
  UNRECOGNIZED_TRANSACTION: {
    escalate: [
      req('PAYER_DOCUMENT_MATCH', 'REQUIRED'),
      req('CHECKOUT_IP', 'REQUIRED'),
      req('DEVICE_FINGERPRINT', 'REQUIRED'),
      req('CUSTOMER_EMAIL', 'REQUIRED'),
    ],
    weightBias: { IDENTITY: 30, TECHNICAL: 25 },
  },
  PRODUCT_NOT_RECEIVED: {
    escalate: [
      req('TRACKING_EVENTS', 'REQUIRED'),
      req('DELIVERY_CONFIRMATION', 'REQUIRED'),
      req('DELIVERED_AT', 'REQUIRED'),
      req('ACCESS_SENT_AT', 'REQUIRED'),
      req('ACCESS_SENT_TO', 'REQUIRED'),
      req('SERVICE_EXECUTION', 'REQUIRED'),
    ],
    weightBias: { DELIVERY: 45 },
  },
  PRODUCT_NOT_AS_DESCRIBED: {
    escalate: [
      req('COMMUNICATION_HISTORY', 'REQUIRED'),
      req('REFUND_POLICY', 'RECOMMENDED'),
      req('SERVICE_DESCRIPTION', 'REQUIRED'),
    ],
    weightBias: { DOCUMENTATION: 25 },
  },
  FRAUD_SCAM: {
    escalate: [
      req('CHECKOUT_IP', 'REQUIRED'),
      req('DEVICE_FINGERPRINT', 'REQUIRED'),
      req('ANTIFRAUD_SCORE', 'RECOMMENDED'),
      req('COMMUNICATION_HISTORY', 'RECOMMENDED'),
    ],
    weightBias: { TECHNICAL: 25, IDENTITY: 25 },
  },
  FRAUD_COERCION: {
    escalate: [
      req('CHECKOUT_IP', 'REQUIRED'),
      req('COMMUNICATION_HISTORY', 'RECOMMENDED'),
    ],
    weightBias: { TECHNICAL: 25 },
  },
  FRAUD_ACCOUNT_TAKEOVER: {
    escalate: [
      req('CHECKOUT_IP', 'REQUIRED'),
      req('DEVICE_FINGERPRINT', 'REQUIRED'),
      req('LOGIN_LOG', 'REQUIRED'),
      req('SESSION_LOG', 'REQUIRED'),
      req('PASSWORD_CHANGE', 'RECOMMENDED'),
    ],
    weightBias: { TECHNICAL: 30, IDENTITY: 25 },
  },
  DUPLICATE_CHARGE: {
    escalate: [req('PAYMENT_AUTHORIZATION', 'REQUIRED'), req('END_TO_END_ID', 'REQUIRED')],
    weightBias: { TRANSACTION: 40 },
  },
};

/**
 * Rescales weights so they always total exactly 100. Rounding remainder goes to
 * the highest-weighted category, breaking ties by the fixed category order, so
 * the result is fully deterministic.
 */
export function normalizeWeights(weights: CategoryWeights): CategoryWeights {
  const total = EVIDENCE_CATEGORIES.reduce((sum, category) => sum + weights[category], 0);
  if (total <= 0) {
    throw new Error('Category weights must total a positive number');
  }
  const scaled = EVIDENCE_CATEGORIES.map((category) => ({
    category,
    exact: (weights[category] * 100) / total,
  }));
  const rounded = scaled.map((entry) => ({ ...entry, value: Math.floor(entry.exact) }));
  let remainder = 100 - rounded.reduce((sum, entry) => sum + entry.value, 0);

  const order = [...rounded].sort((a, b) => {
    if (b.exact !== a.exact) return b.exact - a.exact;
    return EVIDENCE_CATEGORIES.indexOf(a.category) - EVIDENCE_CATEGORIES.indexOf(b.category);
  });
  for (const entry of order) {
    if (remainder <= 0) break;
    entry.value += 1;
    remainder -= 1;
  }

  const result = {} as CategoryWeights;
  for (const entry of rounded) {
    result[entry.category] = entry.value;
  }
  return result;
}

export function resolveCategoryWeights(
  productType: ProductType,
  reason: MedReason,
): CategoryWeights {
  const base = PROFILES[productType].categoryWeights;
  const bias = REASON_OVERLAYS[reason]?.weightBias;
  if (!bias) return normalizeWeights(base);
  return normalizeWeights({ ...base, ...bias });
}

/**
 * Full requirement list for a case, strictest necessity winning when the same
 * evidence type appears in more than one layer.
 */
export function resolveRequirements(
  productType: ProductType,
  reason: MedReason,
): EvidenceRequirement[] {
  const merged = new Map<EvidenceType, Necessity>();

  const apply = (requirements: EvidenceRequirement[]) => {
    for (const requirement of requirements) {
      const current = merged.get(requirement.type);
      if (!current || NECESSITY_RANK[requirement.necessity] > NECESSITY_RANK[current]) {
        merged.set(requirement.type, requirement.necessity);
      }
    }
  };

  apply(BASE_REQUIREMENTS);
  apply(PROFILES[productType].requirements);

  const overlay = REASON_OVERLAYS[reason];
  if (overlay) {
    // An overlay only escalates evidence the profile already knows about, so a
    // physical-goods overlay never demands digital access logs.
    const known = new Set([
      ...BASE_REQUIREMENTS.map((r) => r.type),
      ...PROFILES[productType].requirements.map((r) => r.type),
    ]);
    apply(overlay.escalate.filter((requirement) => known.has(requirement.type)));
  }

  return [...merged.entries()].map(([type, necessity]) => ({ type, necessity }));
}
