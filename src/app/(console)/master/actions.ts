'use server';

import { revalidatePath } from 'next/cache';
import { serverPageContext } from '@/infra/auth/context';
import { openAsNamedTexts, type NamedTable } from '@/lib/uploads';
import { ValidationError } from '@/services/errors';
import {
  applyMasterGroups,
  generateMasterChunk,
  importMasterChunk,
  importMasterDeliveries,
  listMasterLot,
  markMasterSubmitted,
  previewMasterImport,
  type MasterDeliveryResult,
  type MasterLotItem,
  type MasterLotResult,
  type MasterPreview,
} from '@/services/masterService';

/**
 * Ações da conta Master. Cada uma recebe a conta-alvo explícita e o serviço a
 * confere contra as contas que existem antes de agir com o contexto dela.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ValidationError) return { ok: false, error: error.message };
  return { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido.' };
}

async function readTables(form: FormData): Promise<Result<NamedTable[]>> {
  const tables: NamedTable[] = [];
  for (const entry of form.getAll('file')) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const opened = await openAsNamedTexts(entry, { everyTab: true });
    if (!opened.ok) return opened;
    tables.push(...opened.tables);
  }
  if (tables.length === 0) return { ok: false, error: 'Escolha ao menos um arquivo.' };
  return { ok: true, data: tables };
}

export async function masterPreviewAction(form: FormData): Promise<Result<MasterPreview>> {
  try {
    await serverPageContext();
    const tables = await readTables(form);
    if (!tables.ok) return tables;
    return { ok: true, data: await previewMasterImport(tables.data) };
  } catch (error) {
    return failure(error);
  }
}

export async function masterApplyGroupsAction(
  groups: { key: string; accountId: string | null; name: string; brandColor: string | null; learned: string[] }[],
): Promise<Result<Record<string, string>>> {
  try {
    await serverPageContext();
    const mapping = await applyMasterGroups(groups);
    revalidatePath('/', 'layout');
    return { ok: true, data: mapping };
  } catch (error) {
    return failure(error);
  }
}

export async function masterImportChunkAction(
  accountId: string,
  csv: string,
): Promise<Result<Awaited<ReturnType<typeof importMasterChunk>>>> {
  try {
    return { ok: true, data: await importMasterChunk(await serverPageContext(), accountId, csv) };
  } catch (error) {
    return failure(error);
  }
}

export async function masterDeliveriesAction(form: FormData): Promise<Result<MasterDeliveryResult>> {
  try {
    const base = await serverPageContext();
    const tables = await readTables(form);
    if (!tables.ok) return tables;
    const data = await importMasterDeliveries(
      base,
      tables.data.map((table) => table.text),
      {
        generateReceipts: form.get('gerarComprovantes') === 'on',
        replacePreviousReceipts: form.get('substituirComprovantes') === 'on',
      },
    );
    revalidatePath('/', 'layout');
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function masterLotListAction(input: {
  from: string | null;
  to: string | null;
  accountIds: string[];
}): Promise<Result<MasterLotItem[]>> {
  try {
    return { ok: true, data: await listMasterLot(await serverPageContext(), input) };
  } catch (error) {
    return failure(error);
  }
}

export async function masterGenerateChunkAction(
  accountId: string,
  ids: string[],
): Promise<Result<MasterLotResult[]>> {
  try {
    return { ok: true, data: await generateMasterChunk(await serverPageContext(), accountId, ids.slice(0, 20)) };
  } catch (error) {
    return failure(error);
  }
}

export async function masterMarkSubmittedAction(accountId: string, ids: string[]): Promise<Result<number>> {
  try {
    const done = await markMasterSubmitted(await serverPageContext(), accountId, ids);
    revalidatePath('/', 'layout');
    return { ok: true, data: done };
  } catch (error) {
    return failure(error);
  }
}
