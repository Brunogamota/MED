import {
  DOCUMENT_KINDS,
  EVIDENCE_SOURCES,
  EVIDENCE_TYPES,
  PRODUCT_TYPES,
  SHIPMENT_STATUSES,
  VERIFICATION_STATUSES,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { Panel } from '@/components/ui';
import { Field, FormGrid, Select, SubmitButton } from '@/components/form';
import {
  addDocumentAction,
  addEvidenceAction,
  uploadDocumentAction,
  upsertCustomerAction,
  upsertOrderAction,
  upsertTrackingAction,
  upsertTransactionAction,
} from '@/app/meds/actions';

/**
 * Manual data entry.
 *
 * These forms record what the operator already has; they never pre-fill a value
 * the system has not received. `datetime-local` inputs are rendered from stored
 * values only when a value exists.
 */

function localDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

export function TransactionForm({ medCase }: { medCase: MedCase }) {
  const transaction = medCase.transaction;
  return (
    <Panel title="Transacao">
      <form action={upsertTransactionAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Field
            label="Valor"
            name="amount"
            type="number"
            required
            defaultValue={String(transaction?.amount ?? medCase.med.amount)}
          />
          <Field label="Moeda" name="currency" defaultValue={transaction?.currency ?? 'BRL'} />
          <Field label="Metodo" name="method" defaultValue={transaction?.method ?? undefined} />
          <Field label="Status" name="status" defaultValue={transaction?.status ?? undefined} />
          <Field
            label="Autorizado em"
            name="authorizedAt"
            type="datetime-local"
            defaultValue={localDateTime(transaction?.authorizedAt)}
          />
          <Field
            label="Capturado em"
            name="capturedAt"
            type="datetime-local"
            defaultValue={localDateTime(transaction?.capturedAt)}
          />
          <Field label="Provedor" name="provider" defaultValue={transaction?.provider ?? undefined} />
          <Field
            label="Referencia do provedor"
            name="providerReference"
            defaultValue={transaction?.providerReference ?? undefined}
          />
          <Field
            label="ID externo"
            name="externalId"
            defaultValue={transaction?.externalId ?? undefined}
          />
          <Field
            label="End-to-end ID"
            name="endToEndId"
            defaultValue={transaction?.endToEndId ?? medCase.med.endToEndId ?? undefined}
          />
        </FormGrid>
        <SubmitButton>Salvar transacao</SubmitButton>
      </form>
    </Panel>
  );
}

export function CustomerForm({ medCase }: { medCase: MedCase }) {
  const customer = medCase.customer;
  const address = customer?.address;
  return (
    <Panel title="Cliente">
      <form action={upsertCustomerAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Field label="Nome" name="name" defaultValue={customer?.identification.name ?? undefined} />
          <Field
            label="CPF/CNPJ"
            name="document"
            defaultValue={customer?.identification.document ?? undefined}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={customer?.identification.email ?? undefined}
          />
          <Field
            label="Telefone"
            name="phone"
            defaultValue={customer?.identification.phone ?? undefined}
          />
          <Field
            label="Cliente desde"
            name="accountCreatedAt"
            type="datetime-local"
            defaultValue={localDateTime(customer?.accountCreatedAt)}
          />
          <Field label="ID externo" name="externalId" defaultValue={customer?.externalId ?? undefined} />
        </FormGrid>
        <FormGrid>
          <Field label="Logradouro" name="addressStreet" defaultValue={address?.street ?? undefined} />
          <Field label="Numero" name="addressNumber" defaultValue={address?.number ?? undefined} />
          <Field label="Bairro" name="addressDistrict" defaultValue={address?.district ?? undefined} />
          <Field label="Cidade" name="addressCity" defaultValue={address?.city ?? undefined} />
          <Field label="UF" name="addressState" defaultValue={address?.state ?? undefined} />
          <Field label="CEP" name="addressPostalCode" defaultValue={address?.postalCode ?? undefined} />
        </FormGrid>
        <SubmitButton>Salvar cliente</SubmitButton>
      </form>
    </Panel>
  );
}

export function OrderForm({ medCase }: { medCase: MedCase }) {
  const order = medCase.order;
  const item = order?.items[0];
  const shipping = order?.shippingAddress;
  return (
    <Panel title="Pedido">
      <form action={upsertOrderAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Select
            label="Tipo de produto"
            name="productType"
            options={PRODUCT_TYPES}
            required
            defaultValue={order?.productType ?? medCase.med.productType ?? 'PHYSICAL'}
          />
          <Field label="Numero do pedido" name="externalId" defaultValue={order?.externalId ?? undefined} />
          <Field
            label="Data da compra"
            name="placedAt"
            type="datetime-local"
            defaultValue={localDateTime(order?.placedAt)}
          />
          <Field
            label="Valor total"
            name="totalAmount"
            type="number"
            defaultValue={order?.totalAmount === null || order?.totalAmount === undefined ? undefined : String(order.totalAmount)}
          />
          <Field label="IP do checkout" name="checkoutIp" defaultValue={order?.checkoutIp ?? undefined} />
          <Field
            label="Device fingerprint"
            name="deviceFingerprint"
            defaultValue={order?.deviceFingerprint ?? undefined}
          />
          <Field label="User agent" name="userAgent" defaultValue={order?.userAgent ?? undefined} />
          <Field label="Plataforma" name="provider" defaultValue={order?.provider ?? undefined} />
          <Field
            label="Referencia na plataforma"
            name="providerReference"
            defaultValue={order?.providerReference ?? undefined}
          />
        </FormGrid>
        <FormGrid>
          <Field label="Produto" name="itemName" defaultValue={item?.name} />
          <Field label="SKU" name="itemSku" defaultValue={item?.sku ?? undefined} />
          <Field
            label="Quantidade"
            name="itemQuantity"
            type="number"
            defaultValue={item ? String(item.quantity) : undefined}
          />
          <Field
            label="Valor unitario"
            name="itemUnitAmount"
            type="number"
            defaultValue={
              item?.unitAmount === null || item?.unitAmount === undefined
                ? undefined
                : String(item.unitAmount)
            }
          />
        </FormGrid>
        <FormGrid>
          <Field label="Entrega: logradouro" name="shippingStreet" defaultValue={shipping?.street ?? undefined} />
          <Field label="Entrega: numero" name="shippingNumber" defaultValue={shipping?.number ?? undefined} />
          <Field label="Entrega: bairro" name="shippingDistrict" defaultValue={shipping?.district ?? undefined} />
          <Field label="Entrega: cidade" name="shippingCity" defaultValue={shipping?.city ?? undefined} />
          <Field label="Entrega: UF" name="shippingState" defaultValue={shipping?.state ?? undefined} />
          <Field label="Entrega: CEP" name="shippingPostalCode" defaultValue={shipping?.postalCode ?? undefined} />
        </FormGrid>
        <SubmitButton>Salvar pedido</SubmitButton>
      </form>
    </Panel>
  );
}

export function TrackingForm({ medCase }: { medCase: MedCase }) {
  const tracking = medCase.tracking;
  return (
    <Panel title="Rastreio">
      <form action={upsertTrackingAction} className="space-y-3">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Field
            label="Codigo de rastreio"
            name="trackingCode"
            required
            defaultValue={tracking?.trackingCode}
          />
          <Field label="Transportadora" name="carrier" defaultValue={tracking?.carrier ?? undefined} />
          <Select
            label="Status"
            name="status"
            options={SHIPMENT_STATUSES}
            required
            defaultValue={tracking?.status ?? 'CREATED'}
          />
          <Select
            label="Origem do dado"
            name="source"
            options={EVIDENCE_SOURCES}
            required
            defaultValue={tracking?.source ?? 'MANUAL'}
          />
          <Field
            label="Postado em"
            name="postedAt"
            type="datetime-local"
            defaultValue={localDateTime(tracking?.postedAt)}
          />
          <Field
            label="Entregue em"
            name="deliveredAt"
            type="datetime-local"
            defaultValue={localDateTime(tracking?.deliveredAt)}
          />
          <Field label="Recebido por" name="receiverName" defaultValue={tracking?.receiverName ?? undefined} />
          <Field
            label="Referencia da origem"
            name="sourceReference"
            defaultValue={tracking?.sourceReference ?? undefined}
          />
        </FormGrid>
        <p className="text-[11px] text-[var(--color-ink-muted)]">
          Eventos de rastreamento nao sao digitados aqui. Eles chegam pela integracao com a
          transportadora ou por <code>POST /api/meds/{medCase.med.id}/tracking</code>, preservando a
          origem de cada evento.
          {tracking ? ` Eventos registrados: ${tracking.events.length}.` : ''}
        </p>
        <SubmitButton>Salvar rastreio</SubmitButton>
      </form>
    </Panel>
  );
}

export function EvidenceForm({ medId }: { medId: string }) {
  return (
    <Panel title="Registrar evidencia">
      <form action={addEvidenceAction} className="space-y-3">
        <input type="hidden" name="medId" value={medId} />
        <FormGrid>
          <Select label="Tipo" name="type" options={EVIDENCE_TYPES} required />
          <Field label="Valor" name="value" required />
          <Select label="Origem" name="source" options={EVIDENCE_SOURCES} required defaultValue="MANUAL" />
          <Field label="Referencia da origem" name="sourceReference" hint="Permite reconferir na origem" />
          <Field label="Provedor" name="sourceProvider" />
          <Select
            label="Verificacao"
            name="verificationStatus"
            options={VERIFICATION_STATUSES}
            required
            defaultValue="UNVERIFIED"
          />
          <Field label="Recebido em" name="receivedAt" type="datetime-local" />
          <Field label="Texto exibido" name="displayValue" />
        </FormGrid>
        <SubmitButton>Adicionar evidencia</SubmitButton>
      </form>
    </Panel>
  );
}

export function DocumentForm({ medId }: { medId: string }) {
  return (
    <Panel title="Registrar documento">
      <form action={addDocumentAction} className="space-y-3">
        <input type="hidden" name="medId" value={medId} />
        <FormGrid>
          <Select label="Tipo" name="kind" options={DOCUMENT_KINDS} required />
          <Field label="Nome do arquivo" name="filename" required />
          <Field label="Content type" name="contentType" defaultValue="application/pdf" />
          <Field label="Tamanho (bytes)" name="byteSize" type="number" />
          <Field
            label="Chave no storage"
            name="storageKey"
            required
            hint="Caminho no bucket ou referencia do arquivo"
          />
          <Field label="Checksum SHA-256" name="checksumSha256" />
          <Select label="Origem" name="source" options={EVIDENCE_SOURCES} required defaultValue="MERCHANT" />
          <Field label="Referencia da origem" name="sourceReference" />
        </FormGrid>
        <p className="text-[11px] text-[var(--color-ink-muted)]">
          O upload binario para storage S3-compativel ainda nao esta implementado. Este formulario
          registra a referencia do documento; o arquivo em si permanece onde ja esta.
        </p>
        <SubmitButton>Registrar documento</SubmitButton>
      </form>
    </Panel>
  );
}

export function DocumentUploadForm({
  medId,
  storageAvailable,
}: {
  medId: string;
  storageAvailable: boolean;
}) {
  return (
    <Panel title="Enviar arquivo">
      {storageAvailable ? (
        <form action={uploadDocumentAction} className="space-y-3">
          <input type="hidden" name="medId" value={medId} />
          <FormGrid>
            <Select label="Tipo" name="kind" options={DOCUMENT_KINDS} required />
            <Select
              label="Origem"
              name="source"
              options={EVIDENCE_SOURCES}
              required
              defaultValue="MERCHANT"
            />
            <Field label="Referencia da origem" name="sourceReference" />
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                Arquivo <span className="text-red-600">*</span>
              </span>
              <input
                type="file"
                name="file"
                required
                className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-xs"
              />
            </label>
          </FormGrid>
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            O checksum SHA-256 do arquivo e calculado no envio e guardado junto ao documento.
          </p>
          <SubmitButton>Enviar arquivo</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">
          Storage de documentos nao configurado neste ambiente. Configure as variaveis{' '}
          <code>S3_*</code> para habilitar o upload, ou registre abaixo apenas a referencia do
          documento. Aceitar um upload que se perderia no proximo cold start destruiria evidencia,
          entao o envio fica desabilitado em vez de falhar em silencio.
        </p>
      )}
    </Panel>
  );
}
