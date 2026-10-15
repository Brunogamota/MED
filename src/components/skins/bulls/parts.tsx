import { cn } from '@/lib/cn';
import { MED_STATUS_LABEL } from '@/lib/labels';
import type { MedStatus } from '@/domain/types';

/**
 * Peças pequenas do ambiente Bulls Cash ("Bento Claro"): avatar de iniciais,
 * medidor de evidência, selo de status e pílula de prazo. Cor só pelos papéis
 * `bulls-*` de `globals.css`.
 */

/** "Bulls Cash" → "BC"; uma palavra só → as duas primeiras letras. */
export function bullsInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  const letters = words.length > 1 ? words.slice(0, 2).map((word) => word[0] ?? '') : [...(words[0] ?? '').slice(0, 2)];
  return letters.join('').toUpperCase();
}

/** Tons de avatar: só decoração, escolhidos pelo texto, sem significado. */
const AVATAR_TONES = [
  'bg-bulls-av-1 text-bulls-av-1-ink',
  'bg-bulls-av-2 text-bulls-av-2-ink',
  'bg-bulls-av-3 text-bulls-av-3-ink',
  'bg-bulls-av-4 text-bulls-av-4-ink',
  'bg-bulls-av-5 text-bulls-av-5-ink',
  'bg-bulls-av-6 text-bulls-av-6-ink',
];

export function BullsAvatar({ name, size = 'default' }: { name: string | null; size?: 'default' | 'lg' }) {
  const label = name ?? '';
  const tone = AVATAR_TONES[((label.charCodeAt(0) || 0) + label.length) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'lg' ? 'size-10 text-[12.5px]' : 'size-8 text-[11.5px]',
        name ? tone : 'bg-bulls-neutral-soft text-bulls-ink-3',
      )}
    >
      {name ? bullsInitials(name) : '—'}
    </span>
  );
}

export function scoreTone(score: number): { bar: string; text: string } {
  if (score >= 75) return { bar: 'bg-bulls-success', text: 'text-bulls-success-ink' };
  if (score >= 50) return { bar: 'bg-bulls-warning', text: 'text-bulls-warning-ink' };
  return { bar: 'bg-bulls-error', text: 'text-bulls-error-ink' };
}

/** Força da evidência em 0–100. Sem defesa gerada não há número: diz isso. */
export function BullsScoreMeter({ percent, label }: { percent: number | null; label: string }) {
  if (percent === null) {
    return <span className="text-[12.5px] text-bulls-ink-3">sem minuta</span>;
  }
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const tone = scoreTone(value);
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-1.5 w-16 overflow-hidden rounded-full bg-bulls-neutral-soft"
      >
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn('text-[13px] font-semibold tabular-nums', tone.text)}>{value}</span>
    </div>
  );
}

type StatusTone = 'success' | 'error' | 'brand' | 'warning' | 'neutral';

const STATUS_TONE: Record<MedStatus, StatusTone> = {
  RECEIVED: 'neutral',
  COLLECTING_DATA: 'warning',
  MISSING_EVIDENCE: 'error',
  READY_TO_GENERATE: 'brand',
  DEFENSE_GENERATED: 'brand',
  READY_TO_SUBMIT: 'success',
  SUBMITTED: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'error',
  EXPIRED: 'error',
};

const TONE_CLASS: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: 'border-bulls-success/25 bg-bulls-success-soft text-bulls-success-ink',
    dot: 'bg-bulls-success',
  },
  error: { badge: 'border-bulls-error/25 bg-bulls-error-soft text-bulls-error-ink', dot: 'bg-bulls-error' },
  brand: { badge: 'border-bulls-brand/25 bg-bulls-brand-soft text-bulls-brand-deep', dot: 'bg-bulls-brand' },
  warning: {
    badge: 'border-bulls-warning/30 bg-bulls-warning-soft text-bulls-warning-ink',
    dot: 'bg-bulls-warning',
  },
  neutral: { badge: 'border-bulls-line-strong bg-bulls-neutral-soft text-bulls-ink-2', dot: 'bg-bulls-ink-4' },
};

export function BullsStatusPill({ status, className }: { status: MedStatus; className?: string }) {
  const tone = TONE_CLASS[STATUS_TONE[status]];
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold whitespace-nowrap',
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.dot)} />
      {MED_STATUS_LABEL[status]}
    </span>
  );
}

/** Tom da pílula de prazo: menos de 24 h é vermelho, menos de 72 h é âmbar. */
export function prazoTone(hours: number | null): string {
  if (hours === null) return 'bg-bulls-neutral-soft text-bulls-ink-3';
  if (hours < 24) return 'bg-bulls-error-soft text-bulls-error-ink';
  if (hours < 72) return 'bg-bulls-warning-soft text-bulls-warning-ink';
  return 'bg-bulls-neutral-soft text-bulls-ink-2';
}

/** Prazo como o operador lê: "6 h", "3 dias", "vencido", "sem prazo". */
export function prazoCurto(hours: number | null): string {
  if (hours === null) return 'sem prazo';
  if (hours < 0) return 'vencido';
  if (hours < 1) return '< 1 h';
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.ceil(hours / 24)} dias`;
}

export function BullsPrazoChip({ hours }: { hours: number | null }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap tabular-nums',
        prazoTone(hours),
      )}
    >
      {prazoCurto(hours)}
    </span>
  );
}

/** Encurta o identificador para a lista; o valor completo vai no `title`. */
export function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-5)}` : value;
}
