/**
 * Importa o log de envio e registra a entrega em cada MED.
 *
 * Fecha o caminho que estava pela metade: o leitor lia, o casador casava, e
 * ninguem gravava nada. Agora o arquivo do provedor entra e cada caso sai com
 * destino, horario, message-id e — quando o log traz — o primeiro acesso.
 *
 * O que **nao** e gravado importa tanto quanto o que e:
 *
 *  - envio recusado nao vira registro de entrega. O caso fica sem entrega, que
 *    e a verdade, e o relatorio diz por que;
 *  - status intermediario (`deferred`, `queued`) tambem nao. Mensagem a
 *    caminho nao e mensagem entregue;
 *  - linha que nao casou com nenhum MED, ou casou com mais de um, fica de fora
 *    e aparece no relatorio para a pessoa resolver.
 */

import type { AuthContext } from '@/infra/auth/context';
import { getRepository } from '@/infra/container';
import { assertCan } from '@/infra/auth/rbac';
import {
  addCommunicationReconstruction,
  addEvidence,
  getCase,
  listMeds,
} from '@/services/medService';
import { draftCommunication, EMAIL_SENDER_NAME } from '@/domain/communication/receipt';
import { recordDigitalDelivery } from '@/services/fulfillmentService';
import { recordAudit } from '@/services/audit';
import { parseDeliveryLog, type DeliveryLogRow } from '@/domain/import/deliveryLog';
import { matchDeliveryLog, type MatchableMed } from '@/domain/import/deliveryMatch';

export type DeliveryOutcomeKind =
  | 'RECORDED'
  | 'ACCESS_LINKED'
  | 'NOT_DELIVERED'
  | 'UNMATCHED'
  | 'INVALID';

export interface DeliveryImportLine {
  line: number;
  medId: string | null;
  customerEmail: string | null;
  kind: DeliveryOutcomeKind;
  /** Por que esta linha terminou assim, na linguagem de quem opera. */
  message: string;
}

export interface DeliveryImportOptions {
  /**
   * Gera o comprovante de cada entrega registrada.
   *
   * Fica como escolha, e nao como efeito automatico da importacao: o log prova
   * que a mensagem foi aceita pelo servidor do destinatario, nao o que ela
   * dizia. Quem opera e que declara que aquelas entregas eram a liberacao de
   * acesso. O texto sai do caso, e a peca leva o selo de reconstrucao.
   */
  generateReceipts?: boolean;
}

export interface DeliveryImportReport {
  total: number;
  recorded: number;
  /** Comprovantes de comunicacao gerados a partir das entregas registradas. */
  receipts: number;
  /** Liberacoes de acesso ligadas ao comprador pelo e-mail. */
  accessLinked: number;
  notDelivered: number;
  unmatched: number;
  invalid: number;
  /** Quantos registros trouxeram primeiro acesso — a evidencia que decide. */
  withFirstAccess: number;
  lines: DeliveryImportLine[];
  /**
   * MEDs que este arquivo deixou sem entrega registrada.
   *
   * Entram os dois casos: o MED que nenhuma linha mencionou e o MED cuja
   * linha existia mas nao era entrega — recusa, status intermediario ou linha
   * invalida. Para a defesa da o mesmo: nao ha envio comprovado.
   */
  medsWithoutDelivery: { id: string; medId: string }[];
  fatalError: string | null;
}

/** Host do MTA, a partir do message-id. E o provedor que assinou o envio. */
function providerOf(messageId: string | null): string | undefined {
  const at = messageId?.lastIndexOf('@') ?? -1;
  if (at === -1 || !messageId) return undefined;
  const host = messageId.slice(at + 1).trim();
  return host.length > 0 ? host : undefined;
}

function normalizeEmail(value: string | null): string | null {
  const email = value?.trim().toLowerCase();
  return email && email.length > 0 ? email : null;
}

/**
 * Corpo do comprovante de liberacao de acesso.
 *
 * Nao passa por `draftCommunication` de proposito: aqui nao ha operador para
 * instruir, e o que o rascunho da tela deixa entre colchetes para alguem
 * preencher sairia impresso na peca. Cada campo vem da propria linha do log.
 */
function accessReceiptBody(name: string | null): string {
  const greeting = name ? `Olá, ${name.trim().split(/\s+/)[0]}` : 'Olá';
  return `${greeting}\n\nSegue o seu acesso. Já está liberado.`;
}

function describeNotDelivered(row: DeliveryLogRow): string {
  if (row.outcome === 'BOUNCED') {
    return `Envio recusado pelo servidor do destinatário${
      row.smtpResponse ? ` — ${row.smtpResponse}` : ''
    }. O caso fica sem entrega registrada.`;
  }
  return `Status "${row.rawStatus ?? 'desconhecido'}" não é entrega concluída. Nada foi registrado.`;
}

