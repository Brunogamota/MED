import type { AuthContext } from '@/infra/auth/context';
import type { NamedTable } from '@/lib/uploads';
import { detectDelimiter, parseDelimited, parseMedImport } from '@/domain/import/csv';
import {
  buildCompanyIndex,
  identifyCompany,
  learnAliases,
  pickBrandColor,
  pickBrandLayout,
  type AutoLayout,
  type CompanyHints,
  type CompanyMatch,
  type CompanyVia,
} from '@/domain/master/company';
import { parseCommunicationReceipt, type CommunicationReceipt } from '@/domain/communication/receipt';
import { resolveEndToEndId } from '@/domain/identifiers';
import type { MedStatus } from '@/domain/types';
import type { SkinId } from '@/config/skins';
import { formatAmount } from '@/lib/format';
import {
  addAccountAliases,
  createAccount,
  listAccounts,
  type Account,
} from '@/services/accountService';
import { importParsedMeds } from '@/services/importService';
import { generateDefenseForMed, getCase, listMeds, setMedOutcome } from '@/services/medService';
import { importDeliveryLog, type DeliveryImportLine } from '@/services/deliveryImportService';
import { importArksFiles, mergeReports, splitArksFiles } from '@/services/eventImportService';
import { ValidationError } from '@/services/errors';

/**
 * Conta Master: uma operação sobre todas as empresas de uma vez.
 *
 * Cada empresa continua sendo uma organização isolada — a Master não junta
 * dado de ninguém. Ela só decide, linha a linha, em qual conta cada MED
 * entra, e depois age em cada conta com o contexto daquela conta: toda
 * consulta segue filtrada pelo `organizationId` da empresa certa.
 *
 * Quem pode usar a Master é quem já pode trocar para qualquer conta no
 * console; o acesso não é maior que isso.
 */

/** Linhas por bloco de importação: cabe com folga no tempo de uma chamada. */
const CHUNK_ROWS = 100;

/** Contexto da conta escolhida, validada contra as contas que existem. */
export async function masterAuthFor(base: AuthContext, accountId: string): Promise<{ auth: AuthContext; account: Account }> {
  const account = (await listAccounts()).find((candidate) => candidate.id === accountId);
  if (!account) throw new ValidationError('Conta não encontrada.');
  return { auth: { ...base, organizationId: account.id }, account };
}

// ---------------------------------------------------------------------------
// 1. MEDs: prévia por empresa
// ---------------------------------------------------------------------------

export interface MasterGroup {
  /** Id da conta, ou `novo:<nome normalizado>` para empresa a criar. */
  key: string;
  accountId: string | null;
  name: string;
  isNew: boolean;
  skin: SkinId;
  brandColor: string | null;
  /** Desenho do comprovante: o da conta, ou o que a empresa nova vai ganhar. */
  brandLayout: AutoLayout | null;
  via: Partial<Record<CompanyVia, number>>;
  rows: number;
  /** Cabeçalho + até 100 linhas, do arquivo de origem. */
  chunks: string[];
  /** Apelidos que a conta vai ganhar (CNPJ/chave e prefixo vistos no lote). */
  learned: string[];
}

export interface MasterPreview {
  groups: MasterGroup[];
  unknown: { file: string; line: number; medId: string | null }[];
  files: { name: string; rows: number; error: string | null }[];
}

function csvCell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(';')).join('\n');
}

