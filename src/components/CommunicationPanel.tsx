import Link from 'next/link';
import type { Evidence } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import {
  COMMUNICATION_TEMPLATES,
  COMMUNICATION_TEMPLATE_LABEL,
  COMMUNICATION_SOURCES,
  draftCommunication,
  parseCommunicationReceipt,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';
import { EVIDENCE_SOURCE_LABEL } from '@/lib/labels';
import { Panel, EmptyState } from '@/components/ui';
import { DateTimeField, Field, Select, SubmitButton } from '@/components/form';
import { ClientEmailView } from '@/components/ClientEmailView';
import { PaymentReceiptCard } from '@/components/PaymentReceiptCard';
import { addCommunicationAction } from '@/app/meds/actions';

/**
 * Painel "Comprovantes": o operador reconstrói a comunicação enviada ao cliente
 * e vê, na hora, como ela aparece na visão do destinatário — pronta para
 * imprimir ou anexar como print.
 *
 * O modelo escolhido pré-preenche remetente, destinatário e data a partir dos
 * dados que o caso já tem; nada é inventado. Toda peça sai com selo de
 * reconstrução e origem gravada — é a representação honesta do que foi enviado,
 * nunca uma captura da caixa de entrada do cliente.
 */


export function CommunicationPanel({
  medCase,
  template,
  reconstructions,
}: {
  medCase: MedCase;
  template: CommunicationTemplate;
  reconstructions: Evidence[];
}) {
  const draft = draftCommunication(medCase, template);
  const medId = medCase.med.id;

  return (
    <div className="space-y-4">
      <Panel
        title="Comprovante de pagamento"
        footer="Reprodução do comprovante Pix na visão do cliente, montada a partir dos dados da transação registrados no caso. Sai com selo de reconstrução — não é captura do aplicativo ou banco do pagador."
      >
        <div className="mb-3 flex justify-end">
          <a
            href={`/meds/${medId}/comprovante/pagamento`}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium text-[var(--color-text)] hover:underline"
          >
            Abrir para imprimir / anexar
          </a>
        </div>
        <div className="mx-auto max-w-[420px]">
          <PaymentReceiptCard medCase={medCase} />
        </div>
      </Panel>

      <Panel
        title="Reconstruir comprovante de comunicação"
        footer="A peça é a representação do que o estabelecimento enviou ao cliente, gerada a partir dos registros do caso. Sai com selo de reconstrução e origem — não é captura da caixa de entrada do destinatário."
      >
        {/* Escolha do modelo: recarrega o formulário com o rascunho do caso */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {COMMUNICATION_TEMPLATES.map((option) => (
            <Link
              key={option}
              href={`/meds/${medId}?tab=evidencias&modelo=${option}`}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium transition-colors duration-[120ms] ${
                option === template
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border-strong)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {COMMUNICATION_TEMPLATE_LABEL[option]}
            </Link>
          ))}
        </div>

        <form action={addCommunicationAction} className="space-y-4">
          <input type="hidden" name="medId" value={medId} />
          <input type="hidden" name="template" value={template} />
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
            <Field label="Remetente" name="from" required defaultValue={draft.from} />
            <Field
              label="Destinatário"
              name="to"
              required
              defaultValue={draft.to}
              hint="E-mail ou contato que recebeu a mensagem"
            />
            <Field label="Assunto" name="subject" required defaultValue={draft.subject} />
            <DateTimeField label="Enviado em" name="sentAt" defaultValue={draft.sentAt} />
          </div>
          <div>
            <label
              htmlFor="comm-body"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Conteúdo enviado <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              id="comm-body"
              name="body"
              required
              rows={7}
              defaultValue={draft.body}
              className="w-full rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 py-2 text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Transcreva o que foi realmente enviado ao cliente. Não preencha com conteúdo que não
              foi enviado.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
            <Field
              label="Referência do conteúdo"
              name="reference"
              defaultValue={draft.reference ?? undefined}
              hint="Link de acesso, código, rastreio"
            />
            <Select
              label="Origem"
              name="source"
              options={COMMUNICATION_SOURCES}
              labels={EVIDENCE_SOURCE_LABEL}
              required
              defaultValue="MERCHANT"
            />
            <Field label="Referência da origem" name="sourceReference" hint="ID da mensagem no provedor" />
          </div>
          <SubmitButton>Gerar comprovante</SubmitButton>
        </form>
      </Panel>

      <Panel title={`Comprovantes gerados (${reconstructions.length})`}>
        {reconstructions.length === 0 ? (
          <EmptyState title="Nenhum comprovante gerado">
            Escolha um modelo acima, confira o conteúdo e gere a visão do cliente para anexar à
            defesa.
          </EmptyState>
        ) : (
          <ul className="space-y-6">
            {reconstructions.map((evidence) => {
              const receipt = parseCommunicationReceipt(evidence.value);
              if (!receipt) return null;
              return (
                <li key={evidence.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">
                      {COMMUNICATION_TEMPLATE_LABEL[receipt.template]} · {receipt.to}
                    </span>
                    <a
                      href={`/meds/${medId}/comprovante/${evidence.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium text-[var(--color-text)] hover:underline"
                    >
                      Abrir para imprimir / anexar
                    </a>
                  </div>
                  <ClientEmailView receipt={receipt} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
