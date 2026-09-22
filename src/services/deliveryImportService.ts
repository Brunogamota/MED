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
import { listMeds } from '@/services/medService';
import { recordDigitalDelivery } from '@/services/fulfillmentService';
import { recordAudit } from '@/services/audit';
import { parseDeliveryLog, type DeliveryLogRow } from '@/domain/import/deliveryLog';
import { matchDeliveryLog, type MatchableMed } from '@/domain/import/deliveryMatch';

export type DeliveryOutcomeKind = 'RECORDED' | 'NOT_DELIVERED' | 'UNMATCHED' | 'INVALID';

export interface DeliveryImportLine {
  line: number;
  medId: string | null;
  customerEmail: string | null;
  kind: DeliveryOutcomeKind;
  /** Por que esta linha terminou assim, na linguagem de quem opera. */
  message: string;
}

export interface DeliveryImportReport {
  total: number;
  recorded: number;
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
): Promise<DeliveryImportReport> {
  assertCan(auth.role, 'med:write');

  const parsed = parseDeliveryLog(text);
  const empty: DeliveryImportReport = {
    total: 0,
    recorded: 0,
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
  let recorded = 0;
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

    recorded += 1;
    if (row.firstAccessAt) withFirstAccess += 1;
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
    },
  });

  return {
    total: parsed.rows.length,
    recorded,
    notDelivered,
    unmatched: report.unmatchedRows.length,
    invalid,
    withFirstAccess,
    lines: lines.sort((a, b) => a.line - b.line),
    medsWithoutDelivery: [...withoutDelivery.values()],
    fatalError: null,
  };
}
