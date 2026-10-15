import { cookies } from 'next/headers';
import { getRepository } from '@/infra/container';
import type { AccountRecord } from '@/infra/repositories/types';
import { getConfig } from '@/lib/env';
import { ValidationError } from '@/services/errors';
import { resolveSkin, type SkinId } from '@/config/skins';

/**
 * Contas do console.
 *
 * Uma conta é uma organização: o `organizationId` que já isola cada consulta
 * do repositório. Trocar de conta troca o tenant de tudo — fila, evidência,
 * comprovante, integração. Nada de uma conta aparece na outra.
 *
 * A conta padrão é a organização configurada no ambiente (`ORGANIZATION_ID`),
 * a que sempre existiu. Ela aparece mesmo antes de ter linha no banco.
 */

export const ACCOUNT_COOKIE = 'med_conta';

export interface Account {
  id: string;
  name: string;
  skin: SkinId;
  isDefault: boolean;
}

const DEFAULT_ACCOUNT_NAME = 'Jade';

function toAccount(record: AccountRecord, defaultId: string): Account {
  const isDefault = record.id === defaultId;
  // A organização padrão nasceu com o próprio id como nome.
  const name = isDefault && record.name === record.id ? DEFAULT_ACCOUNT_NAME : record.name;
  return { id: record.id, name, skin: resolveSkin(record.skin), isDefault };
}

export async function listAccounts(): Promise<Account[]> {
  const defaultId = getConfig().organizationId;
  const repository = await getRepository();
  const records = await repository.listAccounts();
  const accounts = records.map((record) => toAccount(record, defaultId));
  if (!accounts.some((account) => account.isDefault)) {
    accounts.unshift({ id: defaultId, name: DEFAULT_ACCOUNT_NAME, skin: 'jade', isDefault: true });
  }
  return accounts.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/**
 * A conta em uso. Vem do cookie, mas só vale se a conta existir: cookie com
 * id inventado cai na conta padrão, nunca numa organização que ninguém criou.
 */
export async function getActiveAccount(): Promise<Account> {
  const accounts = await listAccounts();
  const chosen = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  const fallback = accounts.find((account) => account.isDefault) ?? accounts[0];
  if (!fallback) throw new Error('Nenhuma conta disponível');
  return accounts.find((account) => account.id === chosen) ?? fallback;
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function createAccount(input: { name: string; skin: string }): Promise<Account> {
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError('Dê um nome à conta.');
  const slug = slugify(name);
  if (!slug) throw new ValidationError('O nome precisa ter letras ou números.');

  const accounts = await listAccounts();
  if (accounts.some((account) => account.name.toLowerCase() === name.toLowerCase())) {
    throw new ValidationError(`Já existe uma conta chamada ${name}.`);
  }
  let id = `org_${slug}`;
  for (let n = 2; accounts.some((account) => account.id === id); n += 1) id = `org_${slug}-${n}`;

  const repository = await getRepository();
  const saved = await repository.saveAccount({ id, name, skin: resolveSkin(input.skin) });
  return toAccount(saved, getConfig().organizationId);
}

/** Nome de quem envia as comunicações da conta — vai no comprovante. */
export async function senderNameFor(organizationId: string): Promise<string | null> {
  const account = (await listAccounts()).find((candidate) => candidate.id === organizationId);
  if (!account || account.isDefault) return null;
  return account.name;
}
