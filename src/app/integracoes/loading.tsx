/** Skeleton das integrações: indicador + grade de cards. */
export default function IntegracoesLoading() {
  return (
    <div className="skeleton-defer space-y-4" aria-busy>
      <div className="space-y-2">
        <div className="skeleton-block h-6 w-36" />
        <div className="skeleton-block h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 bg-white px-4 py-3">
            <div className="skeleton-block h-3 w-28" />
            <div className="skeleton-block h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton-block h-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