export async function previewMasterImport(tables: NamedTable[]): Promise<MasterPreview> {
  const accounts = await listAccounts();
  const index = buildCompanyIndex(accounts);

  interface Bucket {
    group: MasterGroup;
    /** Linhas cruas por arquivo, com o cabeçalho do arquivo. */
    byFile: Map<string, { header: string[]; rows: string[][] }>;
  }
  const buckets = new Map<string, Bucket>();
  const learnRows: { company: string; hints: CompanyHints }[] = [];
  const files: MasterPreview['files'] = [];
  const unknown: MasterPreview['unknown'] = [];
  const usedColors = accounts.map((account) => account.brandColor);
  const usedLayouts: (string | null)[] = accounts.map((account) => account.brandLayout);

  /** Põe a linha no grupo da empresa (criando o grupo na primeira vez). */
  const place = (
    match: Exclude<CompanyMatch, { kind: 'UNKNOWN' }>,
    hints: CompanyHints,
    fileKey: string,
    header: string[],
    rawRow: string[] | undefined,
  ) => {
    const key = match.kind === 'ACCOUNT' ? match.accountId : `novo:${match.key}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      const account = match.kind === 'ACCOUNT' ? accounts.find((a) => a.id === match.accountId) : undefined;
      const brandColor = account ? account.brandColor : pickBrandColor(usedColors);
      const brandLayout = account ? account.brandLayout : pickBrandLayout(usedLayouts);
      if (!account) {
        usedColors.push(brandColor);
        usedLayouts.push(brandLayout);
      }
      bucket = {
        group: {
          key,
          accountId: account?.id ?? null,
          name: account?.name ?? (match.kind === 'NEW' ? match.name : key),
          isNew: !account,
          skin: account?.skin ?? 'auto',
          brandColor,
          brandLayout,
          via: {},
          rows: 0,
          chunks: [],
          learned: [],
        },
        byFile: new Map(),
      };
      buckets.set(key, bucket);
    }
    if (match.kind === 'ACCOUNT') bucket.group.via[match.via] = (bucket.group.via[match.via] ?? 0) + 1;
    bucket.group.rows += 1;
    if (rawRow) {
      const entry = bucket.byFile.get(fileKey) ?? { header, rows: [] };
      entry.rows.push(rawRow);
      bucket.byFile.set(fileKey, entry);
    }
    learnRows.push({ company: key, hints });
  };

  const later: {
    file: string;
    line: number;
    medId: string | null;
    hints: CompanyHints;
    fileKey: string;
    header: string[];
    rawRow: string[] | undefined;
  }[] = [];

  tables.forEach((table, tableIndex) => {
    const parsed = parseMedImport(table.text);
    if (parsed.fatalError) {
      files.push({ name: table.name, rows: 0, error: parsed.fatalError });
      return;
    }
    files.push({ name: table.name, rows: parsed.rows.length, error: null });
    const trimmed = table.text.trim();
    const raw = parseDelimited(trimmed, detectDelimiter(trimmed));
    const header = raw[0] ?? [];
    const fileKey = `${tableIndex}:${table.name}`;

    for (const row of parsed.rows) {
      const hints: CompanyHints = {
        merchantName: row.merchantName,
        merchantDocument: row.merchantDocument,
        orderReference: row.orderReference,
        fileName: table.name,
      };
      const match = identifyCompany(hints, index);
      const rawRow = raw[row.line - 1];
      if (match.kind === 'UNKNOWN') {
        later.push({ file: table.name, line: row.line, medId: row.medId, hints, fileKey, header, rawRow });
      } else {
        place(match, hints, fileKey, header, rawRow);
      }
    }
  });

  // Segunda passada: o que o próprio lote ensinou (o CNPJ que veio junto do
  // nome numa linha, o prefixo que a empresa usa) vale para as linhas que só
  // trouxeram isso. Empresa nova entra como conta provisória pela chave.
  if (later.length > 0) {
    const firstPass = learnAliases(learnRows, index);
    const provisional = buildCompanyIndex([
      ...accounts.map((account) => ({ ...account, aliases: [...account.aliases, ...(firstPass.get(account.id) ?? [])] })),
      ...[...buckets.values()]
        .filter((bucket) => bucket.group.isNew)
        .map((bucket) => ({ id: bucket.group.key, name: bucket.group.name, aliases: firstPass.get(bucket.group.key) ?? [] })),
    ]);
    for (const item of later) {
      const match = identifyCompany({ ...item.hints, merchantName: null, fileName: null }, provisional);
      if (match.kind !== 'ACCOUNT') {
        unknown.push({ file: item.file, line: item.line, medId: item.medId });
        continue;
      }
      const isProvisional = match.accountId.startsWith('novo:');
      const bucket = isProvisional ? buckets.get(match.accountId) : undefined;
      if (bucket) {
        bucket.group.rows += 1;
        if (item.rawRow) {
          const entry = bucket.byFile.get(item.fileKey) ?? { header: item.header, rows: [] };
          entry.rows.push(item.rawRow);
          bucket.byFile.set(item.fileKey, entry);
        }
      } else {
        place(match, item.hints, item.fileKey, item.header, item.rawRow);
      }
    }
  }

  const learned = learnAliases(learnRows, index);
  const groups = [...buckets.values()].map(({ group, byFile }) => {
    for (const { header, rows } of byFile.values()) {
      for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
        group.chunks.push(toCsv([header, ...rows.slice(start, start + CHUNK_ROWS)]));
      }
    }
    group.learned = learned.get(group.key) ?? [];
    return group;
  });
  // Empresas que já existem primeiro; depois as novas; maior volume antes.
  groups.sort((a, b) => Number(a.isNew) - Number(b.isNew) || b.rows - a.rows);
  return { groups, unknown, files };
}

/**
 * Cria as empresas novas (modelo automático, com a cor proposta) e grava os
 * apelidos aprendidos. Devolve, por grupo, a conta onde os MEDs vão entrar.
 */
export async function applyMasterGroups(
  groups: {
    key: string;
    accountId: string | null;
    name: string;
    brandColor: string | null;
    brandLayout: AutoLayout | null;
    learned: string[];
  }[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const group of groups) {
    if (group.accountId) {
      await addAccountAliases(group.accountId, group.learned);
      result[group.key] = group.accountId;
      continue;
    }
    // Outra aba ou outra pessoa pode ter criado a empresa no meio do caminho.
    const existing = (await listAccounts()).find(
      (account) => account.name.trim().toLowerCase() === group.name.trim().toLowerCase(),
    );
    if (existing) {
      await addAccountAliases(existing.id, group.learned);
      result[group.key] = existing.id;
      continue;
    }
    const created = await createAccount({
      name: group.name,
      skin: 'auto',
      brandColor: group.brandColor,
      brandLayout: group.brandLayout,
      aliases: group.learned,
    });
    result[group.key] = created.id;
  }
  return result;
}

export async function importMasterChunk(base: AuthContext, accountId: string, csv: string) {
  const { auth } = await masterAuthFor(base, accountId);
  const parsed = parseMedImport(csv);
  if (parsed.fatalError) throw new ValidationError(parsed.fatalError);
  const report = await importParsedMeds(auth, parsed);
  return {
    created: report.created,
    duplicated: report.duplicated,
    skipped: report.skipped,
    failed: report.failed,
    problems: report.results
      .filter((result) => result.outcome === 'SKIPPED' || result.outcome === 'FAILED')
      .slice(0, 50)
      .map((result) => ({ line: result.line, medId: result.medId, message: result.messages.join(' ') })),
  };
}

// ---------------------------------------------------------------------------
// 2. Envios: cada linha na empresa que tem aquele MED
// ---------------------------------------------------------------------------

export interface MasterDeliveryCompany {
  accountId: string;
  name: string;
  recorded: number;
  receipts: number;
  invalid: number;
  lines: DeliveryImportLine[];
}

export interface MasterDeliveryResult {
  companies: MasterDeliveryCompany[];
  /** Linhas que não acharam MED em nenhuma empresa. */
  unmatched: DeliveryImportLine[];
}

export async function importMasterDeliveries(
  base: AuthContext,
  texts: string[],
  options: { generateReceipts: boolean; replacePreviousReceipts: boolean },
): Promise<MasterDeliveryResult> {
  const accounts = await listAccounts();
  const companies: MasterDeliveryCompany[] = [];
  const unmatchedCount = new Map<string, { line: DeliveryImportLine; count: number }>();
  let processed = 0;

  for (const account of accounts) {
    const auth: AuthContext = { ...base, organizationId: account.id };
    // Empresa sem MED não tem onde registrar envio: nem entra na conta.
    if ((await listMeds(auth, {})).length === 0) continue;
    processed += 1;

    const arquivos = splitArksFiles(texts);
    const arks =
      arquivos.eventos.length + arquivos.pedidos.length > 0
        ? await importArksFiles(auth, arquivos, options)
        : null;
    const comum =
      arquivos.outros.length > 0
        ? await importDeliveryLog(auth, arquivos.outros, { ...options, receiptTemplate: 'AUTO' })
        : null;
    const report = arks && comum ? mergeReports(arks, comum) : (arks ?? comum);
    if (!report) continue;

    const matched = report.lines.filter((line) => line.kind !== 'UNMATCHED');
    for (const line of report.lines.filter((candidate) => candidate.kind === 'UNMATCHED')) {
      const key = `${line.line}|${line.medId ?? ''}`;
      const entry = unmatchedCount.get(key) ?? { line, count: 0 };
      entry.count += 1;
      unmatchedCount.set(key, entry);
    }
    if (matched.length === 0) continue;
    companies.push({
      accountId: account.id,
      name: account.name,
      recorded: report.recorded,
      receipts: report.receipts,
      invalid: matched.filter((line) => line.kind === 'INVALID').length,
      lines: matched,
    });
  }

  // Só é "sem MED" a linha que nenhuma empresa reconheceu.
  const unmatched = [...unmatchedCount.values()]
    .filter((entry) => entry.count === processed)
    .map((entry) => entry.line)
    .sort((a, b) => a.line - b.line);
  return { companies, unmatched };
}

// ---------------------------------------------------------------------------
// 3. Lote de defesa
// ---------------------------------------------------------------------------

const CLOSED: MedStatus[] = ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

export interface MasterLotItem {
  accountId: string;
  accountName: string;
  id: string;
  medId: string;
  deadline: string | null;
}

/** MEDs ainda em aberto, abertos no período, de cada empresa escolhida. */
export async function listMasterLot(
  base: AuthContext,
  input: { from: string | null; to: string | null; accountIds: string[] },
): Promise<MasterLotItem[]> {
  const accounts = (await listAccounts()).filter((account) => input.accountIds.includes(account.id));
  const items: MasterLotItem[] = [];
  for (const account of accounts) {
    const rows = await listMeds(
      { ...base, organizationId: account.id },
      {
        openedFrom: input.from ? `${input.from}T00:00:00.000Z` : undefined,
        openedTo: input.to ? `${input.to}T23:59:59.999Z` : undefined,
      },
    );
    for (const row of rows) {
      if (CLOSED.includes(row.med.status)) continue;
      items.push({
        accountId: account.id,
        accountName: account.name,
        id: row.med.id,
        medId: row.med.medId,
        deadline: row.med.responseDeadlineAt ?? null,
      });
    }
  }
  // Prazo mais curto primeiro; sem prazo no fim.
  return items.sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
}

export interface MasterLotResult {
  id: string;
  medId: string;
  endToEndId: string | null;
  amountLabel: string;
  deadline: string | null;
  status: MedStatus;
  score: number | null;
  defenseVersion: number | null;
  /** Evidências obrigatórias que faltam, pelo nome. */
  missing: string[];
  /** Vai para o ZIP: pronto para envio, ou com o registro de envio ao comprador. */
  include: boolean;
  receipts: { evidenceId: string; receipt: CommunicationReceipt; sourceReference: string | null }[];
  error: string | null;
}

/**
 * Gera a defesa de cada MED do bloco e devolve o que o ZIP precisa.
 *
 * Entra no ZIP o caso pronto para envio ou o que já tem o registro de que o
 * comprador recebeu a comunicação — a prova central. O resto vai para a lista
 * de pendências com o que falta: defesa sem prova não é enviada por engano.
 */
export async function generateMasterChunk(
  base: AuthContext,
  accountId: string,
  ids: string[],
): Promise<MasterLotResult[]> {
  const { auth } = await masterAuthFor(base, accountId);
  const results: MasterLotResult[] = [];
  for (const id of ids) {
    try {
      const defense = await generateDefenseForMed(auth, id, { useLlm: false });
      const medCase = await getCase(auth, id);
      const receipts = medCase.evidences
        .filter((evidence) => evidence.type === 'DELIVERY_COMMUNICATION')
        .map((evidence) => {
          const receipt = parseCommunicationReceipt(evidence.value);
          return receipt ? { evidenceId: evidence.id, receipt, sourceReference: evidence.sourceReference ?? null } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      const missing = defense.missingEvidences
        .filter((evidence) => evidence.necessity === 'REQUIRED')
        .map((evidence) => evidence.label);
      results.push({
        id,
        medId: medCase.med.medId,
        endToEndId: resolveEndToEndId(medCase),
        amountLabel: formatAmount(medCase.med.amount, medCase.med.currency),
        deadline: medCase.med.responseDeadlineAt ?? null,
        status: medCase.med.status,
        score: defense.score.max > 0 ? Math.round((defense.score.total / defense.score.max) * 100) : null,
        defenseVersion: defense.version,
        missing,
        include: medCase.med.status === 'READY_TO_SUBMIT' || receipts.length > 0,
        receipts,
        error: null,
      });
    } catch (error) {
      results.push({
        id,
        medId: id,
        endToEndId: null,
        amountLabel: '',
        deadline: null,
        status: 'RECEIVED',
        score: null,
        defenseVersion: null,
        missing: [],
        include: false,
        receipts: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
  return results;
}

/** Declara enviados os MEDs que o operador mandou. */
export async function markMasterSubmitted(base: AuthContext, accountId: string, ids: string[]): Promise<number> {
  const { auth } = await masterAuthFor(base, accountId);
  let done = 0;
  for (const id of ids) {
    try {
      await setMedOutcome(auth, id, 'SUBMITTED');
      done += 1;
    } catch {
      // Caso que não aceita o desfecho fica como está; a fila mostra.
    }
  }
  return done;
}

// ---------------------------------------------------------------------------
// Visão de cima: os números de cada empresa
// ---------------------------------------------------------------------------

export interface MasterCompanyOverview {
  id: string;
  name: string;
  skin: SkinId;
  brandColor: string | null;
  brandLayout: AutoLayout | null;
  aliases: number;
  open: number;
  /** Prazo em até 72h (a mesma janela da visão "Vencendo" da fila). */
  dueSoon: number;
  ready: number;
  blocked: number;
}

const OPEN: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];

export async function masterOverview(base: AuthContext, now = new Date()): Promise<MasterCompanyOverview[]> {
  const accounts = await listAccounts();
  const out: MasterCompanyOverview[] = [];
  for (const account of accounts) {
    const rows = await listMeds({ ...base, organizationId: account.id }, {});
    const open = rows.filter((row) => OPEN.includes(row.med.status));
    const dueSoon = open.filter((row) => {
      const deadline = Date.parse(row.med.responseDeadlineAt ?? '');
      return !Number.isNaN(deadline) && deadline - now.getTime() <= 72 * 3600 * 1000;
    }).length;
    out.push({
      id: account.id,
      name: account.name,
      skin: account.skin,
      brandColor: account.brandColor,
      brandLayout: account.brandLayout,
      aliases: account.aliases.length,
      open: open.length,
      dueSoon,
      ready: rows.filter((row) => row.med.status === 'READY_TO_SUBMIT').length,
      blocked: rows.filter((row) => row.med.status === 'MISSING_EVIDENCE').length,
    });
  }
  return out;
}
