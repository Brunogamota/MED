'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/env';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, sessionExpiry, signSession, SESSION_TTL_SECONDS } from '@/lib/session';
import type { SignInState } from '@/components/ui/sign-in';

/**
 * Entrada no console.
 *
 * Uma única mensagem de erro para usuário errado, senha errada e login
 * desligado: distinguir os casos só ajuda quem está tentando adivinhar. O
 * `verifyPassword` compara em tempo constante, e nada além do cookie assinado
 * atravessa a fronteira.
 */

const GENERIC_ERROR = 'Usuário ou senha inválidos.';

/**
 * Destino pós-login. Só caminho interno: `//evil.com` e `https://evil.com`
 * são URLs para fora, e aceitar qualquer uma delas transformaria o login num
 * redirecionador aberto.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const path = typeof value === 'string' ? value : '';
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

export async function signInAction(
  state: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const config = getConfig();
  const attempt = (state?.attempt ?? 0) + 1;
  const { passwordHash, sessionSecret, enabled } = config.auth;

  if (!enabled || !passwordHash || !sessionSecret) {
    return {
      attempt,
      user: String(formData.get('user') ?? ''),
      error:
        'Login não configurado neste ambiente. Defina ADMIN_PASSWORD_HASH e SESSION_SECRET.',
    };
  }

  const user = String(formData.get('user') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const failure: SignInState = { error: GENERIC_ERROR, user, attempt };
  if (user.length === 0 || password.length === 0) return failure;
  if (!(await verifyPassword(password, passwordHash))) return failure;

  const token = await signSession({ sub: user, exp: sessionExpiry() }, sessionSecret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appEnv !== 'development',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(safeNext(formData.get('next')));
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
