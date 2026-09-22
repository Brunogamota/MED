import type { MedCase } from '@/domain/case';
import { resolveEndToEndId } from '@/domain/identifiers';
import { parseCommunicationReceipt } from '@/domain/communication/receipt';
import { formatDateTimeSmart } from '@/lib/format';

/**
 * Registro de envio: a folha de dados do que o provedor anotou.
 *
 * É o outro caminho para a mesma prova. O comprovante reconstrói a mensagem
 * que o comprador viu, e por isso precisa dizer que é reconstrução. Esta folha
 * não representa tela nenhuma — é o registro em si, com os campos que a
 * instituição consegue conferir na origem: o message-id, a resposta do
 * servidor de destino e o end-to-end da transação.
 *
 * Por isso a diferença de regime: aqui não há selo, porque não há nada a
 * declarar. O documento é o que diz ser.
 *
 * O endereço de acesso sai só como domínio. A peça circula fora da operação —
 * vai para a instituição, entra em análise de PLD — e o caminho completo de
 * uma área de membros não é assunto de quem analisa a transação.
 */

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-b border-[#e5e5e5] bg-[#fafafa] px-6 py-2 text-[11px] font-medium uppercase tracking-wide text-[#71717a]">
      {children}
    </p>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#eeeef0] px-6 py-3 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[12px] text-[#71717a] sm:w-56">{label}</dt>
      <dd
        className={`min-w-0 break-words text-[13px] text-[#18181b] ${mono ? 'font-mono text-[12px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function DeliveryRecordSheet({ medCase }: { medCase: MedCase }) {
  const { med, digitalDelivery } = medCase;

  // A confirmação do provedor é evidência própria: é dela que sai a resposta
  // do servidor de destino. Sem ela a folha ainda vale — só não traz o 250.
  const confirmation = medCase.evidences
    .filter((evidence) => evidence.type === 'DELIVERY_CONFIRMATION')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const smtp = confirmation?.displayValue ?? null;

  // A liberação de acesso é outro evento, com data e message-id próprios —
  // costuma ser semanas antes da cobrança contestada. Fica em bloco separado
  // justamente por isso: juntar os dois num só faria a folha apresentar duas
  // datas como se fossem a mesma coisa.
  const accessEvidence = medCase.evidences
    .filter((evidence) => evidence.type === 'DELIVERY_COMMUNICATION')
    .map((evidence) => ({ evidence, receipt: parseCommunicationReceipt(evidence.value) }))
    .filter((entry) => entry.receipt?.template === 'ACCESS_DELIVERY' && entry.receipt.reference)
    .sort((a, b) => b.evidence.createdAt.localeCompare(a.evidence.createdAt))[0];

  const firstAccess = medCase.evidences
    .filter((evidence) => evidence.type === 'FIRST_ACCESS_AT')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const amount = med.amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: med.currency,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d4d4d8] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#fafafa] px-6 py-4">
        <h1 className="text-[15px] font-semibold text-[#18181b]">Registro de envio</h1>
        <p className="mt-0.5 font-mono text-[11px] text-[#71717a]">{med.medId}</p>
      </div>

      <SectionTitle>Transação contestada</SectionTitle>
      <dl>
        <Row label="End-to-end" value={resolveEndToEndId(medCase) ?? 'não informado'} mono />
        <Row label="Valor" value={amount} />
        <Row
          label="Data"
          value={formatDateTimeSmart(med.transactionAt ?? null) ?? 'não informada'}
        />
        <Row label="Pagador" value={med.payer.name ?? 'não informado'} />
      </dl>

      <SectionTitle>Envio ao comprador</SectionTitle>
      <dl>
        <Row label="Canal" value={digitalDelivery ? 'E-mail' : 'sem registro'} />
        <Row label="Destinatário" value={digitalDelivery?.sentTo ?? 'não informado'} />
        <Row
          label="Enviado em"
          value={formatDateTimeSmart(digitalDelivery?.sentAt ?? null) ?? 'não informado'}
        />
        <Row
          label="ID da mensagem"
          value={digitalDelivery?.sourceReference ?? 'não informado'}
          mono
        />
        <Row
          label="Servidor de origem"
          value={digitalDelivery?.sourceProvider ?? 'não informado'}
          mono
        />
        <Row label="Resposta do servidor de destino" value={smtp ?? 'não informada'} mono />
      </dl>

      {accessEvidence || firstAccess ? (
        <>
          <SectionTitle>Liberação de acesso</SectionTitle>
          <dl>
            <Row
              label="Liberado em"
              value={formatDateTimeSmart(accessEvidence?.receipt?.sentAt ?? null) ?? 'não informado'}
            />
            <Row
              label="ID da mensagem"
              value={accessEvidence?.evidence.sourceReference ?? 'não informado'}
              mono
            />
            <Row
              label="Área de acesso"
              value={hostOf(accessEvidence?.receipt?.reference) ?? 'não informada'}
              mono
            />
            <Row
              label="Primeiro acesso do comprador"
              value={
                formatDateTimeSmart(
                  firstAccess?.displayValue ?? digitalDelivery?.firstAccessAt ?? null,
                ) ?? 'não registrado'
              }
            />
          </dl>
        </>
      ) : null}
    </div>
  );
}
