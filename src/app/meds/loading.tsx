/** Skeleton da fila: a forma do conteúdo real, sem brilho, após 300ms. */
export default function MedsLoading() {
  return (
    <div className="skeleton-defer space-y-4" aria-busy>
      <div className="flex items-baseline justify-between">
        <div className="skeleton-block h-6 w-24" />
        <div className="flex gap-2">
          <div className="skeleton-block h-8 w-28" />
          <div className="skeleton-block h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2 bg-white px-4 py-3">
            <div className="skeleton-block h-3 w-20" />
            <div className="skeleton-block h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="skeleton-block h-9 w-full max-w-[520px]" />
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex h-11 items-center gap-4 border-b border-[var(--color-border)] px-4 last:border-b-0"
          >
            <div className="skeleton-block h-3.5 w-3.5" />
            <div className="skeleton-block h-3.5 w-32" />
            <div className="skeleton-block h-3.5 w-40" />
            <div className="skeleton-block ml-auto h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
