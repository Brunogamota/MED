import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui';
import { MED_STATUS_LABEL } from '@/lib/labels';
import { DECLARABLE_OUTCOMES } from '@/services/medService';
import { setMedOutcomeAction } from '@/app/(console)/meds/actions';
import type { MedStatus } from '@/domain/types';

/**
 * Desfecho do caso, declarado por quem opera.
 *
 * So aparecem aqui os quatro status que o sistema nao tem como saber sozinho:
 * se a instituicao recebeu, aceitou, recusou, ou se o prazo passou. O resto do
 * quadro sai da evidencia que existe no caso, e um botao que dissesse "pronto
 * para envio" com evidencia faltando faria o sistema afirmar o que o caso nao
 * sustenta — que e exatamente o que este produto nao faz.
 *
 * "Voltar ao automatico" existe porque errar o clique tem de ter conserto:
 * sem ele, marcar Rejeitado seria definitivo.
 */
export function OutcomePanel({ medId, status }: { medId: string; status: MedStatus }) {
  const declared = DECLARABLE_OUTCOMES.includes(status);

  return (
    <Panel title="Desfecho">
      <p className="mb-3 text-muted-foreground text-sm">
        O que a instituição respondeu. É a única parte do status que o sistema não calcula
        sozinho — o resto vem da evidência do caso.
      </p>
      <form action={setMedOutcomeAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="medId" value={medId} />
        {DECLARABLE_OUTCOMES.map((outcome) => (
          <Button
            key={outcome}
            type="submit"
            name="outcome"
            value={outcome}
            size="sm"
            variant={status === outcome ? 'default' : 'outline'}
            aria-pressed={status === outcome}
          >
            {MED_STATUS_LABEL[outcome]}
          </Button>
        ))}
        {declared ? (
          <Button type="submit" name="outcome" value="" size="sm" variant="ghost">
            Voltar ao automático
          </Button>
        ) : null}
      </form>
      <p className="mt-3 text-muted-foreground text-sm">
        {declared
          ? `Marcado como ${MED_STATUS_LABEL[status]}. Enquanto houver desfecho declarado, o status para de acompanhar a evidência.`
          : `Status atual: ${MED_STATUS_LABEL[status]}, calculado a partir da evidência do caso.`}
      </p>
    </Panel>
  );
}
