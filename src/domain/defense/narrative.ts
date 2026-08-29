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
 * nothing but the claims and the MED header, so it cannot introduce a fact that
 * the Defense JSON does not already contain. This is the default renderer; the
 * LLM path (see `src/domain/llm`) only ever rewrites this same input and is
 * checked against it afterwards.
 */

const REASON_LABEL: Record<MedReason, string> = {
  UNRECOGNIZED_TRANSACTION: 'nao reconhecimento da transacao',
  PRODUCT_NOT_RECEIVED: 'produto ou servico nao recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'produto ou servico diferente do anunciado',
  FRAUD_SCAM: 'suspeita de golpe',
  FRAUD_COERCION: 'transacao sob coacao',
  FRAUD_ACCOUNT_TAKEOVER: 'suspeita de invasao de conta',
  DUPLICATE_CHARGE: 'cobranca em duplicidade',
  OPERATIONAL_ERROR: 'erro operacional',
  OTHER: 'outro motivo informado pela instituicao',
};

const DOCUMENT_LABEL: Record<StoredDocument['kind'], string> = {
  INVOICE: 'Nota fiscal',
  DELIVERY_RECEIPT: 'Comprovante de entrega',
  TRANSACTION_RECEIPT: 'Comprovante da transacao',
  CONTRACT: 'Contrato',
  SCREENSHOT: 'Captura de tela',
  LOG_EXPORT: 'Exportacao de logs',
  DEFENSE_REPORT: 'Relatorio de defesa',
  OTHER: 'Documento complementar',
};

const SECTION_TITLE: Record<Claim['category'], string> = {
  TRANSACTION: 'Da transacao',
  IDENTITY: 'Da identificacao do comprador',
  TECHNICAL: 'Dos dados tecnicos da compra',
  DELIVERY: 'Da entrega e utilizacao',
  DOCUMENTATION: 'Da documentacao',
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
    return `MED ${med.medId}, no valor de ${amount}, aberto sob alegacao de ${reason}. Nao ha evidencias suficientes registradas para sustentar afirmacoes factuais nesta defesa.`;
  }
  return `MED ${med.medId}, no valor de ${amount}, aberto sob alegacao de ${reason}. A defesa apresenta ${claims.length} afirmacao(oes) factual(is), cada uma sustentada por evidencia registrada e rastreavel.`;
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
    `, referente a transacao no valor de ${amount}`,
    transactionDate ? ` realizada em ${transactionDate}` : '',
    `, sob alegacao de ${REASON_LABEL[med.reason]}, apresentamos os elementos abaixo.`,
  ].join('');
  paragraphs.push(header);

  if (claims.length === 0) {
    paragraphs.push(
      'Nesta data nao ha, na base do estabelecimento, evidencias registradas suficientes para sustentar afirmacoes factuais sobre a operacao contestada. Nenhuma afirmacao e apresentada sem lastro documental.',
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
    'Todas as informacoes acima constam dos registros do estabelecimento e das integracoes indicadas no pacote de evidencias anexo, com identificacao da origem de cada dado. Colocamo-nos a disposicao para prestar esclarecimentos adicionais.',
  );

  return {
    renderer: 'DETERMINISTIC_TEMPLATE',
    language: 'pt-BR',
    body: paragraphs.join('\n\n'),
  };
}
