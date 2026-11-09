import { cookies } from 'next/headers';
import { getRepository } from '@/infra/container';
import type { AccountRecord } from '@/infra/repositories/types';
import { getConfig } from '@/lib/env';
import { ValidationError } from '@/services/errors';
import { resolveSkin, type SkinId } from '@/config/skins';
import { pickBrandColor } from '@/domain/master/company';

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
  /** Como a conta Master reconhece a empresa: "nome:…", "doc:…", "prefixo:…". */
  aliases: string[];
  /** Cor da marca do modelo automático; nulo nos ambientes desenhados. */
  brandColor: string | null;
}

const DEFAULT_ACCOUNT_NAME = 'Jade';

function toAccount(record: AccountRecord, defaultId: string): Account {
  const isDefault = record.id === defaultId;
  // A organização padrão nasceu com o próprio id como nome.
  const name = isDefault && record.name === record.id ? DEFAULT_ACCOUNT_NAME : record.name;
  return {
    id: record.id,
    name,
    skin: resolveSkin(record.skin),
    isDefault,
    aliases: record.aliases ?? [],
    brandColor: record.brandColor ?? null,
  };
}

export async function listAccounts(): Promise<Account[]> {
  const defaultId = getConfig().organizationId;
  const repository = await getRepository();
  const records = await repository.listAccounts();
  const accounts = records.map((record) => toAccount(record, defaultId));
  if (!accounts.some((account) => account.isDefault)) {
    accounts.unshift({
      id: defaultId,
      name: DEFAULT_ACCOUNT_NAME,
      skin: 'jade',
      isDefault: true,
      aliases: [],
      brandColor: null,
    });
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

export async function createAccount(input: {
  name: string;
  skin: string;
  aliases?: string[];
  brandColor?: string | null;
}): Promise<Account> {
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

  const skin = resolveSkin(input.skin);
  // Modelo automático: cada empresa com uma cor que as outras não usam.
  const brandColor =
    input.brandColor ?? (skin === 'auto' ? pickBrandColor(accounts.map((account) => account.brandColor)) : null);
  const repository = await getRepository();
  const saved = await repository.saveAccount({
    id,
    name,
    skin,
    aliases: normalizeAliases(input.aliases ?? []),
    brandColor,
  });
  return toAccount(saved, getConfig().organizationId);
}

/** Sem repetidos nem vazios, na ordem em que vieram. */
function normalizeAliases(aliases: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of aliases) {
    const alias = raw.trim();
    const key = alias.toLowerCase();
    if (!alias || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

/**
 * Troca os apelidos da conta (como a Master a reconhece). A conta padrão pode
 * ainda não ter linha no banco: nasce aqui com o próprio id como nome, como
 * sempre foi.
 */
export async function setAccountAliases(accountId: string, aliases: string[]): Promise<Account> {
  const account = (await listAccounts()).find((candidate) => candidate.id === accountId);
  if (!account) throw new ValidationError('Conta não encontrada.');
  const repository = await getRepository();
  // Nome e ambiente como estão gravados — não como a tela os mostra.
  const record = (await repository.listAccounts()).find((candidate) => candidate.id === accountId);
  const saved = await repository.saveAccount({
    id: account.id,
    name: record?.name ?? account.id,
    skin: record?.skin ?? null,
    aliases: normalizeAliases(aliases),
  });
  return toAccount(saved, getConfig().organizationId);
}

/** Acrescenta apelidos aprendidos sem apagar os que já existiam. */
export async function addAccountAliases(accountId: string, aliases: string[]): Promise<void> {
  const account = (await listAccounts()).find((candidate) => candidate.id === accountId);
  if (!account || aliases.length === 0) return;
  const merged = normalizeAliases([...account.aliases, ...aliases]);
  if (merged.length === account.aliases.length) return;
  await setAccountAliases(accountId, merged);
}

/** Nome de quem envia as comunicações da conta — vai no comprovante. */
export async function senderNameFor(organizationId: string): Promise<string | null> {
  const account = (await listAccounts()).find((candidate) => candidate.id === organizationId);
  if (!account || account.isDefault) return null;
  return account.name;
}
