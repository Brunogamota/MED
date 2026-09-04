import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import {
  MAX_FAILURES,
  WINDOW_SECONDS,
  checkThrottle,
  clearFailures,
  recordFailure,
} from '@/services/loginThrottle';

const KEY = 'login:203.0.113.7';
const T0 = new Date('2026-09-04T12:00:00.000Z');
const later = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('limite de tentativas', () => {
  it('deixa passar quem nunca errou', async () => {
    expect(await checkThrottle(KEY, T0)).toEqual({ blocked: false, retryAfterSeconds: 0 });
  });

  it('nao bloqueia antes do limite', async () => {
    for (let i = 0; i < MAX_FAILURES - 1; i += 1) {
      expect((await recordFailure(KEY, T0)).blocked).toBe(false);
    }
  });

  it('bloqueia ao atingir o limite, e diz quanto falta', async () => {
    let state = { blocked: false, retryAfterSeconds: 0 };
    for (let i = 0; i < MAX_FAILURES; i += 1) state = await recordFailure(KEY, T0);
    expect(state.blocked).toBe(true);
    expect(state.retryAfterSeconds).toBe(WINDOW_SECONDS);
  });

  it('o tempo que falta diminui conforme a janela corre', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) await recordFailure(KEY, T0);
    const state = await checkThrottle(KEY, later(600));
    expect(state.blocked).toBe(true);
    expect(state.retryAfterSeconds).toBe(WINDOW_SECONDS - 600);
  });

  it('libera quando a janela passa', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) await recordFailure(KEY, T0);
    expect((await checkThrottle(KEY, later(WINDOW_SECONDS))).blocked).toBe(false);
  });

  it('a janela recomeca depois de expirada, em vez de somar para sempre', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) await recordFailure(KEY, T0);
    const afterWindow = await recordFailure(KEY, later(WINDOW_SECONDS + 1));
    expect(afterWindow.blocked).toBe(false);
  });

  it('entrar zera o contador', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) await recordFailure(KEY, T0);
    await clearFailures(KEY);
    expect((await checkThrottle(KEY, T0)).blocked).toBe(false);
  });

  it('uma origem bloqueada nao bloqueia outra', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) await recordFailure(KEY, T0);
    expect((await checkThrottle('login:198.51.100.2', T0)).blocked).toBe(false);
  });
});
