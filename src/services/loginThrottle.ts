/**
 * Limite de tentativas de login.
 *
 * O console tem uma senha unica, exposta na internet. Sem limite, ela cai por
 * forca bruta — scrypt encarece cada palpite, mas nao impede milhoes deles.
 *
 * A contagem vive no banco porque cada instancia serverless tem a propria
 * memoria: um contador em processo zera sozinho e nao segura nada.
 */

import { getRepository } from '@/infra/container';

/** Janela de contagem. Passada ela, o contador recomeca. */
export const WINDOW_SECONDS = 15 * 60;
/** Falhas toleradas na janela antes de bloquear. */
export const MAX_FAILURES = 8;

export interface ThrottleState {
  blocked: boolean;
  /** Segundos que faltam para liberar. Zero quando nao esta bloqueado. */
  retryAfterSeconds: number;
}

function windowExpired(startedAt: string, now: Date): boolean {
  return now.getTime() - new Date(startedAt).getTime() >= WINDOW_SECONDS * 1000;
}

/** Esta origem pode tentar agora? Nao grava nada. */
export async function checkThrottle(key: string, now = new Date()): Promise<ThrottleState> {
  const repository = await getRepository();
  const record = await repository.getLoginAttempt(key);
  if (!record || windowExpired(record.windowStartedAt, now) || record.count < MAX_FAILURES) {
    return { blocked: false, retryAfterSeconds: 0 };
  }
  const elapsed = (now.getTime() - new Date(record.windowStartedAt).getTime()) / 1000;
  return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(WINDOW_SECONDS - elapsed)) };
}

/** Registra uma falha e devolve o estado resultante. */
export async function recordFailure(key: string, now = new Date()): Promise<ThrottleState> {
  const repository = await getRepository();
  const record = await repository.getLoginAttempt(key);
  const fresh = !record || windowExpired(record.windowStartedAt, now);
  const count = fresh ? 1 : record.count + 1;
  const windowStartedAt = fresh ? now.toISOString() : record.windowStartedAt;
  await repository.saveLoginAttempt({ key, count, windowStartedAt });

  if (count < MAX_FAILURES) return { blocked: false, retryAfterSeconds: 0 };
  const elapsed = (now.getTime() - new Date(windowStartedAt).getTime()) / 1000;
  return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(WINDOW_SECONDS - elapsed)) };
}

/** Entrou: o contador desta origem zera. */
export async function clearFailures(key: string): Promise<void> {
  const repository = await getRepository();
  await repository.clearLoginAttempt(key);
}
