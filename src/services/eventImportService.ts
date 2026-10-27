import type { AuthContext } from '@/infra/auth/context';
import { assertCan } from '@/infra/auth/rbac';
import type { ShipmentStatus, TrackingEvent } from '@/domain/types';
import {
  groupByMed,
  isEventLog,
  isPedidosFile,
  parseEventLog,
  parsePedidos,
  statusForEvent,
  type EventoRow,
  type PedidoRow,
} from '@/domain/import/eventLog';
import { getCase, getCases, listMeds } from '@/services/medService';
import { ImportBatchWriter } from '@/services/importBatchWriter';
import {
  EMAIL_SENDER_NAME,
  draftCommunication,
  orderTrackingMessage,
} from '@/domain/communication/receipt';
import { senderNameFor } from '@/services/accountService';
import type { DeliveryImportLine, DeliveryImportReport } from '@/services/deliveryImportService';

/**
 * Importação das abas "Pedidos Arks" e "Eventos Arks".
 *
 * A conta é por MED, nunca por linha: a aba de eventos repete o mesmo MED em
 * uma linha por marco. O relatório traz uma linha por MED distinto, e o número
 * de linhas de evento vai à parte, para a tela mostrar os dois.
 *
 * Cada evento com data vira marco do acompanhamento do pedido, com o texto do
 * evento e a referência da linha de origem. Evento sem data fica de fora — o
 * marco sem data não é afirmação —, e o motivo aparece no relatório.
 */

export function splitArksFiles(texts: string[]): {
  eventos: string[];
  pedidos: string[];
  outros: string[];
} {
  const eventos: string[] = [];
  const pedidos: string[] = [];
  const outros: string[] = [];
  for (const text of texts) {
    // Pedidos antes: a aba de pedidos também tem etapa ("Status atual") e
    // data, mas é uma linha por MED — não é histórico.
    if (isPedidosFile(text)) pedidos.push(text);
    else if (isEventLog(text) && isOrderHistory(text)) eventos.push(text);
    else outros.push(text);
  }
  return { eventos, pedidos, outros };
}

/**
 * Histórico de pedido de verdade: o mesmo MED em mais de uma linha, ou linhas
 * que são etapas logísticas. A aba de "logs básicos" também tem MED, uma
 * coluna de situação ("Pagamento confirmado") e data — mas é uma linha por
 * MED com o pagamento, e lida como histórico virava "Nada novo para
 * registrar" em todas as linhas. Essa aba segue para o leitor de log de envio.
 */
function isOrderHistory(text: string): boolean {
  const rows = parseEventLog(text);
  if (rows.length === 0) return false;
  const vistos = new Set<string>();
  for (const row of rows) {
    const chave = row.medRef.trim().toLowerCase();
    if (vistos.has(chave)) return true;
    vistos.add(chave);
  }
  const logisticas = rows.filter((row) => {
    const status = statusForEvent(row.evento);
    return status !== null && status !== 'UNKNOWN';
  }).length;
  return logisticas / rows.length >= 0.6;
}

const ORDEM: ShipmentStatus[] = [
  'CREATED',
  'IN_PRODUCTION',
  'POSTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'NOT_DELIVERED',
  'RETURNED',
];

function chaveDoEvento(event: Pick<TrackingEvent, 'status' | 'occurredAt'>): string {
  return `${event.status}|${event.occurredAt}`;
}

function eventoDaLinha(row: EventoRow): TrackingEvent | null {
  const status = statusForEvent(row.evento);
  if (status === null || !row.occurredAt) return null;
  const description = row.observacao ? `${row.evento} — ${row.observacao}` : row.evento;
  return {
    occurredAt: row.occurredAt,
    status,
    description,
    location: null,
    source: 'MERCHANT',
    sourceReference: row.codigo ?? `planilha de eventos, linha ${row.line}`,
  };
}

