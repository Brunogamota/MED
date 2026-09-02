import {
  Blocks,
  Building2,
  FileText,
  Inbox,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Navegação do console.
 *
 * Item sem tela pronta aparece com o selo "Em breve" e sem link — nunca
 * cinza de desabilitado, que esconde o que existe. O contador vem do
 * servidor e só aparece onde há volume real.
 */

export type NavBadge = 'em breve';

export interface NavItem {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Ausente = tela ainda não existe. */
  url?: string;
  /** Valor de `?view=` que mantém o item ativo. */
  view?: string;
  badge?: NavBadge;
  /** Chave do contador servido pelo layout. */
  countKey?: 'open' | 'dueSoon' | 'submitted';
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { id: 'painel', title: 'Painel', icon: LayoutDashboard, url: '/' },
      { id: 'todos', title: 'Todos os MEDs', icon: Inbox, url: '/meds', countKey: 'open' },
      {
        id: 'vencendo',
        title: 'Vencendo',
        icon: Timer,
        url: '/meds?view=vencendo',
        view: 'vencendo',
        countKey: 'dueSoon',
      },
      {
        id: 'enviados',
        title: 'Enviados',
        icon: Send,
        url: '/meds?view=enviados',
        view: 'enviados',
        countKey: 'submitted',
      },
    ],
  },
  {
    id: 'defesa',
    label: 'Defesa',
    items: [
      { id: 'modelos', title: 'Modelos', icon: FileText, badge: 'em breve' },
      { id: 'regras', title: 'Regras de evidência', icon: ShieldCheck, badge: 'em breve' },
    ],
  },
  {
    id: 'configuracao',
    label: 'Configuração',
    items: [
      { id: 'integracoes', title: 'Integrações', icon: Blocks, url: '/integracoes' },
      { id: 'instituicoes', title: 'Instituições', icon: Building2, badge: 'em breve' },
      { id: 'equipe', title: 'Equipe', icon: Users, badge: 'em breve' },
    ],
  },
];
