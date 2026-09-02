import Link from 'next/link';
import { MED_REASONS, PRODUCT_TYPES } from '@/domain/types';
import { Panel } from '@/components/ui';
import { DateTimeField, Field, FormGrid, MoneyField, Select, SubmitButton } from '@/components/form';
import { createMedAction } from '@/app/meds/actions';
import { MED_REASON_LABEL, PRODUCT_TYPE_LABEL } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default function NewMedPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-3">
          <Link
            href="/meds"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← MEDs
          </Link>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Novo MED</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Campos em branco permanecem ausentes: o que não for informado será apontado como
          evidência faltante, nunca preenchido por suposição.
        </p>
      </div>

      <form action={createMedAction} className="space-y-4">
        <Panel title="Dados do MED">
          <FormGrid>
            <Field label="Identificador do MED" name="institutionMedId" required placeholder="MED-2026-0001" />
            <Field label="Instituição solicitante" name="requestingInstitution" />
            <MoneyField label="Valor" name="amount" required />
            <Field label="Moeda" name="currency" defaultValue="BRL" />
            <DateTimeField label="Abertura do MED" name="openedAt" required />
            <DateTimeField label="Prazo de resposta" name="responseDeadlineAt" />
            <DateTimeField label="Data da transação" name="transactionAt" />
            <Select label="Motivo" name="reason" options={MED_REASONS} labels={MED_REASON_LABEL} required />
            <Field label="ID da transação" name="transactionId" />
            <Field label="End-to-end" name="endToEndId" />
            <Field label="ID Pix" name="pixId" />
            <Select
              label="Tipo de produto"
              name="productType"
              options={PRODUCT_TYPES}
              labels={PRODUCT_TYPE_LABEL}
              includeBlank
            />
            <Field label="Loja" name="merchantName" />
            <Field label="Descrição do motivo" name="reasonDescription" className="md:col-span-2" />
          </FormGrid>
        </Panel>

        <Panel title="Pagador informado no MED">
          <FormGrid>
            <Field label="Nome" name="payerName" />
            <Field label="CPF/CNPJ" name="payerDocument" />
            <Field label="E-mail" name="payerEmail" type="email" />
            <Field label="Telefone" name="payerPhone" />
            <Field label="IP" name="payerIp" />
            <Field label="Dispositivo" name="payerDevice" />
          </FormGrid>
          <div className="mt-4 border-t border-border pt-4">
            <FormGrid>
              <Field label="Logradouro" name="payerAddressStreet" />
              <Field label="Número" name="payerAddressNumber" />
              <Field label="Complemento" name="payerAddressComplement" />
              <Field label="Bairro" name="payerAddressDistrict" />
              <Field label="Cidade" name="payerAddressCity" />
              <Field label="UF" name="payerAddressState" />
              <Field label="CEP" name="payerAddressPostalCode" />
              <Field label="País" name="payerAddressCountry" />
            </FormGrid>
          </div>
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>Criar MED</SubmitButton>
        </div>
      </form>
    </div>
  );
}
