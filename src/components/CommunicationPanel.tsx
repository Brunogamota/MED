import Link from 'next/link';
import type { Evidence } from '@/domain/types';
import type { MedCase } from '@/domain/case';
import {
  COMMUNICATION_TEMPLATES,
  COMMUNICATION_TEMPLATE_LABEL,
  COMMUNICATION_SOURCES,
  REFERENCE_FIELD,
  draftCommunication,
  parseCommunicationReceipt,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';
import { EVIDENCE_SOURCE_LABEL } from '@/lib/labels';
import { Panel, EmptyState } from '@/components/ui';
import { DateTimeField, Field, Select, SubmitButton } from '@/components/form';
import { ClientEmailView } from '@/components/ClientEmailView';
import { PaymentReceiptCard } from '@/components/PaymentReceiptCard';
import { addCommunicationAction } from '@/app/(console)/meds/actions';

/**
 * Painel "Comprovantes": o operador reconstrói a comunicação enviada ao cliente
 * e vê, na hora, como ela aparece no painel de envios do gateway — pronta para
 * imprimir ou anexar como print.
 *
 * O modelo escolhido pré-preenche destinatário e data a partir dos dados que o
 * caso já tem; nada é inventado. O remetente é sempre o gateway que envia de
 * fato. Toda peça sai com selo de reconstrução e origem gravada — é a
 * representação honesta do que foi enviado, nunca uma captura do painel
 * administrativo real.
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
  const referenceField = REFERENCE_FIELD[template];
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
            className="text-sm font-medium text-foreground hover:underline"
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
        footer="A peça é a representação do painel de envios do gateway, gerada a partir dos registros do caso. Sai com selo de reconstrução e origem — não é captura do painel administrativo real."
      >
        {/* Escolha do modelo: recarrega o formulário com o rascunho do caso */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {COMMUNICATION_TEMPLATES.map((option) => (
            <Link
              key={option}
              href={`/meds/${medId}?tab=evidencias&modelo=${option}`}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors duration-[120ms] ${
                option === template
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent'
              }`}
            >
              {COMMUNICATION_TEMPLATE_LABEL[option]}
            </Link>
          ))}
        </div>

        {/*
          `key` no formulário: trocar de modelo precisa recarregar os campos.
          Sem ele o React reaproveita os inputs e o `defaultValue` novo é
          ignorado — o operador trocava o modelo e via o texto anterior (ou um
          campo vazio), sem entender por quê.
        */}
        <form key={template} action={addCommunicationAction} className="space-y-4">
          <input type="hidden" name="medId" value={medId} />
          <input type="hidden" name="template" value={template} />

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
            <Field
              label="Nome do cliente"
              name="toName"
              defaultValue={draft.toName ?? undefined}
            />
            <Field
              label="E-mail do cliente"
              name="to"
              required
              defaultValue={draft.to}
            />
            <Field label="Assunto" name="subject" required defaultValue={draft.subject} />
            <DateTimeField label="Enviado em" name="sentAt" defaultValue={draft.sentAt} />
          </div>

          <div>
            <label
              htmlFor="comm-body"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Mensagem enviada <span className="text-destructive">*</span>
            </label>
            <textarea
              id="comm-body"
              name="body"
              required
              rows={6}
              defaultValue={draft.body}
              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm leading-relaxed"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Escreva o que foi realmente enviado. Não invente conteúdo que o cliente não recebeu.
            </p>
          </div>

          <Field
            label={referenceField.label}
            name="reference"
            defaultValue={draft.reference ?? undefined}
            placeholder={referenceField.placeholder}
            hint={referenceField.hint}
            className="md:max-w-[420px]"
          />

          {/* Procedência: importa para a defesa, mas não para quem só preenche. */}
          <details className="rounded-md border px-3 py-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Opções avançadas
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
              <Select
                label="Origem do registro"
                name="source"
                options={COMMUNICATION_SOURCES}
                labels={EVIDENCE_SOURCE_LABEL}
                required
                defaultValue="MERCHANT"
              />
              <Field
                label="ID da mensagem"
                name="sourceReference"
                hint="Identificador no provedor de e-mail, se você tiver"
              />
            </div>
          </details>

          <SubmitButton>Gerar comprovante</SubmitButton>
        </form>
      </Panel>

      <Panel title={`Comprovantes gerados (${reconstructions.length})`}>
        {reconstructions.length === 0 ? (
          <EmptyState title="Nenhum comprovante gerado">
            Escolha um modelo acima, confira o conteúdo e gere o painel de envios para anexar à
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
                    <span className="text-sm font-medium">
                      {COMMUNICATION_TEMPLATE_LABEL[receipt.template]} · {receipt.to}
                    </span>
                    <a
                      href={`/meds/${medId}/comprovante/${evidence.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      Abrir para imprimir / anexar
                    </a>
                  </div>
                  <ClientEmailView receipt={receipt} sourceReference={evidence.sourceReference} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
