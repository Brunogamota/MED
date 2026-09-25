'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MED_STATUSES, type MedStatus } from '@/domain/types';
import { serverPageContext } from '@/infra/auth/context';
import { importDeliveryLog } from '@/services/deliveryImportService';
import {
  addDocument,
  addEvidence,
  uploadDocument,
  MAX_DOCUMENT_BYTES,
  createMed,
  createSubmission,
  deleteMeds,
  generateDefenseForMed,
  upsertCustomer,
  upsertOrder,
  upsertTracking,
  upsertTransaction,
  setMedOutcome,
  deleteCommunicationReconstruction,
} from '@/services/medService';
import {
  createDocumentSchema,
  createEvidenceSchema,
  createMedSchema,
  upsertCustomerSchema,
  upsertOrderSchema,
  upsertTrackingSchema,
  upsertTransactionSchema,
} from '@/domain/schemas';
import { address, compact, dateTime, integer, number, text } from '@/lib/forms';
import { looksZipped, readZipEntries, ZipError } from '@/lib/zip';
import { looksXlsx, xlsxToCsv, XlsxError } from '@/lib/xlsx';
import { importParsedMeds, planImport, type ImportPlan } from '@/services/importService';
import { recordDigitalDelivery, recordShipment } from '@/services/fulfillmentService';
import { recordDigitalDeliverySchema, recordShipmentSchema, createCommunicationSchema } from '@/domain/schemas';
import { addCommunicationReconstruction } from '@/services/medService';
import { parseMedImport } from '@/domain/import/csv';
import {
  COMMUNICATION_TEMPLATES,
  EMAIL_SENDER_NAME,
  type CommunicationTemplate,
} from '@/domain/communication/receipt';

/**
 * Server actions used by the MED screens.
 *
 * They go through the same service layer as the REST API, so authorisation,
 * audit and status transitions behave identically whichever entry point is used,
 * and every payload is validated by the same Zod schema.
 */

function requireMedId(form: FormData): string {
  const medId = text(form, 'medId');
  if (!medId) throw new Error('medId ausente');
  return medId;
}

export async function createMedAction(form: FormData): Promise<void> {
  const auth = serverPageContext();

  const input = createMedSchema.parse(
    compact({
      medId: text(form, 'institutionMedId'),
      transactionId: text(form, 'transactionId'),
      endToEndId: text(form, 'endToEndId'),
      pixId: text(form, 'pixId'),
      amount: number(form, 'amount'),
      currency: text(form, 'currency') ?? 'BRL',
      transactionAt: dateTime(form, 'transactionAt'),
      // Sem `?? agora`: campo vazio carimbava a hora do cadastro como se fosse
      // a hora em que a instituicao abriu o MED, e essa data vai para a linha
      // do tempo e para a defesa. Vazio agora fica vazio.
      openedAt: dateTime(form, 'openedAt'),
      responseDeadlineAt: dateTime(form, 'responseDeadlineAt'),
      reason: text(form, 'reason'),
      reasonDescription: text(form, 'reasonDescription'),
      requestingInstitution: text(form, 'requestingInstitution'),
      productType: text(form, 'productType'),
      merchantName: text(form, 'merchantName'),
      payerIp: text(form, 'payerIp'),
      payerDevice: text(form, 'payerDevice'),
      additionalInformation: text(form, 'additionalInformation'),
      payer: compact({
        document: text(form, 'payerDocument'),
        name: text(form, 'payerName'),
        email: text(form, 'payerEmail'),
        phone: text(form, 'payerPhone'),
      }),
      payerAddress: address(form, 'payerAddress'),
    }),
  );

  const med = await createMed(auth, input);
  redirect(`/meds/${med.id}`);
}

