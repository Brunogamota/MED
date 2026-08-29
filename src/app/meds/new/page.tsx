import Link from 'next/link';
import { MED_REASONS, PRODUCT_TYPES } from '@/domain/types';
import { Panel } from '@/components/ui';
import { Field, FormGrid, Select, SubmitButton } from '@/components/form';
import { createMedAction } from '@/app/meds/actions';

export const dynamic = 'force-dynamic';

export default function NewMedPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/meds" className="text-xs text-[var(--color-ink-muted)] hover:underline">
          &larr; MEDs
        </Link>
        <h1 className="text-lg font-semibold">Novo MED</h1>
      </div>

      <form action={createMedAction} className="space-y-4">
        <Panel title="Dados do MED">
          <FormGrid>
            <Field label="MED ID" name="institutionMedId" required placeholder="MED-2026-0001" />
            <Field label="Instituicao solicitante" name="requestingInstitution" />
            <Field label="Valor" name="amount" type="number" required placeholder="349.90" />
            <Field label="Moeda" name="currency" defaultValue="BRL" />
            <Field label="Abertura do MED" name="openedAt" type="datetime-local" required />
            <Field label="Prazo de resposta" name="responseDeadlineAt" type="datetime-local" />
            <Field label="Data da transacao" name="transactionAt" type="datetime-local" />
            <Select label="Motivo" name="reason" options={MED_REASONS} required />
            <Field label="Transaction ID" name="transactionId" />
            <Field label="End-to-end ID" name="endToEndId" />
            <Field label="Pix ID" name="pixId" />
            <Select
              label="Tipo de produto"
              name="productType"
              options={PRODUCT_TYPES}
              includeBlank
            />
            <Field label="Merchant" name="merchantName" />
            <Field
              label="Descricao do motivo"
              name="reasonDescription"
              className="md:col-span-3"
            />
          </FormGrid>
        </Panel>

        <Panel title="Pagador informado no MED">
          <FormGrid>
            <Field label="Nome" name="payerName" />
            <Field label="CPF/CNPJ" name="payerDocument" />
            <Field label="E-mail" name="payerEmail" type="email" />
            <Field label="Telefone" name="payerPhone" />
            <Field label="IP" name="payerIp" />
            <Field label="Device" name="payerDevice" />
          </FormGrid>
          <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
            <FormGrid>
              <Field label="Logradouro" name="payerAddressStreet" />
              <Field label="Numero" name="payerAddressNumber" />
              <Field label="Complemento" name="payerAddressComplement" />
              <Field label="Bairro" name="payerAddressDistrict" />
              <Field label="Cidade" name="payerAddressCity" />
              <Field label="UF" name="payerAddressState" />
              <Field label="CEP" name="payerAddressPostalCode" />
              <Field label="Pais" name="payerAddressCountry" />
            </FormGrid>
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">
            Campos em branco permanecem ausentes. Nada e preenchido automaticamente: o que nao for
            informado sera apontado como evidencia faltante.
          </p>
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>Criar MED</SubmitButton>
        </div>
      </form>
    </div>
  );
}
