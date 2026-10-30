import {
  AlarmClock,
  FileUp,
  Inbox,
  LayoutGrid,
  MailPlus,
  Plug,
  ReceiptText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO, STATUS_LABEL, type PreviewStatus } from '@/components/previews/marketplace/fixtures';

export type NavId =
  | 'visao-geral'
  | 'contestacoes'
  | 'vencendo'
  | 'importar-meds'
  | 'importar-envios'
  | 'comprovantes'
  | 'conexoes'
  | 'equipe';

export interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
  count?: number;
  urgent?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Operação',
    items: [
      { id: 'visao-geral', label: 'Visão geral', icon: LayoutGrid },
      { id: 'contestacoes', label: 'Contestações', icon: Inbox, count: RESUMO.emAberto },
      { id: 'vencendo', label: 'Vencendo', icon: AlarmClock, count: RESUMO.vencendo24h, urgent: true },
    ],
  },
  {
    heading: 'Entrada',
    items: [
      { id: 'importar-meds', label: 'Importar MEDs', icon: FileUp },
      { id: 'importar-envios', label: 'Importar envios', icon: MailPlus },
      { id: 'comprovantes', label: 'Comprovantes', icon: ReceiptText },
    ],
  },
  {
    heading: 'Conta',
    items: [
      { id: 'conexoes', label: 'Conexões', icon: Plug },
      { id: 'equipe', label: 'Equipe', icon: Users },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const COMPROVANTE_HREF = '/preview/marketplace/opcao-3/comprovante';

const STATUS_TONE: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--nc-success)/12 text-(--nc-success) ring-(--nc-success)/25',
  SEM_ENVIO: 'bg-(--nc-error)/12 text-(--nc-error) ring-(--nc-error)/25',
  DEFESA: 'bg-(--nc-coral)/12 text-(--nc-coral) ring-(--nc-coral)/25',
  COLETANDO: 'bg-(--nc-sand)/12 text-(--nc-sand) ring-(--nc-sand)/25',
  ENVIADO: 'bg-(--nc-text-2)/10 text-(--nc-text-2) ring-(--nc-text-2)/20',
};

const STATUS_DOT: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--nc-success)',
  SEM_ENVIO: 'bg-(--nc-error)',
  DEFESA: 'bg-(--nc-coral)',
  COLETANDO: 'bg-(--nc-sand)',
  ENVIADO: 'bg-(--nc-text-2)',
};

export function StatusBadge({ status, className }: { status: PreviewStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        STATUS_TONE[status],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function scoreTone(score: number) {
  if (score >= 75) return { bar: 'bg-(--nc-success)', text: 'text-(--nc-success)' };
  if (score >= 45) return { bar: 'bg-(--nc-sand)', text: 'text-(--nc-sand)' };
  return { bar: 'bg-(--nc-error)', text: 'text-(--nc-error)' };
}

/** Score de evidência: número + barra curta. A cor acompanha a faixa, o número diz o valor. */
export function ScoreMeter({ score, wide = false }: { score: number; wide?: boolean }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('w-6 text-right font-mono text-[13px] tabular-nums', tone.text)}>{score}</span>
      <span
        className={cn('relative h-1.5 overflow-hidden rounded-full bg-(--nc-surface-3)', wide ? 'flex-1' : 'w-14')}
        role="meter"
        aria-label="Score de evidência"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <span className={cn('absolute inset-y-0 left-0 rounded-full', tone.bar)} style={{ width: `${score}%` }} />
      </span>
    </div>
  );
}

/** End-to-end encurtado: começo e fim, que é o que o operador confere. */
export function e2eCurto(e2e: string): string {
  return `${e2e.slice(0, 9)}…${e2e.slice(-6)}`;
}
