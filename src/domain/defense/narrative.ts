import type {
  Claim,
  DefenseNarrative,
  Med,
  MedReason,
  StoredDocument,
} from '@/domain/types';
import { formatAmount, formatDate } from '@/lib/format';

/**
 * Deterministic narrative renderer.
 *
 * Turns an already-built set of claims into professional pt-BR prose. It reads
 * nothing but the claims and the MED header, só it cannot introduce a fact that
 * the Defense JSON does not already contain. This is the default renderer; the
 * LLM path (see `src/domain/llm`) only ever rewrites this same input and is
 * checked against it afterwards.
 */

const REASON_LABEL: Record<MedReason, string> = {
  UNRECOGNIZED_TRANSACTION: 'não reconhecimento da transação',
  PRODUCT_NOT_RECEIVED: 'produto ou serviço não recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'produto ou serviço diferente do anunciado',
  FRAUD_SCAM: 'suspeita de golpe',
  FRAUD_COERCION: 'transação sob coação',
  FRAUD_ACCOUNT_TAKEOVER: 'suspeita de invasão de conta',
  DUPLICATE_CHARGE: 'cobrança em duplicidade',
  OPERATIONAL_ERROR: 'erro operacional',
  OTHER: 'outro motivo informado pela instituição',
};

const DOCUMENT_LABEL: Record<StoredDocument['kind'], string> = {
  INVOICE: 'Nota fiscal',
  DELIVERY_RECEIPT: 'Comprovante de entrega',
  TRANSACTION_RECEIPT: 'Comprovante da transação',
  CONTRACT: 'Contrato',
  SCREENSHOT: 'Captura de tela',
  LOG_EXPORT: 'Exportação de logs',
  DEFENSE_REPORT: 'Relatório de defesa',
  OTHER: 'Documento complementar',
};

const SECTION_TITLE: Record<Claim['category'], string> = {
  TRANSACTION: 'Da transação',
  IDENTITY: 'Da identificação do comprador',
  TECHNICAL: 'Dos dados técnicos da compra',
  DELIVERY: 'Da entrega e utilização',
  DOCUMENTATION: 'Da documentação',
};

const SECTION_ORDER: Claim['category'][] = [
  'TRANSACTION',
  'IDENTITY',
  'TECHNICAL',
  'DELIVERY',
  'DOCUMENTATION',
];

export interface RenderNarrativeInput {
  med: Med;
  claims: Claim[];
  documents: StoredDocument[];
}

export function buildSummary(med: Med, claims: Claim[]): string {
  const amount = formatAmount(med.amount, med.currency);
  const reason = REASON_LABEL[med.reason];
  if (claims.length === 0) {
    return `MED ${med.medId}, no valor de ${amount}, aberto sob alegação de ${reason}. Não há evidências suficientes registradas para sustentar afirmações factuais nesta defesa.`;
  }
  return `MED ${med.medId}, no valor de ${amount}, aberto sob alegação de ${reason}. A defesa apresenta ${claims.length} afirmação(ões) factual(is), cada uma sustentada por evidência registrada e rastreável.`;
}

export function renderNarrative(input: RenderNarrativeInput): DefenseNarrative {
  const { med, claims, documents } = input;
  const paragraphs: string[] = [];

  const transactionDate = formatDate(med.transactionAt);
  const openedDate = formatDate(med.openedAt);
  const amount = formatAmount(med.amount, med.currency);

  const header = [
    `Em resposta ao MED ${med.medId}`,
    med.requestingInstitution ? `, aberto por ${med.requestingInstitution}` : '',
    openedDate ? ` em ${openedDate}` : '',
    `, referente à transação no valor de ${amount}`,
    transactionDate ? ` realizada em ${transactionDate}` : '',
    `, sob alegação de ${REASON_LABEL[med.reason]}, apresentamos os elementos abaixo.`,
  ].join('');
  paragraphs.push(header);

  if (claims.length === 0) {
    paragraphs.push(
      'Nesta data não há, na base do estabelecimento, evidências registradas suficientes para sustentar afirmações factuais sobre a operação contestada. Nenhuma afirmação é apresentada sem lastro documental.',
    );
  } else {
    for (const category of SECTION_ORDER) {
      const sectionClaims = claims.filter((claim) => claim.category === category);
      if (sectionClaims.length === 0) continue;
      paragraphs.push(
        `${SECTION_TITLE[category]}: ${sectionClaims.map((claim) => claim.statement).join(' ')}`,
      );
    }
  }

  if (documents.length > 0) {
    const list = documents
      .map((document, index) => `${index + 1}. ${DOCUMENT_LABEL[document.kind]} (${document.filename})`)
      .join('; ');
    paragraphs.push(`Documentos apresentados: ${list}.`);
  }

  paragraphs.push(
    'Todas as informações acima constam dos registros do estabelecimento e das integracoes indicadas no pacote de evidências anexo, com identificação da origem de cada dado. Colocamo-nos à disposição para prestar esclarecimentos adicionais.',
  );

  return {
    renderer: 'DETERMINISTIC_TEMPLATE',
    language: 'pt-BR',
    body: paragraphs.join('\n\n'),
  };
}
