import type { ReactNode } from 'react';
import type { EvidenceStrength, MedStatus, RequirementStatus } from '@/domain/types';
import {
  MED_STATUS_LABEL,
  MED_STATUS_TONE,
  REQUIREMENT_STATUS_LABEL,
  STRENGTH_LABEL,
} from '@/lib/labels';
import { ORIGIN_TONE, originTooltip, type FieldOrigin } from '@/lib/origin';

/**
 * Primitivos do padrao console: branco, hairline, sem sombra em card,
 * status como ponto de 6px + texto, numeros tabulares. Todo valor vem
 * dos tokens de globals.css.
 */

type Tone = 'neutral' | 'accent' | 'warning' | 'danger' | 'info' | 'success';

const DOT_COLOR: Record<Tone, string> = {
  neutral: 'bg-[var(--color-text-muted)]',
  accent: 'bg-[var(--color-accent)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]',
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
}: {
  title?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Sem padding no corpo — para tabela colada na borda do card. */
  flush?: boolean;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      {title ? (
        <header className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-4">
          <h2 className="text-[13px] font-semibold text-[var(--color-text)]">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={flush ? '' : 'p-4'}>{children}</div>
      {footer ? (
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/** Acao em link no cabecalho do card. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-[13px] font-medium text-[var(--color-text)] hover:underline"
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Faixa de metricas — um card, celulas divididas por hairline vertical
// ---------------------------------------------------------------------------

export function MetricStrip({
  children,
  columns = 4,
}: {
  children: ReactNode;
  /** Celulas dividem a largura igualmente, com divisores de 1px. */
  columns?: 4 | 5;
}) {
  const cols = columns === 5 ? 'md:grid-cols-5' : 'md:grid-cols-4';
  return (
    <section
      className={`grid grid-cols-2 divide-x divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ${cols} max-md:divide-y`}
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
  /** Denominador ou unidade, em 14px muted grudado ao valor. */
  unit?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  /** Fundo da celula inteira — prazo critico ganha danger-subtle. */
  cellTone?: 'danger';
  /** Badge ao lado do rotulo (ex.: "urgente"). */
  badge?: ReactNode;
  /** Barra de 4px sob o numero, na cor da faixa (score). */
  bar?: { value: number; max: number };
}) {
  const valueColor = {
    neutral: 'text-[var(--color-text)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-[var(--color-danger)]',
  }[tone];
  const ratio = bar && bar.max > 0 ? Math.min(1, bar.value / bar.max) : null;

  return (
    <div
      className={`min-w-0 px-4 py-3 ${
        cellTone === 'danger' ? 'bg-[var(--color-danger-subtle)]' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        {label}
        {badge}
      </div>
      <div className={`tabular mt-1 truncate text-[28px] font-medium leading-none ${valueColor}`}>
        {value}
        {unit ? (
          <span className="ml-1 text-[14px] font-normal text-[var(--color-text-muted)]">
            {unit}
          </span>
        ) : null}
      </div>
      {ratio !== null ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className={`h-full rounded-full ${scoreColor(ratio)}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Compat: metricas antigas do dashboard usam esta assinatura. */
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
// Par rotulo-valor — linhas de 36px, valor ausente vira "—"
// ---------------------------------------------------------------------------

export function KeyValueList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-[var(--color-border)]">{children}</dl>;
}

const ORIGIN_MARK_COLOR: Record<'success' | 'neutral' | 'warning' | 'danger', string> = {
  success: 'bg-[var(--color-success)]',
  neutral: 'bg-[var(--color-border-strong)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
};

/**
 * Marcador de origem: 4px a esquerda do rotulo, tooltip com a cadeia.
 * Cor nunca e o unico portador: o tooltip e o texto acessivel dizem a origem.
 */
export function SourceMark({ origin }: { origin: FieldOrigin }) {
  const tooltip = originTooltip(origin);
  return (
    <span
      className={`inline-block h-3 w-1 shrink-0 rounded-full ${ORIGIN_MARK_COLOR[ORIGIN_TONE[origin.kind]]}`}
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
  /** Ids tecnicos em mono 12px. */
  mono?: boolean;
  /** Cadeia de origem do dado — marcador de 4px + tooltip. */
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
      <dt className="flex shrink-0 items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
        {shownOrigin ? <SourceMark origin={shownOrigin} /> : null}
        {label}
      </dt>
      <dd
        className={
          missing
            ? 'text-[13px] text-[var(--color-text-muted)]'
            : mono
              ? 'truncate font-mono text-xs text-[var(--color-text)]'
              : 'truncate text-right text-[13px] font-medium text-[var(--color-text)]'
        }
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

/** Ponto 6px + texto. Sem fundo: o texto carrega o significado. */
export function StatusDot({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text)]">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[tone]}`} />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: MedStatus }) {
  return <StatusDot tone={MED_STATUS_TONE[status]}>{MED_STATUS_LABEL[status]}</StatusDot>;
}

/** Badge neutro: fundo cinza, sem caixa alta. Para versao, tipo, valor tecnico. */
export function NeutralBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium"
      style={{ background: '#f4f4f5', color: '#3f3f46' }}>
      {children}
    </span>
  );
}

const SUBTLE: Record<Tone, string> = {
  neutral: 'bg-[#f4f4f5] text-[#3f3f46]',
  accent: 'bg-[var(--color-accent-subtle)] text-[var(--color-success)]',
  success: 'bg-[var(--color-success-subtle)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-subtle)] text-[var(--color-info)]',
};

export function SubtleBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium ${SUBTLE[tone]}`}>
      {children}
    </span>
  );
}

export function RequirementMark({ status }: { status: RequirementStatus }) {
  const tone: Tone =
    status === 'AVAILABLE'
      ? 'success'
      : status === 'PENDING'
        ? 'warning'
        : 'danger';
  return <StatusDot tone={tone}>{REQUIREMENT_STATUS_LABEL[status]}</StatusDot>;
}

export function StrengthBadge({ strength }: { strength: EvidenceStrength | null }) {
  if (!strength) return <span className="text-[13px] text-[var(--color-text-muted)]">—</span>;
  const tone: Tone = strength === 'STRONG' ? 'success' : strength === 'MEDIUM' ? 'info' : 'warning';
  return <SubtleBadge tone={tone}>{STRENGTH_LABEL[strength]}</SubtleBadge>;
}

// ---------------------------------------------------------------------------
// Score — trilho 4px, cor por faixa, numerador em peso 600
// ---------------------------------------------------------------------------

function scoreColor(ratio: number): string {
  if (ratio < 0.4) return 'bg-[var(--color-danger)]';
  if (ratio < 0.7) return 'bg-[var(--color-warning)]';
  return 'bg-[var(--color-success)]';
}

export function ScoreBar({
  value,
  max,
  width = 'w-24',
}: {
  value: number;
  max: number;
  width?: string;
}) {
  const ratio = max === 0 ? 0 : Math.min(1, value / max);
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-1 ${width} overflow-hidden rounded-full bg-[var(--color-border)]`}>
        <span
          className={`block h-full rounded-full ${scoreColor(ratio)}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className="tabular text-[13px]">
        <span className="font-semibold text-[var(--color-text)]">{value}</span>
        <span className="text-[var(--color-text-muted)]">/{max}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tabela — header 36px 12px muted, linhas 44px, sem zebra
// ---------------------------------------------------------------------------

export function Th({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`h-9 border-b border-[var(--color-border)] px-3 text-left text-xs font-medium text-[var(--color-text-muted)] ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[var(--color-border)] px-3 py-3 align-middle text-[13px] ${className}`}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Estado vazio — convite para agir, nunca uma frase seca
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
    return <p className="py-2 text-[13px] text-[var(--color-text-muted)]">{children}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-1 py-12 text-center">
      <p className="text-[13px] font-medium text-[var(--color-text)]">{title}</p>
      <p className="max-w-[40ch] text-xs text-[var(--color-text-muted)]">{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Id tecnico — mono, truncado no meio
// ---------------------------------------------------------------------------

export function MonoId({ value }: { value: string }) {
  const display =
    value.length > 20 ? `${value.slice(0, 9)}…${value.slice(-8)}` : value;
  return (
    <span className="font-mono text-xs text-[var(--color-text-secondary)]" title={value}>
      {display}
    </span>
  );
}
