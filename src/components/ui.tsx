import type { ReactNode } from 'react';
import type { EvidenceStrength, MedStatus, RequirementStatus } from '@/domain/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { StatusBadge as MedStatusBadge } from '@/components/med/StatusBadge';
import { cn } from '@/lib/cn';
import { REQUIREMENT_STATUS_LABEL, STRENGTH_LABEL } from '@/lib/labels';
import { ORIGIN_TONE, originTooltip, type FieldOrigin } from '@/lib/origin';

/**
 * Primitivos das telas de caso, sobre shadcn/ui.
 *
 * Este arquivo e a camada fina que traduz o vocabulario do dominio (score,
 * origem do dado, forca de evidencia, status de requisito) para os
 * componentes do sistema visual. Nenhuma cor literal mora aqui: tudo sai dos
 * tokens de `globals.css`, e o modo escuro sai de graca.
 */

type Tone = 'neutral' | 'accent' | 'warning' | 'danger' | 'info' | 'success';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  accent: 'text-emerald-600 dark:text-emerald-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-destructive',
  info: 'text-muted-foreground',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  accent: 'bg-emerald-600 dark:bg-emerald-400',
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger: 'bg-destructive',
  info: 'bg-muted-foreground',
};

const TONE_SUBTLE: Record<Tone, string> = {
  neutral: '',
  accent: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  success: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  danger: '',
  info: '',
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Panel({
  title,
  actions,
  footer,
  children,
  flush = false,
  id,
}: {
  title?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Sem padding no corpo — para tabela colada na borda do card. */
  flush?: boolean;
  /** Âncora para ação direta ("leve o operador até o campo"). */
  id?: string;
}) {
  return (
    <Card id={id} className="scroll-mt-16">
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
      ) : null}
      {flush ? children : <CardContent>{children}</CardContent>}
      {footer ? (
        <CardFooter className="border-t bg-muted/40 py-3 text-muted-foreground text-xs">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

/** Acao em link no cabecalho do card. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-medium text-sm hover:underline">
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Faixa de metricas
// ---------------------------------------------------------------------------

export function MetricStrip({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 4 | 5;
}) {
  return (
    <section
      className={cn(
        'grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 dark:*:data-[slot=card]:bg-card',
        columns === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
      )}
    >
      {children}
    </section>
  );
}

export function MetricCell({
  label,
  value,
  unit,
  tone = 'neutral',
  cellTone,
  badge,
  bar,
}: {
  label: string;
  value: string | number;
  /** Denominador ou unidade, grudado ao valor. */
  unit?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  /** Destaque da célula inteira — prazo crítico. */
  cellTone?: 'danger';
  badge?: ReactNode;
  /** Barra sob o número (score). */
  bar?: { value: number; max: number };
}) {
  const percent = bar && bar.max > 0 ? Math.min(100, (bar.value / bar.max) * 100) : null;

  return (
    <Card className={cn(cellTone === 'danger' && 'ring-destructive/30')}>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {label}
          {badge}
        </div>
        <div
          className={cn(
            'truncate font-medium text-3xl leading-none tracking-tight tabular-nums',
            tone === 'neutral' ? '' : TONE_TEXT[tone],
          )}
        >
          {value}
          {unit ? <span className="ml-1 font-normal text-muted-foreground text-sm">{unit}</span> : null}
        </div>
        {percent !== null ? <Progress value={percent} className="mt-2 h-1.5" /> : null}
      </CardContent>
    </Card>
  );
}

/** Compat: métricas antigas do painel usam esta assinatura. */
export function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'danger' | 'good';
}) {
  const mapped = { default: 'neutral', warn: 'warning', danger: 'danger', good: 'success' } as const;
  return <MetricCell label={label} value={value} tone={mapped[tone]} />;
}

// ---------------------------------------------------------------------------
// Par rótulo-valor
// ---------------------------------------------------------------------------

export function KeyValueList({ children }: { children: ReactNode }) {
  return <dl className="divide-y">{children}</dl>;
}

