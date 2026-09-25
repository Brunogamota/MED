import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import type { AuthContext } from '@/infra/auth/context';
import { createMed, getCase } from '@/services/medService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/infra/auth/context', async (original) => ({
  ...(await original<typeof import('@/infra/auth/context')>()),
  serverPageContext: () => auth,
}));

const { markSubmittedAction } = await import('@/app/(console)/meds/actions');

async function novoMed(medId: string) {
  return createMed(auth, {
    medId,
    amount: 34.8,
    currency: 'BRL',
    openedAt: '2026-09-25T12:00:00.000Z',
    reason: 'FRAUD_SCAM',
    payer: {},
  });
}

function form(ids: string[]) {
  const data = new FormData();
  data.set('medIds', JSON.stringify(ids));
  return data;
}

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('declarar como enviado o lote recem-importado', () => {
  it('marca os casos que a importacao tocou', async () => {
    const a = await novoMed('MED-1');
    const b = await novoMed('MED-2');
    const c = await novoMed('MED-3');

    const state = await markSubmittedAction(null, form([a.id, b.id]));

    expect(state.marked).toBe(2);
    expect((await getCase(auth, a.id)).med.status).toBe('SUBMITTED');
    expect((await getCase(auth, b.id)).med.status).toBe('SUBMITTED');
    expect((await getCase(auth, c.id)).med.status).not.toBe('SUBMITTED');
  });

  it('a conta e dos que entraram de verdade, nao dos que foram pedidos', async () => {
    const a = await novoMed('MED-1');

    const state = await markSubmittedAction(null, form([a.id, 'med_inexistente']));

    expect(state.marked).toBe(1);
  });

  it('lista vazia nao marca nada e diz por que', async () => {
    const state = await markSubmittedAction(null, form([]));

    expect(state.marked).toBe(0);
    expect(state.error).toBeTruthy();
  });
});
