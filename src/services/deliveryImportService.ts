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
  upsertCustomer,
} from '@/services/medService';
import {
  draftCommunication,
  EMAIL_SENDER_NAME,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';
import { recordDigitalDelivery } from '@/services/fulfillmentService';
import { recordAudit } from '@/services/audit';
import {
  parseDeliveryLog,
  type DeliveryLogRow,
  type ParsedDeliveryLog,
} from '@/domain/import/deliveryLog';
import {
  comparableName,
  matchDeliveryLog,
  type MatchableMed,
} from '@/domain/import/deliveryMatch';

export type DeliveryOutcomeKind =
  | 'RECORDED'
  | 'ACCESS_LINKED'
  | 'ACCESS_BEFORE_CHARGE'
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

  /**
   * Que mensagem este log registra.
   *
   * O arquivo diz que um e-mail foi aceito pelo servidor do destinatario, e
   * nao o que ele dizia. Um log de confirmacao de compra e um log de
   * liberacao de acesso sao indistinguiveis por dentro — os dois trazem
   * message-id, hora e resposta SMTP. Quem sabe qual e quem opera, e por isso
   * o modelo e declarado aqui em vez de adivinhado pelo nome do arquivo.
   */
  receiptTemplate?: CommunicationTemplate;
}

export interface DeliveryImportReport {
  total: number;
  recorded: number;
  /** Comprovantes de comunicacao gerados a partir das entregas registradas. */
  receipts: number;
  /** Liberacoes de acesso ligadas ao comprador pelo e-mail. */
  accessLinked: number;
  /**
   * Entregas registradas sem message-id.
   *
   * O dado entra — destinatario, horario, URL —, mas o envio nao e conferivel
   * na origem, e por isso nao vira comprovante. O numero fica a vista porque
   * e ele que diz se a defesa tem peca ou so tem cadastro.
   */
  withoutMessageId: number;
  /**
   * Liberacoes anteriores a cobranca, recusadas como comprovante.
   *
   * O numero importa por si: se quase todo caso cai aqui, a entrega que o
   * arquivo carrega nao e a da cobranca contestada, e a defesa precisa de
   * outra prova — nao de outra formatacao desta.
   */
  anachronistic: number;
  notDelivered: number;
  unmatched: number;
  invalid: number;
  /** Quantos registros trouxeram primeiro acesso — a evidencia que decide. */
  withFirstAccess: number;
  /**
   * Contra quantos MEDs o arquivo foi comparado, e quantos deles tem nome de
   * pagador. Sem esses dois numeros, "nada casou" nao se distingue de "nao ha
   * com o que casar" — e a pessoa fica mexendo no arquivo quando o problema
   * esta do outro lado.
   */
  medsConsidered: number;
  medsWithPayerName: number;
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

/**
 * Junta o que foi lido de cada arquivo numa lista so.
 *
 * As linhas de arquivos diferentes nao podem colidir de numero, senao o
 * relatorio manda a pessoa conferir a linha errada: cada arquivo continua de
 * onde o anterior parou, com um salto no meio para a fronteira ficar visivel.
 */
function mergeParsed(partes: ParsedDeliveryLog[]): ParsedDeliveryLog {
  const comErro = partes.find((parte) => parte.fatalError);
  if (comErro) return { rows: [], fatalError: comErro.fatalError };

  const rows: DeliveryLogRow[] = [];
  let deslocamento = 0;
  for (const parte of partes) {
    for (const row of parte.rows) rows.push({ ...row, line: row.line + deslocamento });
    deslocamento += parte.rows.length + 1;
  }
  return { rows, fatalError: null };
}

export async function importDeliveryLog(
  auth: AuthContext,
  source: string | string[],
  options: DeliveryImportOptions = {},
): Promise<DeliveryImportReport> {
  assertCan(auth.role, 'med:write');

  // Varios arquivos entram numa importacao so, e nao em duas seguidas. O
  // export costuma vir partido — cobrancas num arquivo, entregas no outro —, e
  // e a cobranca que identifica o MED. Importados separado, o arquivo de
  // entregas chegaria sem nada a que se ligar.
  const parsed = mergeParsed((Array.isArray(source) ? source : [source]).map(parseDeliveryLog));
  const empty: DeliveryImportReport = {
    total: 0,
    recorded: 0,
    receipts: 0,
    accessLinked: 0,
    withoutMessageId: 0,
    anachronistic: 0,
    notDelivered: 0,
    unmatched: 0,
    invalid: 0,
    withFirstAccess: 0,
    medsConsidered: 0,
    medsWithPayerName: 0,
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

  // Nome do pagador -> MEDs. Diferente das outras duas pontes, esta e montada
  // com todos os MEDs da organizacao, e nao so com os que casaram agora: quem
  // sobe o arquivo de entregas sozinho nao tem nenhuma linha de cobranca para
  // servir de ponte, e o nome e a unica coisa que os dois lados tem.
  const medsByName = new Map<string, MatchableMed[]>();
  for (const med of candidates) {
    const chave = comparableName(med.payerName);
    if (!chave) continue;
    const lista = medsByName.get(chave) ?? [];
    lista.push(med);
    medsByName.set(chave, lista);
  }

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
  // Id da transacao -> MEDs. E a ponte exata, e por isso vem antes do e-mail:
  // o e-mail identifica o comprador, o txn_id identifica a cobranca. Quando o
  // export traz os dois lados com esse campo, nao ha o que adivinhar.
  const medsByTxn = new Map<string, MatchableMed[]>();
  let recorded = 0;
  let receipts = 0;
  let accessLinked = 0;
  let withoutMessageId = 0;
  let anachronistic = 0;
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
    const txn = row.transactionRef?.trim();
    if (txn) {
      const list = medsByTxn.get(txn) ?? [];
      list.push(med);
      medsByTxn.set(txn, list);
    }

    // O e-mail do comprador vai para o cadastro do caso, e nao so para dentro
    // do registro de entrega: e por ele que a tela do MED mostra com quem o
    // estabelecimento falou, e e um dos dados que a defesa cita.
    if (row.customerEmail || row.customerName) {
      await upsertCustomer(auth, med.id, {
        identification: {
          name: row.customerName ?? undefined,
          email: row.customerEmail ?? undefined,
        },
        externalId: txn || undefined,
      });
    }

    if (!row.messageId) withoutMessageId += 1;

    // Comprovante so com message-id: a peca imprime o identificador que a
    // instituicao cruza na origem, e sem ele ela afirmaria um envio que
    // ninguem pode conferir. O registro fica; a peca, nao.
    if (options.generateReceipts && !row.messageId) {
      lines.push({
        line: row.line,
        medId: med.medId,
        customerEmail: row.customerEmail,
        kind: 'RECORDED',
        message:
          'Entrega registrada, sem comprovante: a linha não traz message-id, e sem ele o ' +
          'envio não é conferível na origem. O dado entrou no caso.',
      });
      continue;
    }

    if (options.generateReceipts) {
      // Recarrega o caso: o rascunho le a entrega que acabou de ser gravada, e
      // e dela que saem destinatario, data e link. Sem recarregar, o
      // comprovante sairia com o caso de antes da importacao.
      const medCase = await getCase(auth, med.id);
      const draft = draftCommunication(
        medCase,
        options.receiptTemplate ?? 'ACCESS_DELIVERY',
      );
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
    const txn = row.transactionRef?.trim();
    const porTxn = txn ? medsByTxn.get(txn) : undefined;
    const buyer = normalizeEmail(row.customerEmail);
    const porEmail = buyer ? medsByBuyer.get(buyer) : undefined;

    // Ultimo recurso: o nome. So vale quando aponta para um MED unico — dois
    // MEDs do mesmo comprador e o caso em que o nome nao distingue nada, e
    // escolher um seria sorteio.
    const nome = comparableName(row.customerName);
    // Igual primeiro; se nao achar, um contendo o outro. Um dos lados costuma
    // vir com um sobrenome a menos, e exigir igualdade exata descartaria
    // casamento bom — o mesmo criterio que o casador ja usa para conferir.
    const porNomeTodos = nome
      ? (medsByName.get(nome) ??
        [...medsByName].find(([chave]) => chave.includes(nome) || nome.includes(chave))?.[1])
      : undefined;
    const porNome = porNomeTodos?.length === 1 ? porNomeTodos : undefined;

    const meds = porTxn ?? porEmail ?? porNome;
    const exata = porTxn !== undefined;
    const ligadoPeloNome = meds !== undefined && meds === porNome;

    if (!meds && porNomeTodos && porNomeTodos.length > 1) {
      lines.push({
        line: row.line,
        medId: porNomeTodos.map((med) => med.medId).join(', '),
        customerEmail: row.customerEmail,
        kind: 'UNMATCHED',
        message:
          `${porNomeTodos.length} MEDs de ${row.customerName}: o nome não diz a qual desta ` +
          'linha se refere. Suba o arquivo de cobranças junto — o id da transação resolve.',
      });
      continue;
    }
    // Quando nem o nome acha, o motivo do casador fala de valor e data — e a
    // pessoa fica sem saber que a busca por nome tambem foi tentada e falhou.
    // Dizer qual nome nao existe transforma um erro opaco num diagnostico.
    if (!meds && medsByName.size === 0) {
      lines.push({
        line: row.line,
        medId: null,
        customerEmail: row.customerEmail,
        kind: 'UNMATCHED',
        message:
          'Nenhum MED importado tem nome de pagador, então não há por onde ligar esta linha. ' +
          'Importe os MEDs no passo 1 e suba o arquivo de cobranças junto com este.',
      });
      continue;
    }

    if (!meds && nome) {
      lines.push({
        line: row.line,
        medId: null,
        customerEmail: row.customerEmail,
        kind: 'UNMATCHED',
        message:
          `Nenhum MED com o nome "${row.customerName}". Confira se os MEDs deste lote já foram ` +
          'importados no passo 1 e se o nome do pagador é o mesmo do arquivo de envios.',
      });
      continue;
    }

    const sentAt = row.deliveredAt ?? row.sentAt;
    if (meds && row.productUrl && row.outcome === 'DELIVERED' && sentAt) {
      // Uma liberação anterior à cobrança não prova a entrega **daquela**
      // cobrança: nada é entregue antes de ser comprado. O acesso é real e é
      // do mesmo comprador, mas veio de outra compra, de uma renovação ou de
      // um plano — e só o estabelecimento sabe qual. Virar comprovante aqui
      // produziria uma peça que se contradiz na própria data, e é o primeiro
      // lugar em que um analista olha.
      const early = meds.filter(
        (med) => med.transactionAt && sentAt < med.transactionAt,
      );
      const eligible = meds.filter((med) => !early.includes(med));

      for (const med of early) {
        anachronistic += 1;
        withoutDelivery.set(med.id, { id: med.id, medId: med.medId });
        lines.push({
          line: row.line,
          medId: med.medId,
          customerEmail: row.customerEmail,
          kind: 'ACCESS_BEFORE_CHARGE',
          message:
            `Liberação de acesso em ${sentAt.slice(0, 10)}, anterior à cobrança de ` +
            `${med.transactionAt?.slice(0, 10)}. Nenhum comprovante foi gerado: entrega ` +
            'anterior à compra não prova esta compra. O acesso é do mesmo comprador, mas ' +
            'veio de outra operação — diga qual antes de usar isto na defesa.',
        });
      }

      if (eligible.length === 0) continue;

      for (const med of eligible) {
        // A URL fica no registro de entrega, e nao so dentro do comprovante:
        // e o endereco onde o acesso foi liberado, e a tela do MED mostra
        // isso mesmo que ninguem gere peca nenhuma.
        await recordDigitalDelivery(auth, med.id, {
          channel: 'EMAIL',
          sentTo: row.customerEmail ?? undefined,
          sentAt,
          platform: row.productUrl,
          firstAccessAt: row.firstAccessAt ?? undefined,
          source: 'EMAIL',
          sourceProvider: providerOf(row.messageId),
          sourceReference: row.messageId ?? undefined,
        });

        if (!options.generateReceipts) continue;

        await addCommunicationReconstruction(auth, med.id, {
          template: options.receiptTemplate ?? 'ACCESS_DELIVERY',
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
        medId: eligible.map((med) => med.medId).join(', '),
        customerEmail: row.customerEmail,
        kind: 'ACCESS_LINKED',
        message:
          `Liberação de acesso${row.productName ? ` a ${row.productName}` : ''} ligada ` +
          (exata
            ? `pelo id da transação (${txn}).`
            : `pelo ${ligadoPeloNome ? 'nome' : 'e-mail'} do comprador — o arquivo não traz ` +
              'o id da transação, então a ligação é com a pessoa, não com esta cobrança.') +
          `${eligible.length > 1 ? ` ${eligible.length} MEDs.` : ''}` +
          `${row.firstAccessAt ? ' Com primeiro acesso registrado.' : ''}`,
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
      semMessageId: withoutMessageId,
      acessosAnterioresACobranca: anachronistic,
    },
  });

  return {
    total: parsed.rows.length,
    recorded,
    receipts,
    accessLinked,
    withoutMessageId,
    anachronistic,
    notDelivered,
    unmatched: report.unmatchedRows.length - accessLinked,
    invalid,
    withFirstAccess,
    medsConsidered: candidates.length,
    medsWithPayerName: medsByName.size,
    lines: lines.sort((a, b) => a.line - b.line),
    medsWithoutDelivery: [...withoutDelivery.values()],
    fatalError: null,
  };
}
