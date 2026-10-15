import { Send } from 'lucide-react';
import { RESUMO, brl } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { GLASS, HEADING, MONO, TONE_BG, type Tone } from './theme';

const comEvidencia = RESUMO.emAberto - RESUMO.semEvidencia;

const METROS: { label: string; parte: number; tone: Tone }[] = [
  { label: 'Casos com evidência', parte: comEvidencia, tone: 'success' },
  { label: 'Prontos para envio', parte: RESUMO.prontos, tone: 'brand' },
  { label: 'Vencendo em 24h', parte: RESUMO.vencendo24h, tone: 'warning' },
];

/** Valor em disputa e as proporções da fila. Tudo derivado de RESUMO. */
export function QueueSummary() {
  return (
    <section aria-labelledby="o5-valor" className={cn(GLASS, 'relative flex flex-col overflow-hidden p-5 sm:p-6')}>
      <span
        aria-hidden
        className="absolute -top-24 -left-20 size-64 rounded-full bg-(--o5-brand)/20 blur-3xl"
      />
      <h2 id="o5-valor" className="relative text-[13px] font-semibold text-(--o5-text-2)">
        Valor em aberto
      </h2>
      <p className={cn(HEADING, 'relative mt-2 text-[34px] leading-none font-semibold text-foreground tabular-nums')}>
        {brl(RESUMO.valorEmAberto)}
      </p>
      <p className="relative mt-2 text-xs text-muted-foreground">
        Em disputa em <span className={cn(MONO, 'text-(--o5-text-2)')}>{RESUMO.emAberto}</span> casos
      </p>

      <ul className="relative mt-7 mb-6 space-y-5">
        {METROS.map((m) => {
          const pct = Math.round((m.parte / RESUMO.emAberto) * 100);
          return (
            <li key={m.label}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-(--o5-text-2)">{m.label}</span>
                <span className={cn(MONO, 'text-muted-foreground')}>
                  <span className="font-semibold text-foreground">{pct}%</span> · {m.parte} de {RESUMO.emAberto}
                </span>
              </div>
              <div
                role="meter"
                aria-label={m.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
              >
                <div
                  className={cn('h-full rounded-full', TONE_BG[m.tone])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="flex items-center gap-2 text-xs font-medium text-(--o5-text-2)">
          <Send className="size-3.5 text-(--o5-lilac)" aria-hidden />
          Enviados no mês
        </span>
        <span className={cn(MONO, 'text-base font-semibold text-foreground')}>{RESUMO.enviadosMes}</span>
      </div>
    </section>
  );
}
