import {
  DOCUMENT_KINDS,
  EVIDENCE_SOURCES,
  EVIDENCE_TYPES,
  PRODUCT_TYPES,
  SHIPMENT_STATUSES,
  VERIFICATION_STATUSES,
} from '@/domain/types';
import type { MedCase } from '@/domain/case';
import { listEvidenceDefinitions } from '@/domain/evidence/catalog';
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
import {
  DOCUMENT_KIND_LABEL,
  EVIDENCE_SOURCE_LABEL,
  PRODUCT_TYPE_LABEL,
  SHIPMENT_STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
} from '@/lib/labels';

/**
 * Entrada manual de dados. Os formulários registram o que o operador já tem;
 * nunca pré-preenchem um valor que o sistema não recebeu. Campo em branco
 * chega ao domínio como ausente e vira pendência de evidência.
 */

const EVIDENCE_TYPE_LABEL = Object.fromEntries(
  listEvidenceDefinitions().map((definition) => [definition.type, definition.label]),
);

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
    <Panel title="Transação">
      <form action={upsertTransactionAction} className="space-y-4">
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
          <Field label="Método" name="method" defaultValue={transaction?.method ?? undefined} />
          <Field label="Situação" name="status" defaultValue={transaction?.status ?? undefined} />
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
            label="Referência do provedor"
            name="providerReference"
            defaultValue={transaction?.providerReference ?? undefined}
          />
          <Field
            label="ID externo"
            name="externalId"
            defaultValue={transaction?.externalId ?? undefined}
          />
          <Field
            label="End-to-end"
            name="endToEndId"
            defaultValue={transaction?.endToEndId ?? medCase.med.endToEndId ?? undefined}
          />
        </FormGrid>
        <SubmitButton>Salvar transação</SubmitButton>
      </form>
    </Panel>
  );
}

export function CustomerForm({ medCase }: { medCase: MedCase }) {
  const customer = medCase.customer;
  const address = customer?.address;
  return (
    <Panel title="Cliente">
      <form action={upsertCustomerAction} className="space-y-4">
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
          <Field label="Número" name="addressNumber" defaultValue={address?.number ?? undefined} />
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
      <form action={upsertOrderAction} className="space-y-4">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Select
            label="Tipo de produto"
            name="productType"
            options={PRODUCT_TYPES}
            labels={PRODUCT_TYPE_LABEL}
            required
            defaultValue={order?.productType ?? medCase.med.productType ?? 'PHYSICAL'}
          />
          <Field label="Número do pedido" name="externalId" defaultValue={order?.externalId ?? undefined} />
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
            defaultValue={
              order?.totalAmount === null || order?.totalAmount === undefined
                ? undefined
                : String(order.totalAmount)
            }
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
            label="Referência na plataforma"
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
            label="Valor unitário"
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
          <Field label="Entrega: número" name="shippingNumber" defaultValue={shipping?.number ?? undefined} />
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
    <Panel
      title="Rastreio"
      footer={`Eventos de rastreamento não são digitados aqui: chegam pela integração com a transportadora ou pela API, preservando a origem de cada evento.${tracking ? ` Eventos registrados: ${tracking.events.length}.` : ''}`}
    >
      <form action={upsertTrackingAction} className="space-y-4">
        <input type="hidden" name="medId" value={medCase.med.id} />
        <FormGrid>
          <Field
            label="Código de rastreio"
            name="trackingCode"
            defaultValue={tracking?.trackingCode ?? undefined}
          />
          <Field label="Transportadora" name="carrier" defaultValue={tracking?.carrier ?? undefined} />
          <Select
            label="Situação"
            name="status"
            options={SHIPMENT_STATUSES}
            labels={SHIPMENT_STATUS_LABEL}
            required
            defaultValue={tracking?.status ?? 'CREATED'}
          />
          <Select
            label="Origem do dado"
            name="source"
            options={EVIDENCE_SOURCES}
            labels={EVIDENCE_SOURCE_LABEL}
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
            label="Referência da origem"
            name="sourceReference"
            defaultValue={tracking?.sourceReference ?? undefined}
          />
        </FormGrid>
        <SubmitButton>Salvar rastreio</SubmitButton>
      </form>
    </Panel>
  );
}

