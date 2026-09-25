import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import type { AuthContext } from '@/infra/auth/context';
import { createMed, getCase, listAudit } from '@/services/medService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

// A acao e um Server Action: `revalidatePath` so existe dentro do request do
// Next, e sem este mock o modulo derruba o teste antes de rodar nada.
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/infra/auth/context', async (original) => ({
  ...(await original<typeof import('@/infra/auth/context')>()),
  serverPageContext: () => auth,
}));

const { batchSetMedOutcomeAction } = await import('@/app/(console)/meds/actions');

async function novoMed(medId: string) {
  return createMed(auth, {
    medId,
    amount: 34990,
    currency: 'BRL',
    openedAt: '2026-09-01T12:00:00.000Z',
    responseDeadlineAt: '2099-01-01T12:00:00.000Z',
    reason: 'PRODUCT_NOT_RECEIVED',
    payer: {},
  });
}

function form(ids: string[], outcome: string | null) {
  const data = new FormData();
  data.set('medIds', JSON.stringify(ids));
  if (outcome !== null) data.set('outcome', outcome);
  return data;
}

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('desfecho declarado em lote', () => {
  it('marca todos os selecionados de uma vez', async () => {
    const a = await novoMed('MED-1');
    const b = await novoMed('MED-2');
    const c = await novoMed('MED-3');

    await batchSetMedOutcomeAction(form([a.id, b.id], 'SUBMITTED'));

    expect((await getCase(auth, a.id)).med.status).toBe('SUBMITTED');
    expect((await getCase(auth, b.id)).med.status).toBe('SUBMITTED');
    // Nao selecionado nao muda: a acao le a selecao, nao a fila inteira.
    expect((await getCase(auth, c.id)).med.status).not.toBe('SUBMITTED');
  });

  it('registra cada mudanca na auditoria como declaracao do operador', async () => {
    const a = await novoMed('MED-1');
    await batchSetMedOutcomeAction(form([a.id], 'SUBMITTED'));

    // O log ja tem uma mudanca de status vinda do motor (a abertura recalcula),
    // e ela leva `SYSTEM_DERIVED`. A declarada e a unica `MANUAL`: e a origem
    // que separa o que o operador afirmou do que o motor concluiu.
    const log = await listAudit(auth, a.id);
    const declaradas = log.filter(
      (row) => row.action === 'MED_STATUS_CHANGED' && row.source === 'MANUAL',
    );
    expect(declaradas).toHaveLength(1);
    expect(declaradas.at(0)?.newValue).toBe('SUBMITTED');
    expect(declaradas.at(0)?.previousValue).toBe('MISSING_EVIDENCE');
  });

  it('um caso inelegivel nao trava o resto do lote', async () => {
    const a = await novoMed('MED-1');
    const b = await novoMed('MED-2');

    await batchSetMedOutcomeAction(form([a.id, 'med_inexistente', b.id], 'SUBMITTED'));

    expect((await getCase(auth, a.id)).med.status).toBe('SUBMITTED');
    expect((await getCase(auth, b.id)).med.status).toBe('SUBMITTED');
  });

  it('AUTOMATICO reabre o lote e devolve o status ao calculo', async () => {
    const a = await novoMed('MED-1');
    await batchSetMedOutcomeAction(form([a.id], 'REJECTED'));
    expect((await getCase(auth, a.id)).med.status).toBe('REJECTED');

    await batchSetMedOutcomeAction(form([a.id], 'AUTOMATICO'));
    expect((await getCase(auth, a.id)).med.status).not.toBe('REJECTED');
  });

  it('campo de desfecho ausente nao reabre o lote', async () => {
    const a = await novoMed('MED-1');
    await batchSetMedOutcomeAction(form([a.id], 'SUBMITTED'));

    // Formulario truncado: sem este corte, vazio viraria "voltar ao automatico"
    // e um envio incompleto apagaria o desfecho de todo o lote.
    await batchSetMedOutcomeAction(form([a.id], null));
    expect((await getCase(auth, a.id)).med.status).toBe('SUBMITTED');

    await batchSetMedOutcomeAction(form([a.id], ''));
    expect((await getCase(auth, a.id)).med.status).toBe('SUBMITTED');
  });

  it('status que o sistema calcula nao vira desfecho declarado', async () => {
    const a = await novoMed('MED-1');
    const antes = (await getCase(auth, a.id)).med.status;

    await batchSetMedOutcomeAction(form([a.id], 'READY_TO_SUBMIT'));

    expect((await getCase(auth, a.id)).med.status).toBe(antes);
  });
});
