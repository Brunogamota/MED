import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { COMPROVANTE } from '@/components/previews/fixtures';
import { MONO } from './theme';

type Etapa = (typeof COMPROVANTE.etapas)[number];

/**
 * Rastreador vertical das etapas do pedido. Só desenha o que veio no registro:
 * etapa concluída tem data; a que está em andamento mostra o texto que veio no
 * lugar da data, sem estimativa.
 *
 * `light` é a versão impressa (comprovante), com cor literal de peça externa;
 * `dark` é a do console, só com tokens.
 */
export function Tracker({
  etapas,
  variant,
  label,
}: {
  etapas: readonly Etapa[];
  variant: 'dark' | 'light';
  label: string;
}) {
  const light = variant === 'light';
  return (
    <ol aria-label={label} className="relative">
      {etapas.map((etapa, i) => {
        const done = etapa.status === 'completed';
        const last = i === etapas.length - 1;
        const nextDone = !last && etapas[i + 1]?.status === 'completed';
        return (
          <li key={etapa.titulo} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-7 bottom-1 left-[13px] w-0.5 rounded-full',
                  nextDone
                    ? light
                      ? 'bg-[#A855F7]'
                      : 'bg-linear-to-b from-(--o5-brand) to-(--o5-violet)'
                    : light
                      ? 'bg-[repeating-linear-gradient(to_bottom,#D8C7F5_0_4px,transparent_4px_8px)]'
                      : 'bg-[repeating-linear-gradient(to_bottom,rgb(192_132_252/0.45)_0_4px,transparent_4px_8px)]',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
                done
                  ? light
                    ? 'bg-linear-to-br from-[#A855F7] to-[#8B5CF6] text-white shadow-[0_4px_12px_-2px_rgba(168,85,247,0.55)] [print-color-adjust:exact]'
                    : 'bg-linear-to-br from-(--o5-brand) to-(--o5-violet) text-white shadow-[0_0_18px_-2px_rgb(168_85_247/0.7)]'
                  : light
                    ? 'border-2 border-[#A855F7] bg-white'
                    : 'border-2 border-(--o5-lilac) bg-background',
              )}
            >
              {done ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <span
                  className={cn(
                    'size-2 animate-pulse rounded-full',
                    light ? 'bg-[#A855F7]' : 'bg-(--o5-lilac)',
                  )}
                />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold leading-5',
                  light ? 'text-[#0F172A]' : 'text-foreground',
                )}
              >
                {etapa.titulo}
                <span className="sr-only">{done ? ' (concluída)' : ' (em andamento)'}</span>
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs',
                  done && MONO,
                  done
                    ? light
                      ? 'text-[#475569]'
                      : 'text-muted-foreground'
                    : light
                      ? 'font-medium text-[#7C3AED]'
                      : 'font-medium text-(--o5-lilac)',
                )}
              >
                {etapa.data}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
