import type { TimelineEvent } from '@/domain/types';
import { EVIDENCE_SOURCE_LABEL } from '@/lib/labels';
import { formatDateTimeSmart } from '@/lib/format';
import { CopyId } from '@/components/CopyId';
import { EmptyState, SubtleBadge } from '@/components/ui';

/**
 * Linha do tempo do caso (briefing 2.7).
 *
 * O ponto diz a natureza do evento — verde: confirmado com evidência; cinza:
 * registro sem prova; âmbar: prazo; preto: ação manual do operador. A cor
 * nunca é o único portador: a origem aparece em badge ao lado, e `Manual` sai
 * em âmbar porque dado digitado é a evidência mais frágil da defesa.
 */

function dotClass(event: TimelineEvent): string {
  if (event.type === 'med.deadline') return 'bg-[var(--color-warning)]';
  if (event.source === 'MANUAL') return 'bg-[var(--color-primary)]';
  if (event.evidenceIds.length > 0) return 'bg-[var(--color-success)]';
  return 'bg-[var(--color-border-strong)]';
}

export function CaseTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  if (timeline.length === 0) {
    return (
      <EmptyState title="Nenhum evento datado">
        Os eventos aparecem aqui conforme os dados do caso são registrados com data e hora.
      </EmptyState>
    );
  }

  return (
    <ol>
      {timeline.map((event, index) => (
        <li key={`${event.type}-${event.occurredAt}-${index}`} className="flex gap-4">
          <span className="tabular w-[140px] shrink-0 pt-0.5 text-right text-xs text-[var(--color-text-muted)]">
            {formatDateTimeSmart(event.occurredAt)}
          </span>
          <span className="flex flex-col items-center">
            <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(event)}`} />
            {index < timeline.length - 1 ? (
              <span aria-hidden className="w-px flex-1 bg-[var(--color-border)]" />
            ) : null}
          </span>
          <span className="pb-5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13px]">{event.description}</span>
              <SubtleBadge tone={event.source === 'MANUAL' ? 'warning' : 'neutral'}>
                {EVIDENCE_SOURCE_LABEL[event.source]}
              </SubtleBadge>
            </span>
            {event.sourceReference ? (
              <span className="mt-0.5 block">
                <CopyId value={event.sourceReference} />
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
