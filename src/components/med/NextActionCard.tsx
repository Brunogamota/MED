import Link from 'next/link';
import { BellRing } from 'lucide-react';
import type { NextAction } from '@/lib/nextAction';
import { formatDateTime } from '@/lib/format';
import { ScoreBar, SubtleBadge } from '@/components/ui';
import { createSubmissionAction, generateDefenseAction } from '@/app/(console)/meds/actions';

/**
 * Bloco "Próxima ação" — o novo centro da tela do caso (briefing 3.4).
 * Um estado por vez; cada item faltante leva o operador direto ao campo.
 */

/**
 * Envio a partir do cartão vermelho: o botão é escuro sobre o vermelho, e não
 * o primário do sistema, que sumiria no fundo.
 */
function CriticalSubmit({ medId, label }: { medId: string; label: string }) {
  return (
    <form action={createSubmissionAction}>
      <input type="hidden" name="medId" value={medId} />
      <input type="hidden" name="provider" value="generic-json" />
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-neutral-900 px-6 font-semibold text-neutral-50 text-sm shadow-sm transition-colors hover:bg-neutral-800"
      >
        {label}
      </button>
    </form>
  );
}

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
      // Vermelho cheio, e não a variante suave dos outros estados: quando
      // faltam horas para o prazo, o cartão precisa interromper a leitura da
      // página, não conviver com ela. Cor fixa nos dois temas — o alarme não
      // muda de intensidade porque o operador prefere tema claro.
      <section className="overflow-hidden rounded-2xl bg-[#f9575f] p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-2xl leading-tight tracking-tight">
              Prazo crítico: menos de {action.hoursLeft + 1} h para responder
            </h2>
            <p className="mt-2 max-w-prose text-[15px] text-white/90 leading-snug">
              {action.impact}
            </p>
          </div>
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15"
          >
            <BellRing className="size-5" />
          </span>
        </div>

        {action.missing.length > 0 ? (
          <ul className="mt-5 divide-y divide-white/20 border-white/20 border-y">
            {action.missing.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{item.label}</span>
                <Link
                  href={item.href}
                  className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
                >
                  {item.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5">
          <CriticalSubmit medId={medId} label="Preparar envio mesmo incompleto" />
        </div>
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
