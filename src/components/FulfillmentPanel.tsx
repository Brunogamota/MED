import { DELIVERY_CHANNELS, EVIDENCE_SOURCES } from '@/domain/types';
import type { ProductType } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { Panel } from '@/components/ui';
import { Field, FormGrid, SubmitButton } from '@/components/form';
import {
  recordDigitalDeliveryAction,
  recordShipmentAction,
} from '@/app/meds/actions';
import {
  DELIVERY_CHANNEL_LABEL,
  PHYSICAL_PRODUCT_TYPES,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_ORDER,
} from '@/lib/labels';

/**
 * Painel de entrega — o passo central da operacao diaria.
 *
 * O operador escolhe o status, informa quando cada etapa aconteceu e sai com a
 * defesa gerada. A forma do painel muda conforme o produto: rastreio para
 * fisico, envio do acesso para digital e servicos.
 *
 * Cada horario e um campo separado de proposito. Status sozinho nao vira
 * afirmacao: sem a data, o marco nao entra na timeline nem no PDF.
 */

function localDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

/** Recupera o horario ja registrado para um marco, para nao pedir duas vezes. */
function milestoneValue(medCase: MedCase, status: string): string | undefined {
  const event = medCase.tracking?.events.find((entry) => entry.status === status);
  return localDateTime(event?.occurredAt);
}

function GenerateToggle() {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
      <input type="checkbox" name="generateDefense" defaultChecked className="h-3.5 w-3.5" />
      Gerar a defesa ao salvar
    </label>
  );
}

function SourceFields({ defaultSource }: { defaultSource: string }) {
  return (
    <>
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Origem do dado <span className="text-red-600">*</span>
        </span>
        <select
          name="source"
          defaultValue={defaultSource}
          className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-sm"
        >
          {EVIDENCE_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
          Dado digitado fica como MANUAL e a defesa mostra isso.
        </span>
      </label>
      <Field label="Referencia da origem" name="sourceReference" hint="Nº do pedido no ERP, ID da mensagem" />
    </>
  );
}

export function ShipmentPanel({ medCase }: { medCase: MedCase }) {
  const tracking = medCase.tracking;

  return (
    <Panel title="Entrega do pedido">
      <form action={recordShipmentAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />

        <FormGrid>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
              Status <span className="text-red-600">*</span>
            </span>
            <select
              name="status"
              required
              defaultValue={tracking?.status ?? 'IN_PRODUCTION'}
              className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-sm"
            >
              {SHIPMENT_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {SHIPMENT_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Codigo de rastreio"
            name="trackingCode"
            defaultValue={tracking?.trackingCode ?? undefined}
            hint="Deixe em branco enquanto o pedido nao foi postado"
          />
          <Field label="Transportadora" name="carrier" defaultValue={tracking?.carrier ?? undefined} />
          <Field
            label="Recebido por"
            name="receiverName"
            defaultValue={tracking?.receiverName ?? undefined}
          />
        </FormGrid>

        <div className="border-t border-[var(--color-border-subtle)] pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Quando cada etapa aconteceu
          </p>
          <FormGrid>
            <Field
              label="Entrou em producao"
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
              label="Entrou em transito"
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
          <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
            Preencha so as etapas que voce consegue comprovar. Etapa sem horario nao entra na
            timeline nem no PDF — o sistema nao arbitra uma data.
          </p>
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
    <Panel title="Entrega do acesso">
      <form action={recordDigitalDeliveryAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />

        <FormGrid>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
              Canal <span className="text-red-600">*</span>
            </span>
            <select
              name="channel"
              required
              defaultValue={delivery?.channel ?? 'EMAIL'}
              className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-sm"
            >
              {DELIVERY_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {DELIVERY_CHANNEL_LABEL[channel]}
                </option>
              ))}
            </select>
          </label>
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
            hint="Area de membros, curso, painel"
          />
        </FormGrid>

        <div className="border-t border-[var(--color-border-subtle)] pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Uso pelo comprador (quando voce tiver)
          </p>
          <FormGrid>
            <Field
              label="Primeiro acesso"
              name="firstAccessAt"
              type="datetime-local"
              defaultValue={localDateTime(delivery?.firstAccessAt)}
            />
            <Field
              label="Numero de acessos"
              name="accessCount"
              type="number"
              defaultValue={
                delivery?.accessCount === null || delivery?.accessCount === undefined
                  ? undefined
                  : String(delivery.accessCount)
              }
            />
          </FormGrid>
          <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
            Opcional. A defesa se sustenta no envio do acesso — data, canal e destino —, sem
            depender de o comprador confirmar que recebeu.
          </p>
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
  return isPhysical ? <ShipmentPanel medCase={medCase} /> : <DigitalDeliveryPanel medCase={medCase} />;
}
