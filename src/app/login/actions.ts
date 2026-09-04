'use server';

import { timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/env';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, sessionExpiry, signSession, SESSION_TTL_SECONDS } from '@/lib/session';
import type { SignInState } from '@/components/ui/sign-in';
import { checkThrottle, clearFailures, recordFailure } from '@/services/loginThrottle';

/**
 * Entrada no console.
 *
 * Uma única mensagem de erro para usuário errado, senha errada e login
 * desligado: distinguir os casos só ajuda quem está tentando adivinhar. O
 * `verifyPassword` compara em tempo constante, e nada além do cookie assinado
 * atravessa a fronteira.
 */

const GENERIC_ERROR = 'Usuário ou senha inválidos.';

/** Comparacao em tempo constante, para o nome nao vazar caractere a caractere. */
function sameUser(typed: string, expected: string): boolean {
  const a = Buffer.from(typed, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * De onde veio a tentativa.
 *
 * `x-forwarded-for` e escrito pelo proxy da Vercel, e o primeiro endereco da
 * lista e o do cliente. Sem cabecalho, contamos tudo num balde so: e pior para
 * quem esta legitimamente tentando, e melhor do que nao contar nada.
 */
async function originKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || store.get('x-real-ip')?.trim();
  return `login:${ip || 'desconhecido'}`;
}

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

  const key = await originKey();
  const throttle = await checkThrottle(key);
  if (throttle.blocked) {
    // Mensagem diferente, mas que nao diz nada sobre a credencial: quem esta
    // adivinhando ja sabe que errou muito, e quem e da casa precisa entender
    // por que a senha certa parou de funcionar.
    return {
      attempt,
      user,
      error: `Muitas tentativas. Tente de novo em ${Math.ceil(throttle.retryAfterSeconds / 60)} min.`,
    };
  }

  if (user.length === 0 || password.length === 0) return failure;
  // O nome so e exigido quando ADMIN_USER existe. Sem ele, o campo identifica
  // quem esta no teclado para a auditoria — e isso esta dito na tela.
  if (config.auth.user !== null && !sameUser(user, config.auth.user)) {
    await recordFailure(key);
    return failure;
  }
  if (!(await verifyPassword(password, passwordHash))) {
    await recordFailure(key);
    return failure;
  }

  await clearFailures(key);
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