export async function importDeliveryLog(
  auth: AuthContext,
  text: string,
  options: DeliveryImportOptions = {},
): Promise<DeliveryImportReport> {
  assertCan(auth.role, 'med:write');

  const parsed = parseDeliveryLog(text);
  const empty: DeliveryImportReport = {
    total: 0,
    recorded: 0,
    receipts: 0,
    accessLinked: 0,
    notDelivered: 0,
    unmatched: 0,
    invalid: 0,
    withFirstAccess: 0,
    lines: [],
    medsWithoutDelivery: [],
    fatalError: parsed.fatalError,
  };
  if (parsed.fatalError) return empty;

  const rows = await listMeds(auth, { limit: 1000 });
  const candidates: MatchableMed[] = rows.map((entry) => ({
    id: entry.med.id,
    medId: entry.med.medId,
    amount: entry.med.amount,
    transactionAt: entry.med.transactionAt ?? null,
    payerName: entry.med.payer.name ?? null,
  }));

  const report = matchDeliveryLog(parsed.rows, candidates);
  const lines: DeliveryImportLine[] = [];
  // Comeca com os MEDs que nenhuma linha mencionou; os que casaram mas nao
  // viraram entrega sao acrescentados abaixo, um por um.
  const withoutDelivery = new Map<string, { id: string; medId: string }>(
    report.medsWithoutDelivery.map((med) => [med.id, { id: med.id, medId: med.medId }]),
  );
  // E-mail do comprador -> MEDs dele, montado com as linhas que casaram. E a
  // ponte para as linhas de liberacao de acesso, que nao trazem valor nem
  // horario da cobranca e por isso nunca casariam sozinhas.
  const medsByBuyer = new Map<string, MatchableMed[]>();
  let recorded = 0;
  let receipts = 0;
  let accessLinked = 0;
  let notDelivered = 0;
  let invalid = 0;
  let withFirstAccess = 0;

  for (const { med, row } of report.matched) {
    if (row.errors.length > 0) {
      invalid += 1;
      withoutDelivery.set(med.id, { id: med.id, medId: med.medId });
      lines.push({
        line: row.line,
        medId: med.medId,
        customerEmail: row.customerEmail,
        kind: 'INVALID',
        message: row.errors.join(' '),
      });
      continue;
    }

    if (row.outcome !== 'DELIVERED') {
      notDelivered += 1;
      // Recusa nao e entrega: o caso continua sem prova de envio, e a tela
      // tem de dizer isso — e o MED em que a defesa nao pode afirmar nada.
      withoutDelivery.set(med.id, { id: med.id, medId: med.medId });
      lines.push({
        line: row.line,
        medId: med.medId,
        customerEmail: row.customerEmail,
        kind: 'NOT_DELIVERED',
        message: describeNotDelivered(row),
      });
      continue;
    }

    // Quando o log nao traz coluna de envio, o instante da entrega e o que o
    // MTA anotou ao entregar a mensagem ao servidor do destinatario — e um
    // horario real do arquivo, nao uma estimativa. Linha entregue sem nenhum
    // dos dois ja foi barrada como invalida pelo leitor.
    const momentOfSending = row.sentAt ?? row.deliveredAt;

    await recordDigitalDelivery(auth, med.id, {
      channel: 'EMAIL',
      sentTo: row.customerEmail ?? undefined,
      sentAt: momentOfSending ?? undefined,
      platform: row.productUrl ?? undefined,
      firstAccessAt: row.firstAccessAt ?? undefined,
      // Vem do log do provedor, nao do operador: a origem tem de dizer isso.
      source: 'EMAIL',
      sourceProvider: providerOf(row.messageId),
      sourceReference: row.messageId ?? undefined,
    });

    // A resposta do servidor de destino é o que torna o envio conferível: é
    // nela que está o "250" e o identificador que o provedor devolveu ao
    // aceitar a mensagem. Fica como evidência própria, com o message-id na
    // procedência, porque o registro de entrega não tem onde guardá-la.
    if (row.smtpResponse) {
      await addEvidence(auth, med.id, {
        type: 'DELIVERY_CONFIRMATION',
        value: {
          status: row.rawStatus ?? 'delivered',
          resposta: row.smtpResponse,
          entregueEm: row.deliveredAt,
          tentativas: row.attempts,
        },
        displayValue: row.smtpResponse,
        source: 'EMAIL',
        sourceProvider: providerOf(row.messageId),
        sourceReference: row.messageId ?? undefined,
        receivedAt: row.deliveredAt ?? momentOfSending ?? undefined,
        verificationStatus: 'UNVERIFIED',
        metadata: {},
      });
    }

    recorded += 1;
    if (row.firstAccessAt) withFirstAccess += 1;
    const buyer = normalizeEmail(row.customerEmail);
    if (buyer) {
      const list = medsByBuyer.get(buyer) ?? [];
      list.push(med);
      medsByBuyer.set(buyer, list);
    }

    if (options.generateReceipts) {
      // Recarrega o caso: o rascunho le a entrega que acabou de ser gravada, e
      // e dela que saem destinatario, data e link. Sem recarregar, o
      // comprovante sairia com o caso de antes da importacao.
      const medCase = await getCase(auth, med.id);
      const draft = draftCommunication(medCase, 'ACCESS_DELIVERY');
      await addCommunicationReconstruction(auth, med.id, {
        template: draft.template,
        from: draft.from,
        to: draft.to,
        toName: draft.toName ?? undefined,
        subject: draft.subject,
        sentAt: draft.sentAt ?? undefined,
        body: draft.body,
        reference: draft.reference ?? undefined,
        source: 'EMAIL',
        sourceReference: row.messageId ?? undefined,
      });
      receipts += 1;
    }

    lines.push({
      line: row.line,
      medId: med.medId,
      customerEmail: row.customerEmail,
      kind: 'RECORDED',
      message: row.firstAccessAt
        ? 'Entrega registrada, com primeiro acesso do comprador.'
        : 'Entrega registrada. O log não traz primeiro acesso: só prova que a mensagem chegou.',
    });
  }

  for (const { row, reason } of report.unmatchedRows) {
    // Linha de liberacao de acesso: nao traz valor nem horario da cobranca,
    // entao nao casa por transacao — casa pelo comprador. O comprovante que
    // ela gera fica inteiro dentro da propria linha: data, message-id e link
    // sao os dela, e nao se misturam com os do e-mail de cobranca.
    const buyer = normalizeEmail(row.customerEmail);
    const meds = buyer ? medsByBuyer.get(buyer) : undefined;
    const sentAt = row.deliveredAt ?? row.sentAt;
    if (options.generateReceipts && meds && row.productUrl && row.outcome === 'DELIVERED' && sentAt) {
      for (const med of meds) {
        await addCommunicationReconstruction(auth, med.id, {
          template: 'ACCESS_DELIVERY',
          from: EMAIL_SENDER_NAME,
          to: row.customerEmail ?? '',
          toName: row.customerName ?? med.payerName ?? undefined,
          // Assunto genérico de propósito: o nome do produto na peça diz à
          // instituição o que a pessoa comprou, e isso não é assunto dela.
          subject: 'Seu acesso está liberado',
          sentAt,
          body: accessReceiptBody(row.customerName ?? med.payerName),
          reference: row.productUrl,
          source: 'EMAIL',
          sourceReference: row.messageId ?? undefined,
        });

        // O primeiro acesso é o que responde "não recebi": mostra que a pessoa
        // usou o que comprou. Entra como evidência própria, com o message-id
        // da linha de onde veio — não no registro de entrega da cobrança, que
        // é outro evento e não pode absorver a data deste.
        if (row.firstAccessAt) {
          await addEvidence(auth, med.id, {
            type: 'FIRST_ACCESS_AT',
            value: row.firstAccessAt,
            displayValue: row.firstAccessAt,
            source: 'EMAIL',
            sourceProvider: providerOf(row.messageId),
            sourceReference: row.messageId ?? undefined,
            receivedAt: row.firstAccessAt,
            verificationStatus: 'UNVERIFIED',
            metadata: {},
          });
        }
      }
      accessLinked += 1;
      lines.push({
        line: row.line,
        medId: meds.map((med) => med.medId).join(', '),
        customerEmail: row.customerEmail,
        kind: 'ACCESS_LINKED',
        message:
          `Liberação de acesso${row.productName ? ` a ${row.productName}` : ''} ligada pelo e-mail do comprador` +
          `${meds.length > 1 ? ` (${meds.length} MEDs dele)` : ''}` +
          `${row.firstAccessAt ? ', com primeiro acesso registrado' : ''}. ` +
          'A data e o message-id do comprovante são os desta linha, não os do e-mail da cobrança.',
      });
      if (row.firstAccessAt) withFirstAccess += 1;
      continue;
    }

    lines.push({
      line: row.line,
      medId: null,
      customerEmail: row.customerEmail,
      kind: 'UNMATCHED',
      message: reason,
    });
  }

  const repository = await getRepository();
  await recordAudit(repository, auth, {
    action: 'EVIDENCE_ADDED',
    entityType: 'Med',
    entityId: 'lote',
    source: 'EMAIL',
    newValue: {
      registrados: recorded,
      naoEntregues: notDelivered,
      semCasamento: report.unmatchedRows.length,
      comPrimeiroAcesso: withFirstAccess,
      comprovantesGerados: receipts,
      acessosLigados: accessLinked,
    },
  });

  return {
    total: parsed.rows.length,
    recorded,
    receipts,
    accessLinked,
    notDelivered,
    unmatched: report.unmatchedRows.length - accessLinked,
    invalid,
    withFirstAccess,
    lines: lines.sort((a, b) => a.line - b.line),
    medsWithoutDelivery: [...withoutDelivery.values()],
    fatalError: null,
  };
}
