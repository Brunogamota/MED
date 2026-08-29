import type { ReactNode } from 'react';
import type { EvidenceStrength, MedStatus, RequirementStatus } from '@/domain/types';

/**
 * Small presentational primitives. Deliberately hand-rolled Tailwind rather
 * than a component library: the screens here are dense operational tables, and
 * every element needs tight control over row height and typography.
 */

export function Panel({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      {title ? (
        <header className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            {title}
          </h2>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'danger' | 'good';
}) {
  const toneClass = {
    default: 'text-[var(--color-ink)]',
    warn: 'text-amber-700',
    danger: 'text-red-700',
    good: 'text-emerald-700',
  }[tone];

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

const STATUS_TONE: Record<MedStatus, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700',
  COLLECTING_DATA: 'bg-sky-100 text-sky-800',
  MISSING_EVIDENCE: 'bg-amber-100 text-amber-800',
  READY_TO_GENERATE: 'bg-indigo-100 text-indigo-800',
  DEFENSE_GENERATED: 'bg-violet-100 text-violet-800',
  READY_TO_SUBMIT: 'bg-emerald-100 text-emerald-800',
  SUBMITTED: 'bg-emerald-200 text-emerald-900',
  ACCEPTED: 'bg-emerald-600 text-white',
  REJECTED: 'bg-red-200 text-red-900',
  EXPIRED: 'bg-red-600 text-white',
};

export function StatusBadge({ status }: { status: MedStatus }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>
      {status}
    </span>
  );
}

const REQUIREMENT_TONE: Record<RequirementStatus, string> = {
  AVAILABLE: 'text-emerald-700',
  MISSING: 'text-red-700',
  PENDING: 'text-amber-700',
  CONFLICTING: 'text-red-800 font-semibold',
};

export function RequirementMark({ status }: { status: RequirementStatus }) {
  const symbol = {
    AVAILABLE: 'OK',
    MISSING: 'FALTA',
    PENDING: 'PEND',
    CONFLICTING: 'CONFL',
  }[status];
  return <span className={`text-[11px] ${REQUIREMENT_TONE[status]}`}>{symbol}</span>;
}

const STRENGTH_TONE: Record<EvidenceStrength, string> = {
  STRONG: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-sky-100 text-sky-800',
  WEAK: 'bg-amber-100 text-amber-800',
};

export function StrengthBadge({ strength }: { strength: EvidenceStrength | null }) {
  if (!strength) return <span className="text-[11px] text-[var(--color-ink-muted)]">-</span>;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STRENGTH_TONE[strength]}`}>
      {strength}
    </span>
  );
}

export function ScoreBar({ value, max }: { value: number; max: number }) {
  const ratio = max === 0 ? 0 : Math.min(1, value / max);
  const tone = ratio >= 0.8 ? 'bg-emerald-600' : ratio >= 0.5 ? 'bg-sky-600' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded bg-slate-200">
        <div className={`h-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-[var(--color-ink-muted)]">
        {value}/{max}
      </span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--color-ink-muted)]">{children}</p>;
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-[var(--color-border-subtle)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-[var(--color-border-subtle)] px-3 py-2 align-top ${className}`}>
      {children}
    </td>
  );
}
