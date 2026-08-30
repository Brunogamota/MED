/** Skeleton do detalhe do MED: cabeçalho, métricas, abas e cards. */
export default function MedDetailLoading() {
  return (
    <div className="skeleton-defer space-y-4" aria-busy>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="skeleton-block h-6 w-40" />
          <div className="skeleton-block h-4 w-24" />
        </div>
        <div className="skeleton-block h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 bg-white px-4 py-3">
            <div className="skeleton-block h-3 w-24" />
            <div className="skeleton-block h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="skeleton-block h-9 w-full max-w-[400px]" />
      <div className="skeleton-block h-24 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton-block h-64 rounded-lg" />
        <div className="skeleton-block h-64 rounded-lg" />
      </div>
    </div>
  );
}
