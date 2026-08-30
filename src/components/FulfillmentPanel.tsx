import { DELIVERY_CHANNELS, EVIDENCE_SOURCES } from '@/domain/types';
import type { ProductType } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { Panel } from '@/components/ui';
import { Field, FormGrid, Select, SubmitButton } from '@/components/form';
import { recordDigitalDeliveryAction, recordShipmentAction } from '@/app/meds/actions';
import {
  DELIVERY_CHANNEL_LABEL,
  EVIDENCE_SOURCE_LABEL,
  PHYSICAL_PRODUCT_TYPES,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_ORDER,
} from '@/lib/labels';

/**
 * Painel de entrega — o passo central da operação diária.
 *
 * O operador escolhe o status, informa quando cada etapa aconteceu e sai com a
 * defesa gerada. A forma muda conforme o produto: rastreio para físico, envio
 * do acesso para digital e serviços.
 *
 * Cada horário é um campo separado de propósito: status sozinho não vira
 * afirmação — sem a data, o marco não entra na linha do tempo nem no PDF.
 */

function localDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

function milestoneValue(medCase: MedCase, status: string): string | undefined {
  const event = medCase.tracking?.events.find((entry) => entry.status === status);
  return localDateTime(event?.occurredAt);
}

function GenerateToggle() {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-text-secondary)]">
      <input type="checkbox" name="generateDefense" defaultChecked className="h-3.5 w-3.5 accent-[var(--color-primary)]" />
      Gerar a defesa ao salvar
    </label>
  );
}

function SourceFields({ defaultSource }: { defaultSource: string }) {
  return (
    <>
      <Select
        label="Origem do dado"
        name="source"
        required
        options={EVIDENCE_SOURCES}
        labels={EVIDENCE_SOURCE_LABEL}
        defaultValue={defaultSource}
      />
      <Field
        label="Referência da origem"
        name="sourceReference"
        hint="Nº do pedido no ERP, ID da mensagem"
      />
    </>
  );
}

export function ShipmentPanel({ medCase }: { medCase: MedCase }) {
  const tracking = medCase.tracking;

  return (
    <Panel
      title="Entrega do pedido"
      footer="Preencha só as etapas que você consegue comprovar. Etapa sem horário não entra na linha do tempo nem no PDF — o sistema não arbitra uma data. Dado digitado fica registrado como manual, e a defesa mostra isso."
    >
      <form action={recordShipmentAction} className="space-y-4">
        <input type="hidden" name="medId" value={medCase.med.id} />

        <FormGrid>
          <Select
            label="Status"
            name="status"
            required
            options={SHIPMENT_STATUS_ORDER}
            labels={SHIPMENT_STATUS_LABEL}
            defaultValue={tracking?.status ?? 'IN_PRODUCTION'}
          />
          <Field
            label="Código de rastreio"
            name="trackingCode"
            defaultValue={tracking?.trackingCode ?? undefined}
            hint="Em branco enquanto não houver postagem"
          />
          <Field label="Transportadora" name="carrier" defaultValue={tracking?.carrier ?? undefined} />
          <Field
            label="Recebido por"
            name="receiverName"
            defaultValue={tracking?.receiverName ?? undefined}
          />
        </FormGrid>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-secondary)]">
            Quando cada etapa aconteceu
          </p>
          <FormGrid>
            <Field
              label="Entrou em produção"
              name="inProductionAt"
              type="datetime-local"
              defaultValue={milestoneValue(medCase, 'IN_PRODUCTION')}
            />
            <Field
              label="Postado"
              name="postedAt"
              type="datetime-local"
              defaultValue={localDateTime(tracking?.postedAt) ?? milestoneValue(medCase, 'POSTED')}
            />
            <Field
              label="Entrou em trânsito"
              name="inTransitAt"
              type="datetime-local"
              defaultValue={milestoneValue(medCase, 'IN_TRANSIT')}
            />
            <Field
              label="Saiu para entrega"
              name="outForDeliveryAt"
              type="datetime-local"
              defaultValue={milestoneValue(medCase, 'OUT_FOR_DELIVERY')}
            />
            <Field
              label="Entregue"
              name="deliveredAt"
              type="datetime-local"
              defaultValue={
                localDateTime(tracking?.deliveredAt) ?? milestoneValue(medCase, 'DELIVERED')
              }
            />
            <Field
              label="Tentativa sem sucesso"
              name="notDeliveredAt"
              type="datetime-local"
              defaultValue={milestoneValue(medCase, 'NOT_DELIVERED')}
            />
            <Field
              label="Devolvido"
              name="returnedAt"
              type="datetime-local"
              defaultValue={milestoneValue(medCase, 'RETURNED')}
            />
          </FormGrid>
        </div>

        <FormGrid>
          <SourceFields defaultSource={tracking?.source ?? 'MANUAL'} />
        </FormGrid>

        <div className="flex items-center gap-4">
          <SubmitButton>Salvar entrega</SubmitButton>
          <GenerateToggle />
        </div>
      </form>
    </Panel>
  );
}

export function DigitalDeliveryPanel({ medCase }: { medCase: MedCase }) {
  const delivery = medCase.digitalDelivery;

  return (
    <Panel
      title="Entrega do acesso"
      footer="A defesa se sustenta no envio do acesso — data, canal e destino —, sem depender de o comprador confirmar que recebeu."
    >
      <form action={recordDigitalDeliveryAction} className="space-y-4">
        <input type="hidden" name="medId" value={medCase.med.id} />

        <FormGrid>
          <Select
            label="Canal"
            name="channel"
            required
            options={DELIVERY_CHANNELS}
            labels={DELIVERY_CHANNEL_LABEL}
            defaultValue={delivery?.channel ?? 'EMAIL'}
          />
          <Field
            label="Enviado para"
            name="sentTo"
            defaultValue={delivery?.sentTo ?? undefined}
            hint="E-mail ou contato que recebeu o acesso"
          />
          <Field
            label="Enviado em"
            name="sentAt"
            type="datetime-local"
            defaultValue={localDateTime(delivery?.sentAt)}
          />
          <Field
            label="Plataforma"
            name="platform"
            defaultValue={delivery?.platform ?? undefined}
            hint="Área de membros, curso, painel"
          />
        </FormGrid>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-secondary)]">
            Uso pelo comprador (quando você tiver)
          </p>
          <FormGrid>
            <Field
              label="Primeiro acesso"
              name="firstAccessAt"
              type="datetime-local"
              defaultValue={localDateTime(delivery?.firstAccessAt)}
            />
            <Field
              label="Número de acessos"
              name="accessCount"
              type="number"
              defaultValue={
                delivery?.accessCount === null || delivery?.accessCount === undefined
                  ? undefined
                  : String(delivery.accessCount)
              }
            />
          </FormGrid>
        </div>

        <FormGrid>
          <SourceFields defaultSource={delivery?.source ?? 'MERCHANT'} />
        </FormGrid>

        <div className="flex items-center gap-4">
          <SubmitButton>Salvar entrega</SubmitButton>
          <GenerateToggle />
        </div>
      </form>
    </Panel>
  );
}

export function FulfillmentPanel({
  medCase,
  productType,
}: {
  medCase: MedCase;
  productType: ProductType;
}) {
  const isPhysical = (PHYSICAL_PRODUCT_TYPES as readonly string[]).includes(productType);
  return isPhysical ? (
    <ShipmentPanel medCase={medCase} />
  ) : (
    <DigitalDeliveryPanel medCase={medCase} />
  );
}