export async function upsertTransactionAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertTransactionSchema.parse(
    compact({
      externalId: text(form, 'externalId'),
      endToEndId: text(form, 'endToEndId'),
      amount: number(form, 'amount'),
      currency: text(form, 'currency') ?? 'BRL',
      method: text(form, 'method'),
      status: text(form, 'status'),
      authorizedAt: dateTime(form, 'authorizedAt'),
      capturedAt: dateTime(form, 'capturedAt'),
      provider: text(form, 'provider'),
      providerReference: text(form, 'providerReference'),
    }),
  );

  await upsertTransaction(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertCustomerAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertCustomerSchema.parse(
    compact({
      identification: compact({
        document: text(form, 'document'),
        name: text(form, 'name'),
        email: text(form, 'email'),
        phone: text(form, 'phone'),
      }),
      address: address(form, 'address'),
      accountCreatedAt: dateTime(form, 'accountCreatedAt'),
      externalId: text(form, 'externalId'),
    }),
  );

  await upsertCustomer(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertOrderAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const itemName = text(form, 'itemName');
  const items = itemName
    ? [
        compact({
          name: itemName,
          sku: text(form, 'itemSku'),
          quantity: integer(form, 'itemQuantity') ?? 1,
          unitAmount: number(form, 'itemUnitAmount'),
        }),
      ]
    : [];

  const input = upsertOrderSchema.parse(
    compact({
      externalId: text(form, 'externalId'),
      productType: text(form, 'productType'),
      items,
      totalAmount: number(form, 'totalAmount'),
      placedAt: dateTime(form, 'placedAt'),
      checkoutIp: text(form, 'checkoutIp'),
      deviceFingerprint: text(form, 'deviceFingerprint'),
      userAgent: text(form, 'userAgent'),
      shippingAddress: address(form, 'shipping'),
      provider: text(form, 'provider'),
      providerReference: text(form, 'providerReference'),
    }),
  );

  await upsertOrder(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function upsertTrackingAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = upsertTrackingSchema.parse(
    compact({
      carrier: text(form, 'carrier'),
      trackingCode: text(form, 'trackingCode'),
      status: text(form, 'status'),
      postedAt: dateTime(form, 'postedAt'),
      deliveredAt: dateTime(form, 'deliveredAt'),
      receiverName: text(form, 'receiverName'),
      // Tracking events come from the carrier integration or the API, never
      // from a form: an operator typing logistics events by hand would be
      // creating evidence rather than recording it.
      events: [],
      source: text(form, 'source') ?? 'MANUAL',
      sourceProvider: text(form, 'sourceProvider'),
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await upsertTracking(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function addEvidenceAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createEvidenceSchema.parse(
    compact({
      type: text(form, 'type'),
      value: text(form, 'value'),
      displayValue: text(form, 'displayValue'),
      source: text(form, 'source') ?? 'MANUAL',
      sourceProvider: text(form, 'sourceProvider'),
      sourceReference: text(form, 'sourceReference'),
      receivedAt: dateTime(form, 'receivedAt'),
      verificationStatus: text(form, 'verificationStatus') ?? 'UNVERIFIED',
      metadata: {},
    }),
  );

  await addEvidence(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function addDocumentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createDocumentSchema.parse(
    compact({
      kind: text(form, 'kind'),
      filename: text(form, 'filename'),
      contentType: text(form, 'contentType') ?? 'application/pdf',
      byteSize: integer(form, 'byteSize') ?? 0,
      storageKey: text(form, 'storageKey'),
      checksumSha256: text(form, 'checksumSha256'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await addDocument(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

export async function uploadDocumentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Arquivo excede o limite de ${Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB`,
    );
  }

  await uploadDocument(auth, medId, {
    kind: (text(form, 'kind') ?? 'OTHER') as Parameters<typeof uploadDocument>[2]['kind'],
    filename: file.name || 'documento',
    contentType: file.type || 'application/octet-stream',
    bytes: new Uint8Array(await file.arrayBuffer()),
    source: (text(form, 'source') ?? 'MERCHANT') as Parameters<typeof uploadDocument>[2]['source'],
    sourceReference: text(form, 'sourceReference') ?? null,
  });

  revalidatePath(`/meds/${medId}`);
}

/**
 * Registro de entrega de produto fisico.
 *
 * Quando o operador marca "gerar defesa", a defesa sai na mesma acao — e esse o
 * fluxo real: definiu o status, quer o PDF. O que nao acontece e a data ser
 * preenchida sozinha: marco sem horario nao vira evento.
 */
export async function recordShipmentAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = recordShipmentSchema.parse(
    compact({
      status: text(form, 'status'),
      trackingCode: text(form, 'trackingCode'),
      carrier: text(form, 'carrier'),
      receiverName: text(form, 'receiverName'),
      inProductionAt: dateTime(form, 'inProductionAt'),
      postedAt: dateTime(form, 'postedAt'),
      inTransitAt: dateTime(form, 'inTransitAt'),
      outForDeliveryAt: dateTime(form, 'outForDeliveryAt'),
      deliveredAt: dateTime(form, 'deliveredAt'),
      notDeliveredAt: dateTime(form, 'notDeliveredAt'),
      returnedAt: dateTime(form, 'returnedAt'),
      source: text(form, 'source') ?? 'MANUAL',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await recordShipment(auth, medId, input);
  if (form.get('generateDefense') === 'on') {
    await generateDefenseForMed(auth, medId, { useLlm: false });
  }
  revalidatePath(`/meds/${medId}`);
}

/** Registro de entrega digital, servico ou assinatura. */
export async function recordDigitalDeliveryAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = recordDigitalDeliverySchema.parse(
    compact({
      channel: text(form, 'channel'),
      sentTo: text(form, 'sentTo'),
      sentAt: dateTime(form, 'sentAt'),
      platform: text(form, 'platform'),
      firstAccessAt: dateTime(form, 'firstAccessAt'),
      accessCount: integer(form, 'accessCount'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await recordDigitalDelivery(auth, medId, input);
  if (form.get('generateDefense') === 'on') {
    await generateDefenseForMed(auth, medId, { useLlm: false });
  }
  revalidatePath(`/meds/${medId}`);
}

export async function generateDefenseAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();
  await generateDefenseForMed(auth, medId, { useLlm: form.get('useLlm') === 'on' });
  revalidatePath(`/meds/${medId}`);
}

export async function createSubmissionAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const provider = text(form, 'provider') ?? 'generic-json';
  const auth = serverPageContext();
  await createSubmission(auth, medId, { provider });
  revalidatePath(`/meds/${medId}`);
}

// ---------------------------------------------------------------------------
// Acoes em lote da fila
// ---------------------------------------------------------------------------

function medIdsFrom(form: FormData): string[] {
  const raw = text(form, 'medIds');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Regera a minuta dos casos selecionados. Falha individual não trava o lote. */
export async function batchGenerateDefensesAction(form: FormData): Promise<void> {
  const auth = serverPageContext();
  for (const medId of medIdsFrom(form)) {
    try {
      await generateDefenseForMed(auth, medId, { useLlm: false });
    } catch {
      // Caso inelegível (ex.: sem permissão ou inexistente) fica como está.
    }
  }
  revalidatePath('/meds');
}

/**
 * Exclui os casos selecionados.
 *
 * Ao contrario das outras acoes em lote, aqui o erro nao e engolido: apagar e
 * irreversivel, e uma falha silenciosa deixaria o operador achando que o caso
 * sumiu quando ele continua la.
 */
export async function batchDeleteMedsAction(form: FormData): Promise<void> {
  const auth = serverPageContext();
  await deleteMeds(auth, medIdsFrom(form));
  revalidatePath('/meds');
  revalidatePath('/');
}

/** Prepara o payload de envio dos casos selecionados, um a um. */
export async function batchPrepareSubmissionsAction(form: FormData): Promise<void> {
  const auth = serverPageContext();
  for (const medId of medIdsFrom(form)) {
    try {
      await createSubmission(auth, medId, { provider: 'generic-json' });
    } catch {
      // Sem defesa ou caso inelegível: pulado; o operador vê o estado na fila.
    }
  }
  revalidatePath('/meds');
}

/**
 * Declara o mesmo desfecho para os casos selecionados.
 *
 * Preparar o envio e declarar que o envio aconteceu sao coisas diferentes:
 * `batchPrepareSubmissionsAction` monta o payload, e ninguem fora do operador
 * sabe se a instituicao recebeu. Faltava a segunda metade em lote — quem
 * despacha um lote de defesas de uma vez marcava os casos um por um, e um lote
 * de sessenta e cinco vira sessenta e cinco telas.
 *
 * Reabrir em lote pede a palavra `AUTOMATICO`, e nao campo vazio. Em lote,
 * campo ausente e campo ilegivel chegam como vazio, e vazio significando
 * "reabre tudo" transformaria um formulario truncado em sessenta e cinco
 * desfechos apagados. Desfecho que nao e declaravel nao vira desfecho nenhum:
 * `setMedOutcome` recusa, e o lote nao contorna.
 */
export async function batchSetMedOutcomeAction(form: FormData): Promise<void> {
  const raw = text(form, 'outcome');
  if (!raw) return;
  const outcome = raw === 'AUTOMATICO' ? null : MED_STATUSES.includes(raw as MedStatus) ? (raw as MedStatus) : undefined;
  if (outcome === undefined) return;
  const auth = serverPageContext();
  for (const medId of medIdsFrom(form)) {
    try {
      await setMedOutcome(auth, medId, outcome);
      revalidatePath(`/meds/${medId}`);
    } catch {
      // Caso inelegível ou fora da organização: fica como está, e a fila mostra.
    }
  }
  revalidatePath('/meds');
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Importacao em lote
// ---------------------------------------------------------------------------

/**
 * Le o arquivo colado ou enviado. A analise nao grava nada: o operador confere
 * o que foi reconhecido antes de qualquer escrita.
 */
/**
 * Leitura do arquivo do lote, ou o motivo de nao dar para ler.
 *
 * Resultado, e nao excecao: este modulo e `use server`, e ali so podem sair
 * funcoes async — exportar uma classe de erro derruba o modulo inteiro.
 */
type ImportRead = { ok: true; csv: string } | { ok: false; error: string };

type ImportReadMany = { ok: true; csvs: string[] } | { ok: false; error: string };

/** Byte nulo nao existe em CSV e existe em todo formato binario de planilha. */
function looksBinary(content: string): boolean {
  return content.includes('\u0000');
}

/** Teto do que um zip pode carregar descompactado, por importacao. */
const MAX_UNZIPPED = 32 * 1024 * 1024;

/** Extensoes que valem como tabela dentro de um zip. */
const TABLE_EXTENSIONS = ['.csv', '.tsv', '.txt'];

/**
 * Abre um arquivo enviado como uma lista de textos.
 *
 * Zip vira a lista dos arquivos de dentro; qualquer outro vira uma lista de
 * um. O export do provedor quase sempre chega zipado, e mandar quem opera
 * descompactar antes so acrescenta um passo onde ja da errado.
 *
 * Dentro do zip, o que nao e tabela e ignorado em silencio — README, pasta do
 * macOS, logo. Nao e erro; e o que vem junto.
 */
async function openAsTexts(file: File): Promise<{ ok: true; texts: string[] } | { ok: false; error: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Antes do zip, e nao depois: um .xlsx **e** um zip, e cairia no ramo de
  // baixo, que procuraria .csv dentro dele e diria que o export saiu
  // incompleto — quando o arquivo esta inteiro e certo.
  if (looksXlsx(bytes)) {
    try {
      return { ok: true, texts: [xlsxToCsv(bytes)] };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof XlsxError
            ? error.message
            : `Não foi possível ler a planilha "${file.name}". Salve como CSV e suba o CSV.`,
      };
    }
  }

  if (looksZipped(bytes)) {
    try {
      const tabelas: string[] = [];
      for (const entry of readZipEntries(bytes, MAX_UNZIPPED)) {
        const nome = entry.name.toLowerCase();
        if (nome.includes('__macosx/') || nome.startsWith('.')) continue;
        // Planilha dentro do zip vira tabela do mesmo jeito: quem zipa o que a
        // instituicao mandou nao devia ter de abrir para converter primeiro.
        if (looksXlsx(entry.bytes)) {
          tabelas.push(xlsxToCsv(entry.bytes));
          continue;
        }
        if (TABLE_EXTENSIONS.some((extensao) => nome.endsWith(extensao))) {
          tabelas.push(entry.bytes.toString('utf8'));
        }
      }
      if (tabelas.length === 0) {
        return {
          ok: false,
          error: `"${file.name}" não tem nenhuma tabela dentro. Confira se o export saiu completo.`,
        };
      }
      return { ok: true, texts: tabelas };
    } catch (error) {
      if (error instanceof ZipError || error instanceof XlsxError) {
        return { ok: false, error: error.message };
      }
      return { ok: false, error: `Não foi possível abrir "${file.name}".` };
    }
  }

  const content = new TextDecoder('utf-8').decode(bytes);
  if (looksBinary(content)) {
    return {
      ok: false,
      // `.xlsx` ja foi tratado acima. O que sobra aqui e outro binario: .xls
      // antigo, PDF, imagem de print.
      error: `"${file.name}" não é texto nem planilha .xlsx. Salve como CSV e suba o CSV.`,
    };
  }
  return { ok: true, texts: [content] };
}

/**
 * O parser le o arquivo como texto. Planilha e zip viram texto antes de chegar
 * nele; o que nao der para converter e recusado com o motivo, em vez de entrar
 * como bytes ilegiveis que o parser trataria como um cabecalho enorme e sem
 * sentido — dezenas de "coluna ignorada" no lugar de dizer o que aconteceu.
 */
async function readImportText(form: FormData): Promise<ImportRead> {
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    const aberto = await openAsTexts(file);
    if (!aberto.ok) return aberto;
    // Esta tela importa um lote de MEDs por vez: um zip com varias tabelas
    // nao diz qual delas e o lote, e escolher a primeira seria adivinhar.
    if (aberto.texts.length > 1) {
      return {
        ok: false,
        error: `"${file.name}" tem mais de uma tabela dentro. Envie o arquivo do lote de MEDs.`,
      };
    }
    return { ok: true, csv: aberto.texts[0] ?? '' };
  }
  return { ok: true, csv: text(form, 'csv') ?? '' };
}

/**
 * O mesmo, para o campo que aceita varios arquivos.
 *
 * Um arquivo ilegivel derruba a importacao inteira em vez de entrar pela
 * metade: metade de um export carregada e pior que nenhuma, porque parece
 * completa.
 */
async function readImportTexts(form: FormData): Promise<ImportReadMany> {
  const csvs: string[] = [];
  for (const entry of form.getAll('file')) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const aberto = await openAsTexts(entry);
    if (!aberto.ok) return aberto;
    csvs.push(...aberto.texts);
  }
  if (csvs.length === 0) {
    const colado = text(form, 'csv');
    if (colado) csvs.push(colado);
  }
  return { ok: true, csvs };
}

export interface ImportPreviewState {
  csv: string;
  defaultOpenedAt: string | null;
  batchReference: string | null;
  parsed: ReturnType<typeof parseMedImport> | null;
  /**
   * O que vai entrar se confirmar, pelo mesmo caminho que a importacao usa.
   * Calculado aqui, no servidor, porque `planImport` mora no servico: a tela e
   * cliente, e importar de la levaria o Prisma para o bundle do navegador.
   */
  plan: ImportPlan | null;
  report: Awaited<ReturnType<typeof importParsedMeds>> | null;
  error: string | null;
}

export async function previewImportAction(
  _previous: ImportPreviewState | null,
  form: FormData,
): Promise<ImportPreviewState> {
  const defaultOpenedAt = dateTime(form, 'defaultOpenedAt') ?? null;
  const batchReference = text(form, 'batchReference') ?? null;

  const read = await readImportText(form);
  if (!read.ok) {
    return {
      csv: '',
      defaultOpenedAt,
      batchReference,
      parsed: null,
      plan: null,
      report: null,
      error: read.error,
    };
  }
  const csv = read.csv;

  if (csv.trim().length === 0) {
    return {
      csv: '',
      defaultOpenedAt,
      batchReference,
      parsed: null,
      plan: null,
      report: null,
      error: 'Cole o conteudo do arquivo ou selecione um arquivo CSV.',
    };
  }

  const parsed = parseMedImport(csv);
  return {
    csv,
    defaultOpenedAt,
    batchReference,
    parsed,
    plan: parsed.fatalError
      ? null
      : planImport(parsed, { defaultOpenedAt: defaultOpenedAt ?? undefined }),
    report: null,
    error: null,
  };
}

export async function confirmImportAction(
  _previous: ImportPreviewState | null,
  form: FormData,
): Promise<ImportPreviewState> {
  const auth = serverPageContext();
  const csv = text(form, 'csv') ?? '';
  const defaultOpenedAt = text(form, 'defaultOpenedAt') ?? null;
  const batchReference = text(form, 'batchReference') ?? null;

  const parsed = parseMedImport(csv);
  if (parsed.fatalError) {
    return {
      csv,
      defaultOpenedAt,
      batchReference,
      parsed,
      plan: null,
      report: null,
      error: parsed.fatalError,
    };
  }

  const report = await importParsedMeds(auth, parsed, {
    defaultOpenedAt: defaultOpenedAt ?? undefined,
    batchReference: batchReference ?? undefined,
  });

  revalidatePath('/meds');
  revalidatePath('/');
  return {
    csv,
    defaultOpenedAt,
    batchReference,
    parsed,
    plan: planImport(parsed, { defaultOpenedAt: defaultOpenedAt ?? undefined }),
    report,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Comprovante de comunicação
// ---------------------------------------------------------------------------

export async function addCommunicationAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const auth = serverPageContext();

  const input = createCommunicationSchema.parse(
    compact({
      template: text(form, 'template') ?? 'GENERIC',
      // Remetente não é campo do formulário: quem envia é sempre o gateway.
      from: text(form, 'from') ?? EMAIL_SENDER_NAME,
      to: text(form, 'to'),
      toName: text(form, 'toName'),
      subject: text(form, 'subject'),
      sentAt: dateTime(form, 'sentAt'),
      body: text(form, 'body'),
      reference: text(form, 'reference'),
      source: text(form, 'source') ?? 'MERCHANT',
      sourceReference: text(form, 'sourceReference'),
    }),
  );

  await addCommunicationReconstruction(auth, medId, input);
  revalidatePath(`/meds/${medId}`);
}

/**
 * Desfecho declarado pelo operador.
 *
 * Campo vazio significa "voltar ao automatico" — e como se desfaz um desfecho
 * marcado por engano.
 */
export async function setMedOutcomeAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const raw = text(form, 'outcome');
  const outcome = raw && MED_STATUSES.includes(raw as MedStatus) ? (raw as MedStatus) : null;
  await setMedOutcome(serverPageContext(), medId, outcome);
  revalidatePath(`/meds/${medId}`);
  revalidatePath('/meds');
}

/** Remove um comprovante reconstruído que saiu errado. */
export async function deleteCommunicationAction(form: FormData): Promise<void> {
  const medId = requireMedId(form);
  const evidenceId = String(form.get('evidenceId') ?? '').trim();
  if (!evidenceId) return;
  await deleteCommunicationReconstruction(serverPageContext(), medId, evidenceId);
  revalidatePath(`/meds/${medId}`);
}

export interface DeliveryImportState {
  report: Awaited<ReturnType<typeof importDeliveryLog>> | null;
  error: string | null;
}

export interface MarkSubmittedState {
  /** Quantos casos passaram a Enviado nesta declaracao. */
  marked: number;
  error: string | null;
}

/**
 * Declara como Enviado o lote que a importacao acabou de tocar.
 *
 * Existe aqui, e nao so na fila, porque e aqui que se sabe quais casos sao. Ao
 * voltar para a fila, quem opera tem de reencontrar a selecao a mao entre
 * cento e tantos casos — e e nesse passo que se perde qual caso era de qual
 * arquivo, ou se marca um que nao foi.
 *
 * O que se declara continua sendo o mesmo: que a defesa **foi enviada** a
 * instituicao. Importar evidencia nao envia nada; quem envia e quem opera, e
 * por isso o botao e um segundo ato, e nao um efeito da importacao.
 */
export async function markSubmittedAction(
  _previous: MarkSubmittedState | null,
  form: FormData,
): Promise<MarkSubmittedState> {
  const medIds = medIdsFrom(form);
  if (medIds.length === 0) return { marked: 0, error: 'Nenhum caso para marcar.' };

  const auth = serverPageContext();
  let marked = 0;
  for (const medId of medIds) {
    try {
      await setMedOutcome(auth, medId, 'SUBMITTED');
      marked += 1;
      revalidatePath(`/meds/${medId}`);
    } catch {
      // Caso inelegivel ou fora da organizacao: fica como esta, e a conta no
      // fim diz quantos entraram de verdade.
    }
  }
  revalidatePath('/meds');
  revalidatePath('/');
  return { marked, error: null };
}

/**
 * Importa o log de envio do provedor e registra a entrega nos MEDs.
 *
 * Grava direto, sem prévia: diferente da importação de MEDs, aqui nada é
 * criado — só se anexa registro a caso que já existe, e reimportar o mesmo
 * arquivo sobrescreve com o mesmo conteúdo.
 */
export async function importDeliveryLogAction(
  _previous: DeliveryImportState | null,
  form: FormData,
): Promise<DeliveryImportState> {
  const read = await readImportTexts(form);
  if (!read.ok) return { report: null, error: read.error };
  if (read.csvs.length === 0) {
    return { report: null, error: 'Escolha o arquivo do log de envio.' };
  }

  const modelo = form.get('modelo');
  const report = await importDeliveryLog(serverPageContext(), read.csvs, {
    generateReceipts: form.get('gerarComprovantes') === 'on',
    receiptTemplate: COMMUNICATION_TEMPLATES.includes(modelo as CommunicationTemplate)
      ? (modelo as CommunicationTemplate)
      : undefined,
  });
  revalidatePath('/meds');
  return { report, error: report.fatalError };
}