export function EvidenceForm({ medId }: { medId: string }) {
  return (
    <Panel title="Registrar evidência">
      <form action={addEvidenceAction} className="space-y-4">
        <input type="hidden" name="medId" value={medId} />
        <FormGrid>
          <Select
            label="Tipo"
            name="type"
            options={EVIDENCE_TYPES}
            labels={EVIDENCE_TYPE_LABEL}
            required
          />
          <Field label="Valor" name="value" required />
          <Select
            label="Origem"
            name="source"
            options={EVIDENCE_SOURCES}
            labels={EVIDENCE_SOURCE_LABEL}
            required
            defaultValue="MANUAL"
          />
          <Field
            label="Referência da origem"
            name="sourceReference"
            hint="Permite reconferir na origem"
          />
          <Field label="Provedor" name="sourceProvider" />
          <Select
            label="Verificação"
            name="verificationStatus"
            options={VERIFICATION_STATUSES}
            labels={VERIFICATION_STATUS_LABEL}
            required
            defaultValue="UNVERIFIED"
          />
          <Field label="Recebido em" name="receivedAt" type="datetime-local" />
          <Field label="Texto exibido" name="displayValue" />
        </FormGrid>
        <SubmitButton>Adicionar evidência</SubmitButton>
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
    <Panel
      title="Enviar arquivo"
      footer={
        storageAvailable
          ? 'O checksum SHA-256 do arquivo é calculado no envio e guardado junto ao documento.'
          : undefined
      }
    >
      {storageAvailable ? (
        <form action={uploadDocumentAction} className="space-y-4">
          <input type="hidden" name="medId" value={medId} />
          <FormGrid>
            <Select
              label="Tipo"
              name="kind"
              options={DOCUMENT_KINDS}
              labels={DOCUMENT_KIND_LABEL}
              required
            />
            <Select
              label="Origem"
              name="source"
              options={EVIDENCE_SOURCES}
              labels={EVIDENCE_SOURCE_LABEL}
              required
              defaultValue="MERCHANT"
            />
            <Field label="Referência da origem" name="sourceReference" />
            <div>
              <label
                htmlFor="upload-file"
                className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Arquivo <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                id="upload-file"
                type="file"
                name="file"
                required
                className="block w-full text-xs text-[var(--color-text-secondary)] file:mr-2 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-[var(--color-border-strong)] file:bg-white file:px-3 file:text-[13px] file:font-medium file:text-[var(--color-text)]"
              />
            </div>
          </FormGrid>
          <SubmitButton>Enviar arquivo</SubmitButton>
        </form>
      ) : (
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          O armazenamento de documentos não está configurado neste ambiente. Registre abaixo apenas
          a referência do documento: aceitar um upload que se perderia destruiria evidência, então o
          envio fica desabilitado em vez de falhar em silêncio.
        </p>
      )}
    </Panel>
  );
}

export function DocumentForm({ medId }: { medId: string }) {
  return (
    <Panel
      title="Registrar referência de documento"
      footer="Para documento que já vive no seu sistema: aqui entra só a referência, o arquivo permanece onde está."
    >
      <form action={addDocumentAction} className="space-y-4">
        <input type="hidden" name="medId" value={medId} />
        <FormGrid>
          <Select
            label="Tipo"
            name="kind"
            options={DOCUMENT_KINDS}
            labels={DOCUMENT_KIND_LABEL}
            required
          />
          <Field label="Nome do arquivo" name="filename" required />
          <Field label="Formato" name="contentType" defaultValue="application/pdf" />
          <Field label="Tamanho (bytes)" name="byteSize" type="number" />
          <Field
            label="Chave no armazenamento"
            name="storageKey"
            required
            hint="Caminho no bucket ou referência do arquivo"
          />
          <Field label="Checksum SHA-256" name="checksumSha256" />
          <Select
            label="Origem"
            name="source"
            options={EVIDENCE_SOURCES}
            labels={EVIDENCE_SOURCE_LABEL}
            required
            defaultValue="MERCHANT"
          />
          <Field label="Referência da origem" name="sourceReference" />
        </FormGrid>
        <SubmitButton>Registrar documento</SubmitButton>
      </form>
    </Panel>
  );
}
