import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col overflow-hidden rounded-[10px] border border-border bg-card', className)}>
      <header className="flex items-start justify-between gap-3 px-4 pb-0 pt-3">
        <div className="min-w-0">
          <h2 id={id} className="text-[13px] font-semibold text-foreground">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-[12px] text-(--o4-subtle)">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn('flex-1 px-4 pb-4 pt-3', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Delta({ value, suffix }: { value: number; suffix: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-[5px] px-1.5 font-mono text-[11px] tabular-nums',
        up ? 'bg-(--o4-brand)/12 text-(--o4-lilac)' : 'bg-(--o4-success)/12 text-(--o4-success)',
      )}
    >
      {up ? '+' : '−'}
      {Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% <span className="text-(--o4-subtle)">{suffix}</span>
    </span>
  );
}

export function Meter({ value, tone }: { value: number; tone: string }) {
  return (
    <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-(--o4-raised)">
      <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.min(100, value)}%` }} />
    </span>
  );
}
