/**
 * Catálogo de conectores.
 *
 * Cada conector é uma fonte que preenche campos sozinha, ou uma capacidade que
 * o motor usa. O estado é honesto: `CONNECTED` só para o que de fato funciona
 * agora; o resto é `AVAILABLE`, com o fluxo de conexão desenhado e a
 * sincronização pendente de backend (ver docs/api-gaps.md).
 */

export type ConnectorState = 'CONNECTED' | 'AVAILABLE' | 'ERROR';

/** Chave do ícone; a tela resolve para um componente. */
export type ConnectorIcon = 'whatsapp' | 'claude' | 'chatgpt' | 'gmail';

export const CONNECTOR_GROUPS = ['Fontes de dados', 'Inteligência artificial'] as const;
export type ConnectorGroup = (typeof CONNECTOR_GROUPS)[number];

export interface Connector {
  id: string;
  name: string;
  icon: ConnectorIcon;
  group: ConnectorGroup;
  /** O que este conector traz, na linguagem do operador. */
  fills: string;
  /** Estado declarado. Pode ser sobrescrito pelo ambiente — ver `resolveState`. */
  state: ConnectorState;
  /** Campos pedidos no fluxo de conexão. Vazio quando a conexão é por autorização. */
  credentials: { name: string; label: string; kind: 'text' | 'secret' }[];
  /**
   * Rota que inicia a autorização, para conector que conecta pelo provedor em
   * vez de por chave colada. Quem tem isto nao mostra formulario: o operador
   * autoriza na tela do proprio provedor.
   */
  authPath?: string;
  /**
   * Tela do conector ja conectado. Depois de autorizar, o operador precisa ver
   * o que a ferramenta enxerga — senao "Conectado" e uma promessa sem prova.
   */
  managePath?: string;
  /**
   * Estado que vem da configuração em vez do catálogo. Hoje só `llm`, que lê
   * `ANTHROPIC_API_KEY`: dizer "disponível" para algo que já está funcionando
   * seria tão errado quanto o contrário.
   */
  runtime?: 'llm' | 'gmail';
  /** Última sincronização — só para conectores realmente ativos. */
  lastSyncAt?: string | null;
}

const apiKey = [{ name: 'apiKey', label: 'Chave de API', kind: 'secret' as const }];

export const CONNECTORS: Connector[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'gmail',
    group: 'Fontes de dados',
    fills: 'MED que chega por e-mail vira caso, com a mensagem original anexada como evidência',
    state: 'AVAILABLE',
    runtime: 'gmail',
    credentials: [],
    authPath: '/api/integrations/gmail/connect',
    managePath: '/integracoes/gmail',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    group: 'Fontes de dados',
    fills: 'Envio do acesso e conversa com o comprador, como evidência de comunicação',
    state: 'AVAILABLE',
    credentials: [
      { name: 'phoneNumberId', label: 'ID do número', kind: 'text' },
      { name: 'token', label: 'Token de acesso', kind: 'secret' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: 'claude',
    group: 'Inteligência artificial',
    fills: 'Reescreve o texto da defesa. O guard descarta qualquer fato que não estivesse no caso',
    state: 'AVAILABLE',
    runtime: 'llm',
    credentials: apiKey,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: 'chatgpt',
    group: 'Inteligência artificial',
    fills: 'Mesma função do Claude na reescrita. O motor hoje só conversa com o Claude',
    state: 'AVAILABLE',
    credentials: apiKey,
  },
];

export const CONNECTOR_STATE_LABEL: Record<ConnectorState, string> = {
  CONNECTED: 'Conectado',
  AVAILABLE: 'Disponível',
  ERROR: 'Erro de autenticação',
};

export interface ConnectorRuntime {
  /** `ANTHROPIC_API_KEY` presente. */
  llmConfigured: boolean;
  /** As duas metades do app do Google existem: da para pedir consentimento. */
  gmailConfigured: boolean;
  /** Ja autorizado: existe refresh token guardado. */
  gmailConnected: boolean;
}

/** Estado real do conector: o do catálogo, ou o que o ambiente diz. */
export function resolveState(connector: Connector, runtime: ConnectorRuntime): ConnectorState {
  if (connector.runtime === 'llm') return runtime.llmConfigured ? 'CONNECTED' : 'AVAILABLE';
  if (connector.runtime === 'gmail') return runtime.gmailConnected ? 'CONNECTED' : 'AVAILABLE';
  return connector.state;
}

/**
 * Âncora do grupo, para a navegação lateral cair direto nele. Derivada do
 * rótulo: um id escrito à mão sairia do ar no dia em que o grupo for renomeado.
 */
export function groupAnchor(group: string): string {
  return group
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
