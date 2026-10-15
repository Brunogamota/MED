import { Badge } from '@/components/ui/badge';
import { STATUS_LABEL, type PreviewStatus } from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';

/** Tom de cada status: verde pronto, vermelho sem registro, âmbar coletando. */
const TONE: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--op3-success)/12 text-(--op3-success-ink)',
  SEM_ENVIO: 'bg-(--op3-error)/10 text-(--op3-error-ink)',
  DEFESA: 'bg-(--op3-violet)/10 text-(--op3-violet)',
  COLETANDO: 'bg-(--op3-warning)/14 text-(--op3-warning-ink)',
  ENVIADO: 'bg-muted text-(--op3-ink-2)',
};

const DOT: Record<PreviewStatus, string> = {
  PRONTO: 'bg-(--op3-success)',
  SEM_ENVIO: 'bg-(--op3-error)',
  DEFESA: 'bg-(--op3-violet)',
  COLETANDO: 'bg-(--op3-warning)',
  ENVIADO: 'bg-(--op3-ink-3)',
};

export function StatusBadge({ status, className }: { status: PreviewStatus; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn('h-6 gap-1.5 rounded-full px-2.5 font-medium', TONE[status], className)}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Prazo curto pede atenção: menos de 24h em vermelho, menos de 72h em âmbar. */
export function prazoTone(horas: number): string {
  if (horas < 24) return 'text-(--op3-error-ink)';
  if (horas < 72) return 'text-(--op3-warning-ink)';
  return 'text-(--op3-ink-3)';
}

/** Corta o meio do end-to-end para caber; o valor inteiro vai no `title`. */
export function e2eCurto(e2e: string): string {
  return e2e.length > 18 ? `${e2e.slice(0, 9)}…${e2e.slice(-6)}` : e2e;
}

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/** Barra de força da evidência (0–100). */
export function ScoreMeter({ score }: { score: number }) {
  const tone =
    score >= 75 ? 'bg-(--op3-success)' : score >= 50 ? 'bg-(--op3-warning)' : 'bg-(--op3-error)';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Força da evidência"
      >
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-medium tabular-nums text-(--op3-ink-2)">{score}</span>
    </div>
  );
}
