import {
  ChartLineData,
  Dashboard,
  DocumentAdd,
  Flash,
  Rule,
  Settings as SettingsIcon,
  Table,
  Time,
  Upload,
  UserMultiple,
  Bot,
  Building,
  Wallet,
  Send,
  ListChecked,
  WarningAlt,
  type CarbonIconType,
} from '@carbon/icons-react';

/**
 * Navegação de dois níveis.
 *
 * O trilho de ícones escolhe a área; o painel ao lado mostra o que existe
 * dentro dela. Tudo aqui é configuração — nenhuma tela conhece a navegação, e
 * acrescentar um item é acrescentar uma linha.
 *
 * Item sem `href` é uma tela que ainda não existe: aparece com o selo
 * "em breve" e sem link, nunca cinza de desabilitado, que esconde o que o
 * produto pretende ter.
 */

export type CountKey = 'open' | 'dueSoon' | 'submitted';

export interface PanelItem {
  id: string;
  label: string;
  icon?: CarbonIconType;
  href?: string;
  /** Valor de `?view=` que mantém o item ativo. */
  view?: string;
  /** Contador servido pelo layout. */
  countKey?: CountKey;
  /** Vermelho quando há caso com menos de 24h. */
  countUrgent?: boolean;
  /** Subitens revelados ao clicar. */
  children?: PanelItem[];
}

export interface PanelGroup {
  title: string;
  items: PanelItem[];
}

export interface RailSection {
  id: string;
  /** Título do painel e rótulo do ícone no trilho. */
  title: string;
  icon: CarbonIconType;
  /** Rota que o ícone abre direto, quando existe. */
  href?: string;
  /** Prefixos de rota que deixam esta seção ativa. */
  matches: string[];
  groups: PanelGroup[];
}

const QUICK_ACTIONS: PanelGroup = {
  title: 'Ações rápidas',
  items: [
    { id: 'novo', label: 'Novo MED', icon: DocumentAdd, href: '/meds/new' },
    { id: 'importar', label: 'Importar lote', icon: Upload, href: '/meds/import' },
  ],
};

export const RAIL_SECTIONS: RailSection[] = [
  {
    id: 'painel',
    title: 'Painel',
    icon: Dashboard,
    href: '/',
    matches: ['/'],
    groups: [
      {
        title: 'Visão da operação',
        items: [{ id: 'visao', label: 'Visão geral', icon: ChartLineData, href: '/' }],
      },
      QUICK_ACTIONS,
    ],
  },
  {
    id: 'meds',
    title: 'MEDs',
    icon: ListChecked,
    href: '/meds',
    matches: ['/meds'],
    groups: [
      {
        title: 'Fila de trabalho',
        items: [
          { id: 'fila', label: 'Fila', icon: Table, href: '/meds', countKey: 'open' },
          {
            id: 'vencendo',
            label: 'Vencendo',
            icon: Time,
            href: '/meds?view=vencendo',
            view: 'vencendo',
            countKey: 'dueSoon',
            countUrgent: true,
          },
          {
            id: 'bloqueados',
            label: 'Bloqueados por evidência',
            icon: WarningAlt,
            href: '/meds?view=bloqueados',
            view: 'bloqueados',
          },
          {
            id: 'prontos',
            label: 'Prontos para envio',
            icon: Flash,
            href: '/meds?view=prontos',
            view: 'prontos',
          },
          {
            id: 'enviados',
            label: 'Enviados',
            icon: Send,
            href: '/meds?view=enviados',
            view: 'enviados',
            countKey: 'submitted',
          },
        ],
      },
      QUICK_ACTIONS,
    ],
  },
  {
    id: 'defesa',
    title: 'Defesa',
    icon: Rule,
    matches: [],
    groups: [
      {
        title: 'Regras do motor',
        items: [
          { id: 'modelos', label: 'Modelos de defesa' },
          { id: 'regras', label: 'Regras de evidência' },
        ],
      },
    ],
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    icon: Flash,
    href: '/integracoes',
    matches: ['/integracoes'],
    groups: [
      {
        title: 'Fontes',
        items: [
          { id: 'todas', label: 'Todas as fontes', icon: Flash, href: '/integracoes' },
          {
            id: 'fontes',
            label: 'Fontes de dados',
            icon: Wallet,
            href: '/integracoes#fontes-de-dados',
          },
          {
            id: 'ia',
            label: 'Inteligência artificial',
            icon: Bot,
            href: '/integracoes#inteligencia-artificial',
          },
        ],
      },
    ],
  },
  {
    id: 'configuracao',
    title: 'Configuração',
    icon: SettingsIcon,
    matches: ['/equipe'],
    groups: [
      {
        title: 'Organização',
        items: [
          { id: 'instituicoes', label: 'Instituições', icon: Building },
          { id: 'equipe', label: 'Equipe', icon: UserMultiple, href: '/equipe' },
        ],
      },
    ],
  },
];

/** Seção aberta para uma rota. Cai no painel quando nada casa. */
export function sectionForPath(pathname: string): RailSection {
  const match = RAIL_SECTIONS.filter((section) =>
    section.matches.some((prefix) =>
      prefix === '/' ? pathname === '/' : pathname.startsWith(prefix),
    ),
  )
    // A rota mais especifica ganha: /meds/import e MEDs, nao Painel.
    .sort((a, b) => Math.max(...b.matches.map((m) => m.length)) - Math.max(...a.matches.map((m) => m.length)))[0];

  return match ?? RAIL_SECTIONS[0]!;
}