const ORIGIN_MARK: Record<'success' | 'neutral' | 'warning' | 'danger', string> = {
  success: 'bg-emerald-600 dark:bg-emerald-400',
  neutral: 'bg-border',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger: 'bg-destructive',
};

/**
 * Marcador de origem: 4px à esquerda do rótulo, tooltip com a cadeia.
 * Cor nunca é o único portador — o texto acessível diz a origem.
 */
export function SourceMark({ origin }: { origin: FieldOrigin }) {
  const tooltip = originTooltip(origin);
  return (
    <span
      className={cn('inline-block h-3 w-1 shrink-0 rounded-full', ORIGIN_MARK[ORIGIN_TONE[origin.kind]])}
      title={tooltip}
    >
      <span className="sr-only">{tooltip}</span>
    </span>
  );
}

export function KeyValueRow({
  label,
  value,
  mono = false,
  origin,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  origin?: FieldOrigin;
}) {
  const missing = value === null || value === undefined || value.length === 0;
  const shownOrigin: FieldOrigin | undefined = origin
    ? missing
      ? { kind: 'missing' }
      : origin
    : undefined;

  return (
    <div className="flex min-h-9 items-center justify-between gap-4 py-1.5">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground text-sm">
        {shownOrigin ? <SourceMark origin={shownOrigin} /> : null}
        {label}
      </dt>
      <dd
        className={cn(
          'truncate text-right text-sm',
          missing ? 'text-muted-foreground' : mono ? 'font-mono text-xs' : 'font-medium',
        )}
        title={missing ? undefined : (value as string)}
      >
        {missing ? '—' : value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Ponto + texto. Sem fundo: o texto carrega o significado. */
export function StatusDot({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
      {children}
    </span>
  );
}

export function StatusBadge({ status, size }: { status: MedStatus; size?: 'sm' | 'md' }) {
  return <MedStatusBadge status={status} size={size} />;
}

/** Selo neutro: para versão, tipo, valor técnico. */
export function NeutralBadge({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>;
}

export function SubtleBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Badge
      variant={tone === 'danger' ? 'destructive' : tone === 'neutral' ? 'secondary' : 'outline'}
      className={TONE_SUBTLE[tone]}
    >
      {children}
    </Badge>
  );
}

export function RequirementMark({ status }: { status: RequirementStatus }) {
  const tone: Tone = status === 'AVAILABLE' ? 'success' : status === 'PENDING' ? 'warning' : 'danger';
  return <StatusDot tone={tone}>{REQUIREMENT_STATUS_LABEL[status]}</StatusDot>;
}

export function StrengthBadge({ strength }: { strength: EvidenceStrength | null }) {
  if (!strength) return <span className="text-muted-foreground text-sm">—</span>;
  const tone: Tone = strength === 'STRONG' ? 'success' : strength === 'MEDIUM' ? 'info' : 'warning';
  return <SubtleBadge tone={tone}>{STRENGTH_LABEL[strength]}</SubtleBadge>;
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

export function ScoreBar({
  value,
  max,
  width = 'w-24',
}: {
  value: number;
  max: number;
  width?: string;
}) {
  const percent = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <Progress value={percent} className={cn('h-1.5', width)} />
      <span className="text-sm tabular-nums">
        <span className="font-semibold">{value}</span>
        <span className="text-muted-foreground">/{max}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'h-9 border-b px-3 text-left font-medium text-muted-foreground text-xs whitespace-nowrap',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-b px-3 py-3 align-middle text-sm', className)}>{children}</td>;
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  if (!title) {
    return <p className="py-2 text-muted-foreground text-sm">{children}</p>;
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

// ---------------------------------------------------------------------------
// Id técnico — mono, truncado no meio
// ---------------------------------------------------------------------------

export function MonoId({ value }: { value: string }) {
  const display = value.length > 20 ? `${value.slice(0, 9)}…${value.slice(-8)}` : value;
  return (
    <span className="font-mono text-muted-foreground text-xs" title={value}>
      {display}
    </span>
  );
}
