import Link from 'next/link';
import type { NextAction } from '@/lib/nextAction';
import { formatDateTime } from '@/lib/format';
import { ScoreBar, SubtleBadge } from '@/components/ui';
import { createSubmissionAction, generateDefenseAction } from '@/app/meds/actions';

/**
 * Bloco "Próxima ação" — o novo centro da tela do caso (briefing 3.4).
 * Um estado por vez; cada item faltante leva o operador direto ao campo.
 */

function PrimarySubmit({ medId, label }: { medId: string; label: string }) {
  return (
    <form action={createSubmissionAction}>
      <input type="hidden" name="medId" value={medId} />
      <input type="hidden" name="provider" value="generic-json" />
      <button
        type="submit"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {label}
      </button>
    </form>
  );
}

export function NextActionCard({ medId, action }: { medId: string; action: NextAction }) {
  if (action.kind === 'submitted') {
    return (
      <section className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Próxima ação</p>
        <p className="mt-1 text-sm font-medium">
          Defesa enviada
          {action.submittedAt ? ` em ${formatDateTime(action.submittedAt)}` : ''}
          {action.provider ? ` · destino ${action.provider}` : ''}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{action.expectation}</p>
      </section>
    );
  }

  if (action.kind === 'expired') {
    return (
      <section className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-xs text-destructive">Próxima ação</p>
        <p className="mt-1 text-sm font-medium text-destructive">
          Prazo de resposta vencido
          {action.deadlineAt ? ` em ${formatDateTime(action.deadlineAt)}` : ''}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          O MED não aceita mais defesa. Registre o desfecho para o histórico do caso.
        </p>
      </section>
    );
  }

  if (action.kind === 'critical') {
    return (
      <section className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs text-destructive">
              Próxima ação
              <SubtleBadge tone="danger">urgente</SubtleBadge>
            </p>
            <p className="mt-1 text-sm font-medium text-destructive">
              Prazo crítico: menos de {action.hoursLeft + 1} h para responder
            </p>
          </div>
          <PrimarySubmit medId={medId} label="Preparar envio mesmo incompleto" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{action.impact}</p>
        <ul className="mt-3 space-y-2">
          {action.missing.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">{item.label}</span>
              <Link
                href={item.href}
                className="shrink-0 font-medium text-foreground underline underline-offset-2"
              >
                {item.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (action.kind === 'ready') {
    return (
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Próxima ação</p>
            <p className="mt-1 flex items-center gap-3 text-sm font-medium">
              Pronto para enviar
              <ScoreBar value={action.score} max={action.max} width="w-24" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {action.stale ? (
              <form action={generateDefenseAction}>
                <input type="hidden" name="medId" value={medId} />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
                >
                  Regerar com as evidências novas
                </button>
              </form>
            ) : null}
            <PrimarySubmit medId={medId} label="Preparar envio" />
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {action.summary}
          {action.stale
            ? ' Evidência nova entrou depois desta minuta — regere antes de enviar.'
            : ''}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">Próxima ação</p>
      <p className="mt-1 text-sm font-medium">
        {action.requiredCount === 1
          ? 'Falta 1 evidência obrigatória'
          : `Faltam ${action.requiredCount} evidências obrigatórias`}
      </p>
      <ul className="mt-3 divide-y divide-border">
        {action.items.map((item) => (
          <li key={item.label} className="flex min-h-9 items-center justify-between gap-3 py-1.5 text-sm">
            <span className="flex items-center gap-2">
              <SubtleBadge tone={item.necessity === 'REQUIRED' ? 'danger' : 'warning'}>
                {item.necessity === 'REQUIRED' ? 'Obrigatória' : 'Recomendada'}
              </SubtleBadge>
              {item.label}
            </span>
            <Link
              href={item.href}
              className="shrink-0 font-medium text-foreground hover:underline"
            >
              {item.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
