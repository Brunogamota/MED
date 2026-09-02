import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { MED_STATUS_LABEL, MED_STATUS_TONE } from '@/lib/labels';
import type { MedStatus } from '@/domain/types';

/**
 * Status do MED como selo.
 *
 * O tom vem de `MED_STATUS_TONE`, unico lugar que decide a gravidade de cada
 * status — a tela so traduz esse tom em variante do selo.
 */
const TONE_CLASS: Record<ReturnType<() => (typeof MED_STATUS_TONE)[MedStatus]>, string> = {
  neutral: '',
  info: '',
  accent: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  danger: '',
};

export function StatusBadge({ status, className }: { status: MedStatus; className?: string }) {
  const tone = MED_STATUS_TONE[status];

  return (
    <Badge
      variant={tone === 'danger' ? 'destructive' : tone === 'neutral' ? 'secondary' : 'outline'}
      className={cn(TONE_CLASS[tone], className)}
    >
      {MED_STATUS_LABEL[status]}
    </Badge>
  );
}
