import type { AuthContext } from '@/infra/auth/context';
import type { CreateMedInput } from '@/domain/schemas';
import { createMedSchema } from '@/domain/schemas';
import { addEvidence, createMedWithOutcome } from '@/services/medService';
import { parseMedImport, type ImportedMedRow, type ParsedImport } from '@/domain/import/csv';
import { assertCan } from '@/infra/auth/rbac';

/**
 * Importação de MEDs em lote.
 *
 * O arquivo da adquirente chega, e cada linha vira um MED. Duas garantias
 * importam aqui:
 *  - idempotência: reimportar o mesmo arquivo não duplica nada, porque o MED e
 *    único por identificador da instituição dentro da organizacao;
 *  - nenhuma linha e "consertada" em silencio. Linha com dado ilegível e
 *    reportada e não entra, para que o operador corrija a origem.
 */

export type ImportOutcome = 'CREATED' | 'DUPLICATE' | 'SKIPPED' | 'FAILED';

export interface ImportRowResult {
  line: number;
  medId: string | null;
  outcome: ImportOutcome;
  /** Id interno, presente quando a linha virou (ou já era) um MED. */
  id: string | null;
  messages: string[];
}

export interface ImportReport {
  total: number;
  created: number;
  duplicated: number;
  skipped: number;
  failed: number;
  results: ImportRowResult[];
}

export interface ImportOptions {
  /**
   * Data de abertura usada apenas nas linhas em que o arquivo não traz essa
   * informação. E o operador quem declara esse valor: o sistema não arbitra uma
   * data de abertura por conta própria.
   */
  defaultOpenedAt?: string;
  /** Referência da origem gravada na procedência das evidências importadas. */
  batchReference?: string;
}

export function toCreateMedInput(
  row: ImportedMedRow,
  options: ImportOptions,
): { input: CreateMedInput } | { errors: string[] } {
  const openedAt = row.openedAt ?? options.defaultOpenedAt ?? null;
  if (!openedAt) {
    return {
      errors: [
        'Data de abertura do MED ausente. Inclua a coluna no arquivo ou informe uma data de abertura para o lote.',
      ],
    };
  }

  const candidate = {
    medId: row.medId ?? undefined,
    transactionId: row.transactionId ?? undefined,
    endToEndId: row.endToEndId ?? undefined,
    pixId: row.pixId ?? undefined,
    amount: row.amount ?? undefined,
    currency: 'BRL',
    transactionAt: row.transactionAt ?? undefined,
    openedAt,
    responseDeadlineAt: row.responseDeadlineAt ?? undefined,
    reason: row.reason,
    reasonDescription: row.reasonDescription ?? undefined,
    requestingInstitution: row.requestingInstitution ?? undefined,
    productType: row.productType ?? undefined,
    merchantName: row.merchantName ?? undefined,
    payer: {
      document: row.payerDocument ?? undefined,
      name: row.payerName ?? undefined,
      email: row.payerEmail ?? undefined,
      phone: row.payerPhone ?? undefined,
    },
  };

  const parsed = createMedSchema.safeParse(candidate);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }
  return { input: parsed.data };
}

async function importRow(
  auth: AuthContext,
  row: ImportedMedRow,
  options: ImportOptions,
): Promise<ImportRowResult> {
  if (row.errors.length > 0) {
    return { line: row.line, medId: row.medId, outcome: 'SKIPPED', id: null, messages: row.errors };
  }

  const built = toCreateMedInput(row, options);
  if ('errors' in built) {
    return { line: row.line, medId: row.medId, outcome: 'SKIPPED', id: null, messages: built.errors };
  }

  try {
    const { med, created } = await createMedWithOutcome(auth, built.input);

    // O número do pedido informado pela adquirente e um dado real do arquivo,
    // entao entra como evidência com a procedência da importação — nunca como
    // um pedido completo, que o operador ainda precisa preencher.
    if (created && row.orderReference) {
      await addEvidence(auth, med.id, {
        type: 'ORDER_RECORD',
        value: row.orderReference,
        source: 'MANUAL',
        sourceReference: options.batchReference ?? 'importação em lote',
        verificationStatus: 'UNVERIFIED',
        metadata: { importedFromLine: row.line },
      });
    }

    return {
      line: row.line,
      medId: med.medId,
      outcome: created ? 'CREATED' : 'DUPLICATE',
      id: med.id,
      messages: created ? [] : ['MED já existia e foi mantido como estava.'],
    };
  } catch (error) {
    return {
      line: row.line,
      medId: row.medId,
      outcome: 'FAILED',
      id: null,
      messages: [error instanceof Error ? error.message : 'Erro desconhecido'],
    };
  }
}

export async function importParsedMeds(
  auth: AuthContext,
  parsed: ParsedImport,
  options: ImportOptions = {},
): Promise<ImportReport> {
  assertCan(auth.role, 'med:write');

  const results: ImportRowResult[] = [];
  // Sequencial de proposito: o volume diario e de dezenas de linhas, e a ordem
  // preservada torna o relatório conferivel contra o arquivo original.
  for (const row of parsed.rows) {
    results.push(await importRow(auth, row, options));
  }

  return {
    total: results.length,
    created: results.filter((result) => result.outcome === 'CREATED').length,
    duplicated: results.filter((result) => result.outcome === 'DUPLICATE').length,
    skipped: results.filter((result) => result.outcome === 'SKIPPED').length,
    failed: results.filter((result) => result.outcome === 'FAILED').length,
    results,
  };
}

export async function importMedsFromText(
  auth: AuthContext,
  text: string,
  options: ImportOptions = {},
): Promise<{ parsed: ParsedImport; report: ImportReport | null }> {
  const parsed = parseMedImport(text);
  if (parsed.fatalError) return { parsed, report: null };
  return { parsed, report: await importParsedMeds(auth, parsed, options) };
}
