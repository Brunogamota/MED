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

/**
 * Ícone da categoria, não a marca — e uma chave, não um componente.
 *
 * Chave porque este catálogo é lido no servidor e desenhado no cliente, e
 * componente não atravessa essa fronteira. Categoria porque só quatro dos
 * conectores desta lista têm marca oficial num pacote de ícones; misturar
 * quatro logos com dezesseis genéricos leria como falha de carregamento.
 */
export type ConnectorIcon =
  | 'gateway'
  | 'card'
  | 'digital'
  | 'members'
  | 'store'
  | 'cart'
  | 'webhook'
  | 'csv'
  | 'email';

export interface Connector {
  id: string;
  name: string;
  /** Chave do ícone; a tela resolve para um componente. */
  icon: ConnectorIcon;
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
  { id: 'asaas', icon: 'gateway', name: 'Asaas', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, horários de autorização e captura', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'pagarme', icon: 'gateway', name: 'Pagar.me', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, horários de autorização e captura', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'mercadopago', icon: 'gateway', name: 'Mercado Pago', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, dados do pagador', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'efi', icon: 'gateway', name: 'Efí', group: 'Gateways Pix', fills: 'Transação, comprovante Pix, end-to-end', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'pagbank', icon: 'gateway', name: 'PagBank', group: 'Gateways Pix', fills: 'Transação, comprovante Pix', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'stripe', icon: 'card', name: 'Stripe', group: 'Gateways Pix', fills: 'Transação, comprovante, risco da cobrança', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // Plataformas de venda digital — pedido, comprador, checkout
  { id: 'hotmart', icon: 'digital', name: 'Hotmart', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador, IP do checkout', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'kiwify', icon: 'digital', name: 'Kiwify', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador, IP do checkout', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'eduzz', icon: 'digital', name: 'Eduzz', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'braip', icon: 'digital', name: 'Braip', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'monetizze', icon: 'digital', name: 'Monetizze', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'ticto', icon: 'digital', name: 'Ticto', group: 'Plataformas de venda digital', fills: 'Pedido, produto, comprador', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // Áreas de membros — a prova de entrega do produto digital
  { id: 'memberkit', icon: 'members', name: 'Memberkit', group: 'Áreas de membros', fills: 'Envio do acesso, primeiro acesso, logs de consumo', state: 'AVAILABLE', credentials: apiKeyCredentials },
  { id: 'cademi', icon: 'members', name: 'Cademí', group: 'Áreas de membros', fills: 'Envio do acesso, primeiro acesso, logs de consumo', state: 'AVAILABLE', credentials: apiKeyCredentials },

  // E-commerce — pedido e entrega física
  { id: 'shopify', icon: 'store', name: 'Shopify', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'nuvemshop', icon: 'store', name: 'Nuvemshop', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },
  { id: 'woocommerce', icon: 'cart', name: 'WooCommerce', group: 'E-commerce', fills: 'Pedido, cliente, entrega e rastreio', state: 'AVAILABLE', credentials: apiKeyAndSecret },

  // Genéricos — o que já funciona hoje
  { id: 'webhook', icon: 'webhook', name: 'Webhook de entrada', group: 'Genéricos', fills: 'MED completo: valor, motivo, prazo, pagador, end-to-end', state: 'CONNECTED', credentials: [] },
  { id: 'csv', icon: 'csv', name: 'Importação de CSV', group: 'Genéricos', fills: 'Lote diário da adquirente: casos completos com relatório por linha', state: 'CONNECTED', credentials: [] },
  { id: 'email-forward', icon: 'email', name: 'E-mail encaminhado', group: 'Genéricos', fills: 'MED recebido por e-mail vira caso automaticamente', state: 'AVAILABLE', credentials: [{ name: 'inbox', label: 'Endereço de recebimento', kind: 'text' }] },
];

export const CONNECTOR_STATE_LABEL: Record<ConnectorState, string> = {
  CONNECTED: 'Conectado',
  AVAILABLE: 'Disponível',
  ERROR: 'Erro de autenticação',
};
