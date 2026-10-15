import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEDS, RESUMO, brl, prazo } from '@/components/previews/fixtures';
import { StatusBadge } from './status-badge';

/** Os itens da fila com prazo abaixo de 24h, do mais urgente ao menos. */
export function DueSoon() {
  const urgentes = MEDS.filter((m) => m.prazoHoras < 24).sort((a, b) => a.prazoHoras - b.prazoHoras);

  return (
    <section
      id="vencendo"
      aria-labelledby="o1-vencendo"
      className="flex scroll-mt-20 flex-col rounded-xl border border-white/[0.07] bg-card shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]"
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 id="o1-vencendo" className="text-[14px] font-medium text-foreground">
            Vencem primeiro
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Prazo abaixo de 24h nesta fila</p>
        </div>
        <span className="inline-flex h-6 items-center rounded-full bg-(--o1-warning)/12 px-2 font-mono text-[11px] font-medium text-(--o1-warning) tabular-nums">
          {RESUMO.vencendo24h} no total
        </span>
      </header>

      <ol className="mt-4 flex flex-1 flex-col px-2">
        {urgentes.map((m) => {
          const critico = m.prazoHoras <= 6;
          return (
            <li key={m.id}>
              <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.03]">
                <div
                  className={
                    critico
                      ? 'flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-(--o1-error)/25 bg-(--o1-error)/10'
                      : 'flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-(--o1-warning)/25 bg-(--o1-warning)/10'
                  }
                >
                  <span className={critico ? 'font-mono text-[14px] leading-none font-medium text-(--o1-error)' : 'font-mono text-[14px] leading-none font-medium text-(--o1-warning)'}>
                    {prazo(m.prazoHoras)}
                  </span>
                  <span className="mt-1 text-[9.5px] leading-none text-muted-foreground uppercase">prazo</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{m.pagador}</p>
                  <div className="mt-1">
                    <StatusBadge status={m.status} compact />
                  </div>
                </div>
                <p className="shrink-0 font-mono text-[13px] text-(--o1-text-2) tabular-nums">{brl(m.valor)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/[0.06] px-5 py-3">
        <Link
          href="#fila"
          className="inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-(--o1-lilac) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Ver a fila completa
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