function relatorioVazio(): DeliveryImportReport {
  return {
    total: 0,
    recorded: 0,
    receipts: 0,
    receiptsPhysical: 0,
    receiptsDigital: 0,
    receiptsUnknownKind: 0,
    accessLinked: 0,
    withoutMessageId: 0,
    duplicated: 0,
    touchedMedIds: [],
    returnedToQueue: 0,
    replacedReceipts: 0,
    anachronistic: 0,
    notDelivered: 0,
    unmatched: 0,
    invalid: 0,
    withFirstAccess: 0,
    medsConsidered: 0,
    medsWithPayerName: 0,
    lines: [],
    medsWithoutDelivery: [],
    fatalError: null,
    arks: { linhasDeEvento: 0, medsComEvento: 0, pedidos: 0 },
  };
}

export async function importArksFiles(
  auth: AuthContext,
  files: { eventos: string[]; pedidos: string[] },
  options: { generateReceipts?: boolean; replacePreviousReceipts?: boolean } = {},
): Promise<DeliveryImportReport> {
  assertCan(auth.role, 'med:write');
  const sender = (await senderNameFor(auth.organizationId)) ?? EMAIL_SENDER_NAME;
  const report = relatorioVazio();

  const eventos = files.eventos.flatMap(parseEventLog);
  const pedidos = files.pedidos.flatMap(parsePedidos);
  if (eventos.length === 0 && pedidos.length === 0) {
    report.fatalError = 'A planilha não trouxe nenhuma linha com ID MED.';
    return report;
  }

  const rows = await listMeds(auth, {});
  report.medsConsidered = rows.length;
  report.medsWithPayerName = rows.filter((entry) => entry.med.payer.name).length;
  const porMedId = new Map(rows.map((entry) => [entry.med.medId.trim().toLowerCase(), entry.med]));

  // Pedidos: um por MED. A última linha do mesmo ID vence.
  const pedidoPorMed = new Map<string, PedidoRow>();
  for (const pedido of pedidos) pedidoPorMed.set(pedido.medRef.trim().toLowerCase(), pedido);
  const eventosPorMed = groupByMed(eventos);
  const chavesEventos = new Map<string, EventoRow[]>();
  for (const [medRef, lista] of eventosPorMed) {
    const chave = medRef.toLowerCase();
    chavesEventos.set(chave, [...(chavesEventos.get(chave) ?? []), ...lista]);
  }

  report.arks = {
    linhasDeEvento: eventos.length,
    medsComEvento: chavesEventos.size,
    pedidos: pedidoPorMed.size,
  };

  // A etapa atual da aba de pedidos, com a data em que foi registrada, é
  // marco como os da linha do tempo: o mesmo sistema da loja, a mesma origem.
  // Sem data, fica de fora — etapa sem data não é afirmação.
  for (const [chave, pedido] of pedidoPorMed) {
    if (!pedido.statusAtual || !pedido.atualizadoEm) continue;
    const lista = chavesEventos.get(chave) ?? [];
    lista.push({
      line: pedido.line,
      medRef: pedido.medRef,
      pedido: pedido.pedido,
      evento: pedido.statusAtual,
      occurredAt: pedido.atualizadoEm,
      rawOccurredAt: pedido.atualizadoEm,
      canal: null,
      codigo: `planilha de pedidos, linha ${pedido.line}`,
      url: pedido.url,
      observacao: null,
      distribuidor: pedido.distribuidor,
      idExterno: pedido.idNoFornecedor,
      refFornecedor: null,
    });
    chavesEventos.set(chave, lista);
  }

  const todas = new Set([...pedidoPorMed.keys(), ...chavesEventos.keys()]);
  report.total = todas.size;
  const tocados = new Set<string>();

  // Os casos da planilha numa leitura só, em vez de um `getCase` por MED.
  const idsDaPlanilha = [...todas]
    .map((chave) => porMedId.get(chave)?.id)
    .filter((id): id is string => id !== undefined);
  const casosPorId = new Map((await getCases(auth, idsDaPlanilha)).map((c) => [c.med.id, c]));
  const comDefesa = new Set(rows.filter((row) => row.latestDefense !== null).map((row) => row.med.id));
  // Tudo é montado em memória e gravado de uma vez no fim (ImportBatchWriter).
  const writer = new ImportBatchWriter(auth);

  const fila = [...todas];
  const processar = async (chave: string): Promise<void> => {
    const linhasEvento = chavesEventos.get(chave) ?? [];
    const pedido = pedidoPorMed.get(chave);
    const medRef = pedido?.medRef ?? linhasEvento[0]?.medRef ?? chave;
    const primeiraLinha = pedido?.line ?? linhasEvento[0]?.line ?? 0;
    const med = porMedId.get(chave);

    if (!med) {
      report.unmatched += 1;
      report.lines.push({
        line: primeiraLinha,
        medId: medRef,
        customerEmail: null,
        kind: 'UNMATCHED',
        message: `Nenhum MED com o número ${medRef} no sistema${
          linhasEvento.length > 0 ? ` (${linhasEvento.length} eventos na planilha)` : ''
        }. Importe o MED primeiro.`,
      });
      return;
    }

    const partes: string[] = [];
    let gravou = false;
    let jaRegistrado = false;
    let medCase = casosPorId.get(med.id) ?? (await getCase(auth, med.id));
    let escreveu = false;

    // Dados do pedido: só quando o caso ainda não tem pedido — não sobrescreve
    // o que veio de fonte mais forte.
    const tipo = pedido?.natureza ?? medCase.order?.productType ?? medCase.med.productType ?? null;
    if (pedido && !medCase.order && tipo) {
      medCase = writer.order(medCase, {
        externalId: pedido.pedido ?? undefined,
        productType: tipo,
        items: [],
        provider: pedido.distribuidor ?? undefined,
        providerReference: pedido.idNoFornecedor ?? undefined,
      });
      gravou = true;
      escreveu = true;
      partes.push(`pedido ${pedido.pedido ?? ''}`.trim() + ' registrado');
    }

    if (linhasEvento.length > 0) {
      const novos: TrackingEvent[] = [];
      const semData: string[] = [];
      for (const row of linhasEvento) {
        const evento = eventoDaLinha(row);
        if (evento) novos.push(evento);
        else if (statusForEvent(row.evento) !== null) semData.push(row.evento);
      }

      const existentes = medCase.tracking?.events ?? [];
      const vistos = new Set(existentes.map(chaveDoEvento));
      const acrescentar = novos.filter((evento) => {
        const k = chaveDoEvento(evento);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });

      if (acrescentar.length > 0) {
        const todosEventos = [...existentes, ...acrescentar].sort((a, b) =>
          a.occurredAt.localeCompare(b.occurredAt),
        );
        const conhecidos = todosEventos.filter((evento) => evento.status !== 'UNKNOWN');
        const ultimo = conhecidos[conhecidos.length - 1];
        const status = ultimo?.status ?? medCase.tracking?.status ?? 'UNKNOWN';
        const primeiroDe = (alvos: ShipmentStatus[]) =>
          todosEventos.find((evento) => alvos.includes(evento.status))?.occurredAt;
        const postedAt =
          medCase.tracking?.postedAt ?? primeiroDe(ORDEM.slice(ORDEM.indexOf('POSTED')));
        const deliveredAt = medCase.tracking?.deliveredAt ?? primeiroDe(['DELIVERED']);
        const distribuidor =
          linhasEvento.find((row) => row.distribuidor)?.distribuidor ?? pedido?.distribuidor ?? null;

        medCase = writer.tracking(medCase, {
          carrier: medCase.tracking?.carrier ?? undefined,
          trackingCode: medCase.tracking?.trackingCode ?? undefined,
          status,
          postedAt: postedAt ?? undefined,
          deliveredAt: deliveredAt ?? undefined,
          receiverName: medCase.tracking?.receiverName ?? undefined,
          events: todosEventos.map((evento) => ({
            occurredAt: evento.occurredAt,
            status: evento.status,
            description: evento.description,
            location: evento.location ?? undefined,
            source: evento.source,
            sourceReference: evento.sourceReference ?? undefined,
          })),
          source: medCase.tracking?.source ?? 'MERCHANT',
          sourceProvider: medCase.tracking?.sourceProvider ?? distribuidor ?? undefined,
          sourceReference: medCase.tracking?.sourceReference ?? undefined,
        });
        gravou = true;
        escreveu = true;
        partes.push(
          `${acrescentar.length} ${acrescentar.length === 1 ? 'evento' : 'eventos'} no acompanhamento`,
        );
      } else if (novos.length > 0) {
        jaRegistrado = true;
        partes.push('eventos já estavam no acompanhamento');
      }
      if (semData.length > 0) {
        partes.push(`${semData.length} sem data ficaram de fora (${semData.join(', ')})`);
      }
    }

    // Comprovante do acompanhamento do pedido, montado com os marcos que a
    // planilha trouxe. Um por pedido: reimportar não duplica a peça.
    if (options.generateReceipts !== false && linhasEvento.length > 0) {
      const atualizado = medCase;
      if ((atualizado.tracking?.events.length ?? 0) > 0) {
        const referencia = pedido?.pedido ?? linhasEvento.find((row) => row.pedido)?.pedido ?? med.medId;
        const jaTem = atualizado.evidences.some(
          (evidence) =>
            evidence.type === 'DELIVERY_COMMUNICATION' && evidence.sourceReference === referencia,
        );
        const draft = draftCommunication(atualizado, 'ORDER_TRACKING', { reuseSaved: false, sender });
        const destinatario = draft.to || pedido?.email || draft.toName || '';
        if (jaTem) {
          partes.push('comprovante já existia');
          jaRegistrado = true;
        }
        // Peças antigas deste caso que não são a do pedido — ex.: a planilha de
        // eventos lida antes como log de e-mail, com "Olá, Pagamento".
        if (options.replacePreviousReceipts) {
          let apagadas = 0;
          for (const evidence of atualizado.evidences) {
            if (evidence.type !== 'DELIVERY_COMMUNICATION') continue;
            if (evidence.sourceReference === referencia) continue;
            medCase = writer.removeReconstruction(medCase, evidence.id);
            apagadas += 1;
          }
          if (apagadas > 0) {
            escreveu = true;
            report.replacedReceipts += apagadas;
            gravou = true;
            partes.push(`${apagadas} ${apagadas === 1 ? 'comprovante antigo apagado' : 'comprovantes antigos apagados'}`);
          }
        }
        if (jaTem) {
          // nada a gerar
        } else if (destinatario) {
          const link =
            linhasEvento.find((row) => row.url && row.pedido && row.url.endsWith(row.pedido))?.url ??
            linhasEvento.find((row) => row.url)?.url ??
            pedido?.url ??
            null;
          const primeiro = atualizado.tracking?.events
            .map((evento) => evento.occurredAt)
            .sort()[0];
          const mensagem = orderTrackingMessage(draft.toName, link);
          medCase = writer.reconstruction(medCase, {
            template: 'ORDER_TRACKING',
            from: draft.from,
            to: destinatario,
            toName: draft.toName ?? undefined,
            subject: mensagem.subject,
            sentAt: primeiro ?? draft.sentAt ?? undefined,
            body: mensagem.body,
            reference: link ?? undefined,
            source: 'MERCHANT',
            sourceReference: referencia,
          });
          escreveu = true;
          report.receipts += 1;
          report.receiptsPhysical += 1;
          gravou = true;
          partes.push('comprovante gerado');
        } else {
          partes.push('sem e-mail nem nome do comprador para o comprovante');
        }
      }
    }

    // Status do caso recalculado uma vez, com tudo que esta linha gravou.
    if (escreveu) writer.status(medCase, comDefesa.has(med.id));

    if (!gravou && jaRegistrado) {
      tocados.add(med.id);
      report.recorded += 1;
      report.lines.push({
        line: primeiraLinha,
        medId: med.medId,
        customerEmail: null,
        kind: 'RECORDED',
        message: `Já estava registrado: ${partes.join('; ')}.`,
      });
      return;
    }

    if (!gravou) {
      report.invalid += 1;
      report.lines.push({
        line: primeiraLinha,
        medId: med.medId,
        customerEmail: null,
        kind: 'INVALID',
        message:
          partes.length > 0
            ? `Nada novo registrado: ${partes.join('; ')}.`
            : pedido && !tipo
              ? 'Pedido sem natureza (físico/digital) e o MED também não tem: nada registrado.'
              : 'A planilha só traz pagamento para este MED — nenhuma etapa de envio para registrar.',
      });
      return;
    }

    tocados.add(med.id);
    report.recorded += 1;
    const linha: DeliveryImportLine = {
      line: primeiraLinha,
      medId: med.medId,
      customerEmail: null,
      kind: 'RECORDED',
      message: `${partes.join('; ')}.`.replace(/^./, (c) => c.toUpperCase()),
    };
    report.lines.push(linha);
  };
  const trabalhador = async () => {
    for (let chave = fila.shift(); chave !== undefined; chave = fila.shift()) {
      await processar(chave);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, fila.length) }, trabalhador));
  await writer.flush();
  report.lines.sort((a, b) => a.line - b.line);

  // Na ordem da planilha, não na ordem em que o paralelo terminou.
  report.touchedMedIds = [...todas]
    .map((chave) => porMedId.get(chave)?.id)
    .filter((id): id is string => id !== undefined && tocados.has(id));
  // MEDs da organização que a planilha não mencionou.
  report.medsWithoutDelivery = rows
    .filter((entry) => !todas.has(entry.med.medId.trim().toLowerCase()))
    .map((entry) => ({ id: entry.med.id, medId: entry.med.medId }));
  return report;
}

