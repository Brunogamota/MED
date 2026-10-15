import { Download, Package } from 'lucide-react';
import type { PreviewMed, PreviewStatus } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { TONE_BG, type Tone } from './theme';

export const STATUS_TONE: Record<PreviewStatus, Tone> = {
  PRONTO: 'success',
  SEM_ENVIO: 'error',
  DEFESA: 'brand',
  COLETANDO: 'warning',
  ENVIADO: 'neutral',
};

export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** E2E longo vira começo…fim; o valor inteiro fica no `title` e no modal. */
export function e2eCurto(e2e: string): string {
  return `${e2e.slice(0, 9)}…${e2e.slice(-6)}`;
}

export function StatusDot({ status }: { status: PreviewStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span aria-hidden className="relative flex size-2 shrink-0">
      {tone === 'error' && (
        <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', TONE_BG[tone])} />
      )}
      <span className={cn('relative size-2 rounded-full', TONE_BG[tone])} />
    </span>
  );
}

export function ProdutoBadge({ produto }: { produto: PreviewMed['produto'] }) {
  const Icon = produto === 'Físico' ? Package : Download;
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-white/[0.04] px-2 text-xs font-medium text-(--o5-text-2)">
      <Icon className="size-3 text-muted-foreground" aria-hidden />
      {produto}
    </span>
  );
}
