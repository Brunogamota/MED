'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ACCOUNT_COOKIE,
  createAccount,
  listAccounts,
  setAccountAliases,
} from '@/services/accountService';
import { ValidationError } from '@/services/errors';

async function entrar(id: string): Promise<void> {
  (await cookies()).set(ACCOUNT_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Entra numa conta que existe. Id desconhecido não vira conta nova. */
export async function switchAccountAction(form: FormData): Promise<void> {
  const id = String(form.get('conta') ?? '');
  const accounts = await listAccounts();
  if (!accounts.some((account) => account.id === id)) redirect('/contas');
  await entrar(id);
  revalidatePath('/', 'layout');
  redirect('/');
}

export interface CreateAccountState {
  error: string | null;
}

export async function createAccountAction(
  _previous: CreateAccountState | null,
  form: FormData,
): Promise<CreateAccountState> {
  let id: string;
  try {
    const account = await createAccount({
      name: String(form.get('nome') ?? ''),
      skin: String(form.get('ambiente') ?? ''),
    });
    id = account.id;
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  await entrar(id);
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Como a conta Master reconhece a empresa: um apelido por linha. CNPJ e chave
 * Pix com "doc:", prefixo de pedido com "prefixo:"; o resto vale como nome.
 */
export async function saveAccountAliasesAction(form: FormData): Promise<void> {
  const id = String(form.get('conta') ?? '');
  const aliases = String(form.get('apelidos') ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  try {
    await setAccountAliases(id, aliases);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
  revalidatePath('/contas');
}