/** Soma dois relatórios — Arks e log de envio comum subidos juntos. */
export function mergeReports(a: DeliveryImportReport, b: DeliveryImportReport): DeliveryImportReport {
  const soma = (k: keyof DeliveryImportReport) => (a[k] as number) + (b[k] as number);
  const tocados = new Set([...a.touchedMedIds, ...b.touchedMedIds]);
  const semEntregaB = new Set(b.medsWithoutDelivery.map((m) => m.id));
  return {
    ...a,
    total: soma('total'),
    recorded: soma('recorded'),
    receipts: soma('receipts'),
    receiptsPhysical: soma('receiptsPhysical'),
    receiptsDigital: soma('receiptsDigital'),
    receiptsUnknownKind: soma('receiptsUnknownKind'),
    accessLinked: soma('accessLinked'),
    withoutMessageId: soma('withoutMessageId'),
    duplicated: soma('duplicated'),
    returnedToQueue: soma('returnedToQueue'),
    replacedReceipts: soma('replacedReceipts'),
    anachronistic: soma('anachronistic'),
    notDelivered: soma('notDelivered'),
    unmatched: soma('unmatched'),
    invalid: soma('invalid'),
    withFirstAccess: soma('withFirstAccess'),
    medsConsidered: Math.max(a.medsConsidered, b.medsConsidered),
    medsWithPayerName: Math.max(a.medsWithPayerName, b.medsWithPayerName),
    touchedMedIds: [...tocados],
    lines: [...a.lines, ...b.lines],
    // Sem entrega é o que nenhum dos dois tocou.
    medsWithoutDelivery: a.medsWithoutDelivery.filter(
      (m) => semEntregaB.has(m.id) && !tocados.has(m.id),
    ),
    fatalError: a.fatalError ?? b.fatalError,
    arks: a.arks ?? b.arks,
  };
}
