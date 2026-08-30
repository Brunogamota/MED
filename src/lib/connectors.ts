/**
 * Catálogo de conectores (briefing 3.7).
 *
 * A página de Integrações é de onde sai o valor do produto: cada conector é
 * uma fonte que preenche campos sozinha. O estado é honesto — `CONNECTED`
 * apenas para o que de fato funciona hoje (webhook de entrada e importação de
 * CSV); todo o resto é `AVAILABLE` com o fluxo de conexão desenhado e a
 * sincronização pendente de backend (ver docs/api-gaps.md).
 */

export type ConnectorState = 'CONNECTED' | 'AVAILABLE' | 'ERROR';

export interface Connector {
  id: string;
  name: string;
  group: ConnectorGroup;
  /** O que este conector preenche sozinho, na linguagem do operador. */
  fills: string;
  state: ConnectorState;
  /** Campos pedidos no fluxo de conexão. */
  credentials: { name: string; label: string; kind: 'text' | 'secret' }[];
  /** Última sincronização — só para conectores realmente ativos. */
  lastSyncAt?: string | null;
}

export const CONNECTOR_GROUPS = [
  'Gateways Pix',
  'Plataformas de venda digital',
  'Áreas de membros',
  'E-commerce',
  'Genéricos',
] as const;
export type ConnectorGroup = (typeof CONNECTOR_GROUPS)[number];

const apiKeyCredentials = [
  { name: 'apiKey', label: 'Chave de API', kind: 'secret' as const },
];
const apiKeyAndSecret = [
  { name: 'clientId', label: 'Client ID', kind: 'text' as const },
  { name: 'clientSecret', label: 'Client secret', kind: 'secret' as const },
];

export const CONNECTORS: Connector[] = [
  // Gateways Pix — transação completa e comprovante
  { id: 'asaas', name: 'Asaas', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, horários de autorização e captura', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'pagarme', name: 'Pagar.me', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, horários de autorização e captura', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'mercadopago', name: 'Mercado Pago', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, dados do pagador', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'efi', name: 'Efí', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, end-to-end', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'pagbank', name: 'PagBank', group: 'Gateways Pix', fills: 'Transação, comprovante Pix', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'stripe', name: 'Stripe', group: 'Gateways Pix', fills: 'Transação, comprovante, risco da cobrança', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // Plataformas de venda digital — pedido, comprador, checkout
  { id: 'hotmart', name: 'Hotmart', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador, IP do checkout', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'kiwify', name: 'Kiwify', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador, IP do checkout', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'eduzz', name: 'Eduzz', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'braip', name: 'Braip', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'monetizze', name: 'Monetizze', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'ticto', name: 'Ticto', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // Áreas de membros — a prova de entrega do produto digital
  { id: 'memberkit', name: 'Memberkit', group: 'Áreas de membros', fills: 'Envio do acesso, primeiro acesso, logs de consumo', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'cademi', name: 'Cademí', group: 'Áreas de membros', fills: 'Envio do acesso, primeiro acesso, logs de consumo', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // E-commerce — pedido e entrega física
  { id: 'shopify', name: 'Shopify', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'nuvemshop', name: 'Nuvemshop', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'woocommerce', name: 'WooCommerce', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },

  // Genéricos — o que já funciona hoje
  { id: 'webhook', name: 'Webhook de entrada', group: 'Genéricos', fills: 'MED completo: valor, motivo, prazo, pagador, end-to-end', state: 'CONNECTED', credentials: [] },
  { id: 'csv', name: 'Importação de CSV', group: 'Genéricos', fills: 'Lote diário da adquirente: casos completos com relatório por linha', state: 'CONNECTED', credentials: [] },
  { id: 'email-forward', name: 'E-mail encaminhado', group: 'Genéricos', fills: 'MED recebido por e-mail vira caso automaticamente', state: 'AVAILABLE', credentials: [{ name: 'inbox', label: 'Endereço de recebimento', kind: 'text' }] },
];

export const CONNECTOR_STATE_LABEL: Record<ConnectorState, string> = {
  CONNECTED: 'Conectado',
  AVAILABLE: 'Disponível',
  ERROR: 'Erro de autenticação',
};
