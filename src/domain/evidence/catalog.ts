import type { EvidenceCategory, EvidenceStrength, EvidenceType } from '@/domain/types';
import { EVIDENCE_TYPES } from '@/domain/types';

/**
 * Static metadata for every evidence type the system knows about.
 *
 * `baseStrength` is the intrinsic probative value of the evidence type,
 * independent of where the value came from. Provenance modifiers are applied
 * separately in `strength.ts` — the two are kept apart só the rules stay
 * explicit and testable. No LLM ever assigns a strength.
 */
export interface EvidenceTypeDefinition {
  type: EvidenceType;
  category: EvidenceCategory;
  /** pt-BR label used in the UI and in generated documents. */
  label: string;
  baseStrength: EvidenceStrength;
  /** Operational reason this evidence matters, shown next to missing items. */
  rationale: string;
  /** True when the value is personal data that must be masked outside the pack. */
  sensitive?: boolean;
}

function def(
  type: EvidenceType,
  category: EvidenceCategory,
  label: string,
  baseStrength: EvidenceStrength,
  rationale: string,
  sensitive = false,
): EvidenceTypeDefinition {
  return { type, category, label, baseStrength, rationale, sensitive };
}

const DEFINITIONS: EvidenceTypeDefinition[] = [
  // --- Identity ------------------------------------------------------------
  def('CUSTOMER_NAME', 'IDENTITY', 'Nome do cliente', 'WEAK', 'Identifica o titular do pedido.', true),
  def('CUSTOMER_DOCUMENT', 'IDENTITY', 'CPF/CNPJ do cliente', 'MEDIUM', 'Vincula o pedido a um documento identificavel.', true),
  def('CUSTOMER_EMAIL', 'IDENTITY', 'E-mail do cliente', 'MEDIUM', 'Canal de contato usado na compra.', true),
  def('CUSTOMER_PHONE', 'IDENTITY', 'Telefone do cliente', 'WEAK', 'Canal de contato usado na compra.', true),
  def('CUSTOMER_ADDRESS', 'IDENTITY', 'Endereço do cliente', 'MEDIUM', 'Permite comparar com o endereço de entrega.', true),
  def('PAYER_NAME_MATCH', 'IDENTITY', 'Nome do pagador confere com o do pedido', 'MEDIUM', 'Liga quem pagou a quem comprou.'),
  def('PAYER_DOCUMENT_MATCH', 'IDENTITY', 'CPF/CNPJ do pagador confere com o do pedido', 'STRONG', 'Prova mais forte de que o titular contestante e o comprador.'),
  def('PAYER_EMAIL_MATCH', 'IDENTITY', 'E-mail do pagador confere com o do pedido', 'MEDIUM', 'Reforca o vinculo entre pagador e comprador.'),
  def('ACCOUNT_CREATED_AT', 'IDENTITY', 'Data de criação da conta', 'WEAK', 'Mostra relacionamento previo com o cliente.'),

  // --- Transaction ---------------------------------------------------------
  def('TRANSACTION_RECEIPT', 'TRANSACTION', 'Comprovante da transação', 'STRONG', 'Documento base da operação contestada.'),
  def('END_TO_END_ID', 'TRANSACTION', 'End-to-end ID', 'STRONG', 'Identificador único da transação Pix.'),
  def('PAYMENT_AUTHORIZATION', 'TRANSACTION', 'Autorização do pagamento', 'STRONG', 'Confirma que o pagamento foi aprovado pelo provedor.'),
  def('ORDER_RECORD', 'TRANSACTION', 'Registro do pedido', 'MEDIUM', 'Liga a transação a uma compra concreta.'),
  def('ORDER_PLACED_AT', 'TRANSACTION', 'Data e hora da compra', 'MEDIUM', 'Ancora temporal da operação.'),

  // --- Technical -----------------------------------------------------------
  def('CHECKOUT_IP', 'TECHNICAL', 'IP utilizado na compra', 'MEDIUM', 'Dado técnico da sessão de compra.', true),
  def('DEVICE_FINGERPRINT', 'TECHNICAL', 'Device fingerprint', 'MEDIUM', 'Identifica o dispositivo usado na compra.', true),
  def('USER_AGENT', 'TECHNICAL', 'User agent', 'WEAK', 'Complementa os dados técnicos da sessão.'),
  def('SESSION_LOG', 'TECHNICAL', 'Log da sessão', 'MEDIUM', 'Registro técnico do acesso do comprador.'),
  def('ANTIFRAUD_SCORE', 'TECHNICAL', 'Análise antifraude', 'MEDIUM', 'Mostra que a operação passou por avaliação de risco.'),
  def('TERMS_ACCEPTANCE', 'TECHNICAL', 'Aceite dos termos', 'MEDIUM', 'Registra o consentimento do comprador.'),

  // --- Delivery ------------------------------------------------------------
  def('SHIPPING_ADDRESS', 'DELIVERY', 'Endereço de entrega', 'MEDIUM', 'Destino declarado no momento da compra.', true),
  def('CARRIER', 'DELIVERY', 'Transportadora', 'WEAK', 'Responsavel pelo transporte.'),
  def('TRACKING_CODE', 'DELIVERY', 'Código de rastreio', 'MEDIUM', 'Permite auditar o envio junto a transportadora.'),
  def('POSTED_AT', 'DELIVERY', 'Data de postagem', 'MEDIUM', 'Comprova o inicio do transporte.'),
  def('TRACKING_EVENTS', 'DELIVERY', 'Histórico de rastreamento', 'STRONG', 'Cadeia de eventos logisticos verificavel.'),
  def('DELIVERY_CONFIRMATION', 'DELIVERY', 'Confirmação de entrega', 'STRONG', 'Evidência central quando o motivo e não recebimento.'),
  def('DELIVERED_AT', 'DELIVERY', 'Data da entrega', 'STRONG', 'Momento em que a entrega foi registrada.'),
  def('RECEIVER_NAME', 'DELIVERY', 'Nome de quem recebeu', 'MEDIUM', 'Identifica o recebedor da mercadoria.', true),
  def('DELIVERY_RECEIPT_SIGNED', 'DELIVERY', 'Comprovante de entrega assinado', 'STRONG', 'Documento assinado no ato da entrega.'),

  // --- Digital delivery ----------------------------------------------------
  def('ACCESS_DELIVERY_CHANNEL', 'DELIVERY', 'Canal de entrega do acesso', 'MEDIUM', 'Por onde o acesso foi enviado ao comprador.'),
  def('ACCESS_SENT_TO', 'DELIVERY', 'Destino do envio do acesso', 'STRONG', 'Para qual e-mail ou contato o acesso foi enviado.', true),
  def('ACCESS_SENT_AT', 'DELIVERY', 'Data do envio do acesso', 'STRONG', 'Momento em que o produto foi disponibilizado ao comprador.'),
  def('FIRST_ACCESS_AT', 'DELIVERY', 'Data do primeiro acesso', 'STRONG', 'Comprova o uso do produto digital.'),
  def('ACCESS_LOG', 'DELIVERY', 'Log de acessos', 'STRONG', 'Cadeia de acessos com data, hora e origem.'),
  def('ACCESS_COUNT', 'DELIVERY', 'Número de acessos', 'MEDIUM', 'Mostra uso recorrente do produto.'),
  def('CONTENT_CONSUMPTION', 'DELIVERY', 'Conteúdo consumido', 'MEDIUM', 'Detalha o que foi efetivamente utilizado.'),
  def('DOWNLOAD_LOG', 'DELIVERY', 'Log de downloads', 'STRONG', 'Comprova a retirada do arquivo entregue.'),
  def('LOGIN_LOG', 'DELIVERY', 'Log de login', 'MEDIUM', 'Registra autenticacoes do titular.'),
  def('PASSWORD_CHANGE', 'DELIVERY', 'Alteracao de senha', 'WEAK', 'Indica controle da conta pelo titular.'),

  // --- Services ------------------------------------------------------------
  def('SERVICE_DESCRIPTION', 'DELIVERY', 'Descrição do serviço', 'WEAK', 'Define o objeto contratado.'),
  def('SERVICE_CONTRACT', 'DOCUMENTATION', 'Contrato do serviço', 'STRONG', 'Instrumento formal da contratacao.'),
  def('SERVICE_ACCEPTANCE', 'DELIVERY', 'Aceite da contratacao', 'STRONG', 'Registra a concordancia do contratante.'),
  def('SERVICE_EXECUTION', 'DELIVERY', 'Execucao do serviço', 'STRONG', 'Comprova a prestacao efetiva.'),
  def('SERVICE_PROFESSIONAL', 'DELIVERY', 'Profissional responsavel', 'WEAK', 'Identifica quem executou o serviço.'),
  def('SERVICE_SCHEDULE', 'DELIVERY', 'Agendamento', 'MEDIUM', 'Data e hora acordadas para a execucao.'),
  def('SERVICE_USAGE_PROOF', 'DELIVERY', 'Comprovante de utilização', 'STRONG', 'Evidência de que o serviço foi usufruido.'),

  // --- Comunicacao reconstruida --------------------------------------------
  def('DELIVERY_COMMUNICATION', 'DOCUMENTATION', 'Comprovante de comunicação enviada', 'WEAK', 'Reconstrução da mensagem que o estabelecimento enviou ao cliente (e-mail de confirmação, entrega de acesso).', true),

  // --- Documentation -------------------------------------------------------
  def('INVOICE', 'DOCUMENTATION', 'Nota fiscal', 'STRONG', 'Documento fiscal da operação.'),
  def('COMMUNICATION_HISTORY', 'DOCUMENTATION', 'Histórico de comunicação', 'MEDIUM', 'Trocas de mensagens com o cliente.'),
  def('REFUND_POLICY', 'DOCUMENTATION', 'Política de reembolso', 'WEAK', 'Regras aceitas no momento da compra.'),
  def('OTHER_DOCUMENT', 'DOCUMENTATION', 'Outro documento', 'WEAK', 'Documento complementar anexado ao caso.'),
];

const BY_TYPE = new Map<EvidenceType, EvidenceTypeDefinition>(
  DEFINITIONS.map((definition) => [definition.type, definition]),
);

export function getEvidenceDefinition(type: EvidenceType): EvidenceTypeDefinition {
  const definition = BY_TYPE.get(type);
  if (!definition) {
    // Unreachable while the catalog covers EVIDENCE_TYPES (asserted by a test).
    throw new Error(`Missing evidence catalog entry for type "${type}"`);
  }
  return definition;
}

export function listEvidenceDefinitions(): EvidenceTypeDefinition[] {
  return [...DEFINITIONS];
}

/** Evidence types with no catalog entry. Must always be empty. */
export function uncataloguedEvidenceTypes(): EvidenceType[] {
  return EVIDENCE_TYPES.filter((type) => !BY_TYPE.has(type));
}
