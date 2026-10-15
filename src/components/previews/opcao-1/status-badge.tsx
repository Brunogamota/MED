import { cn } from '@/lib/cn';
import { STATUS_LABEL, type PreviewStatus } from '@/components/previews/fixtures';

const STYLE: Record<PreviewStatus, { dot: string; chip: string }> = {
  PRONTO: { dot: 'bg-(--o1-lilac)', chip: 'bg-primary/12 text-(--o1-lilac) ring-primary/20' },
  ENVIADO: { dot: 'bg-(--o1-success)', chip: 'bg-(--o1-success)/10 text-(--o1-success) ring-(--o1-success)/20' },
  DEFESA: { dot: 'bg-(--o1-violet)', chip: 'bg-(--o1-violet)/12 text-[#A78BFA] ring-(--o1-violet)/20' },
  COLETANDO: { dot: 'bg-(--o1-warning)', chip: 'bg-(--o1-warning)/10 text-(--o1-warning) ring-(--o1-warning)/20' },
  SEM_ENVIO: { dot: 'bg-(--o1-error)', chip: 'bg-(--o1-error)/10 text-[#F87171] ring-(--o1-error)/20' },
};

export function StatusBadge({ status, compact = false }: { status: PreviewStatus; compact?: boolean }) {
  const s = STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        compact ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-[12px]',
        s.chip,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', s.dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}
