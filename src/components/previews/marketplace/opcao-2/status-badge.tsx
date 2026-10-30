import { cn } from '@/lib/cn';
import { STATUS_LABEL, type PreviewStatus } from '@/components/previews/marketplace/fixtures';

const ESTILO: Record<PreviewStatus, { chip: string; ponto: string }> = {
  PRONTO: { chip: 'bg-(--ed-brand-soft) text-(--ed-brand-hover)', ponto: 'bg-(--ed-brand)' },
  SEM_ENVIO: { chip: 'bg-(--ed-error-soft) text-(--ed-error)', ponto: 'bg-(--ed-error)' },
  DEFESA: { chip: 'bg-(--ed-amber-soft) text-(--ed-amber-ink)', ponto: 'bg-(--ed-amber)' },
  COLETANDO: { chip: 'bg-(--ed-muted) text-(--ed-ink-2)', ponto: 'bg-(--ed-ink-3)' },
  ENVIADO: { chip: 'bg-(--ed-olive-soft) text-(--ed-olive)', ponto: 'bg-(--ed-olive)' },
};

export function StatusBadge({ status, className }: { status: PreviewStatus; className?: string }) {
  const e = ESTILO[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-medium whitespace-nowrap',
        e.chip,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', e.ponto)} />
      {STATUS_LABEL[status]}
    </span>
  );
}
