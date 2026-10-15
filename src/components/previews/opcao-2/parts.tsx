import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, type PreviewStatus } from '@/components/previews/fixtures';

const STATUS_TONE: Record<PreviewStatus, { badge: string; dot: string }> = {
  PRONTO: {
    badge: 'bg-[var(--o2-success-soft)] text-[var(--o2-success-ink)] border-[color-mix(in_oklab,var(--o2-success)_22%,transparent)]',
    dot: 'bg-[var(--o2-success)]',
  },
  SEM_ENVIO: {
    badge: 'bg-[var(--o2-error-soft)] text-[var(--o2-error-ink)] border-[color-mix(in_oklab,var(--o2-error)_22%,transparent)]',
    dot: 'bg-[var(--o2-error)]',
  },
  DEFESA: {
    badge: 'bg-[var(--o2-brand-soft)] text-[var(--o2-brand-deep)] border-[color-mix(in_oklab,var(--o2-brand)_24%,transparent)]',
    dot: 'bg-[var(--o2-brand)]',
  },
  COLETANDO: {
    badge: 'bg-[var(--o2-warning-soft)] text-[var(--o2-warning-ink)] border-[color-mix(in_oklab,var(--o2-warning)_26%,transparent)]',
    dot: 'bg-[var(--o2-warning)]',
  },
  ENVIADO: {
    badge: 'bg-[var(--o2-neutral-soft)] text-[var(--o2-ink-2)] border-[var(--o2-line-strong)]',
    dot: 'bg-[var(--o2-ink-4)]',
  },
};

export function StatusBadge({ status, className }: { status: PreviewStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <Badge variant="outline" className={cn('h-6 gap-1.5 px-2.5 text-[12px] font-semibold', tone.badge, className)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.dot)} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Tons de avatar por inicial: só decoração, sem significado. */
const AVATAR_TONES = [
  'bg-[var(--o2-av-1)] text-[var(--o2-av-1-ink)]',
  'bg-[var(--o2-av-2)] text-[var(--o2-av-2-ink)]',
  'bg-[var(--o2-av-3)] text-[var(--o2-av-3-ink)]',
  'bg-[var(--o2-av-4)] text-[var(--o2-av-4-ink)]',
  'bg-[var(--o2-av-5)] text-[var(--o2-av-5-ink)]',
  'bg-[var(--o2-av-6)] text-[var(--o2-av-6-ink)]',
];

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function PersonAvatar({ name, size = 'default' }: { name: string; size?: 'default' | 'lg' }) {
  const tone = AVATAR_TONES[(name.charCodeAt(0) + name.length) % AVATAR_TONES.length];
  return (
    <Avatar size={size} className="after:border-transparent">
      <AvatarFallback className={cn('text-[12px] font-semibold', tone)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function scoreTone(score: number): { bar: string; text: string } {
  if (score >= 75) return { bar: 'bg-[var(--o2-success)]', text: 'text-[var(--o2-success-ink)]' };
  if (score >= 50) return { bar: 'bg-[var(--o2-warning)]', text: 'text-[var(--o2-warning-ink)]' };
  return { bar: 'bg-[var(--o2-error)]', text: 'text-[var(--o2-error-ink)]' };
}

export function ScoreMeter({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--o2-neutral-soft)]"
      >
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-[13px] font-semibold tabular-nums', tone.text)}>{score}</span>
    </div>
  );
}

export function prazoTone(horas: number): string {
  if (horas < 24) return 'bg-[var(--o2-error-soft)] text-[var(--o2-error-ink)]';
  if (horas < 72) return 'bg-[var(--o2-warning-soft)] text-[var(--o2-warning-ink)]';
  return 'bg-[var(--o2-neutral-soft)] text-[var(--o2-ink-2)]';
}

/** Encurta o end-to-end para a lista; o valor completo vai no `title`. */
export function shortE2e(e2e: string): string {
  return `${e2e.slice(0, 9)}…${e2e.slice(-5)}`;
}
