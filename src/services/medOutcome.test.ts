import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests, getRepository } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { createMed, setMedOutcome } from '@/services/medService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

async function novoMed(medId = 'MED-1') {
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

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('desfecho declarado', () => {
  it('grava o desfecho e ele sobrevive ao recalculo', async () => {
    const med = await novoMed();
    const updated = await setMedOutcome(auth, med.id, 'ACCEPTED');
    expect(updated.status).toBe('ACCEPTED');

    // O motor recalcula status em toda escrita; o desfecho nao pode sumir.
    const again = await (await getRepository()).getMed('org_a', med.id);
    expect(again?.status).toBe('ACCEPTED');
  });

  it('recusa status que o sistema deriva da evidencia', async () => {
    const med = await novoMed();
    // Deixar alguem declarar "pronto para envio" faria o sistema afirmar o que
    // a evidencia do caso nao sustenta.
    await expect(setMedOutcome(auth, med.id, 'READY_TO_SUBMIT')).rejects.toThrow(
      /nao e um desfecho declaravel/,
    );
  });

  it('voltar ao automatico devolve o status ao calculo', async () => {
    const med = await novoMed();
    await setMedOutcome(auth, med.id, 'REJECTED');
    const reopened = await setMedOutcome(auth, med.id, null);
    expect(reopened.status).not.toBe('REJECTED');
  });

  it('registra na auditoria que foi declarado, e nao calculado', async () => {
    const med = await novoMed();
    await setMedOutcome(auth, med.id, 'SUBMITTED');
    const audit = await (await getRepository()).listAudit('org_a', med.id);
    const entry = audit.find(
      (row) => row.action === 'MED_STATUS_CHANGED' && row.newValue === 'SUBMITTED',
    );
    expect(entry?.source).toBe('MANUAL');
  });

  it('declarar o mesmo desfecho duas vezes nao muda nada', async () => {
    const med = await novoMed();
    await setMedOutcome(auth, med.id, 'SUBMITTED');
    const before = (await (await getRepository()).listAudit('org_a', med.id)).length;
    await setMedOutcome(auth, med.id, 'SUBMITTED');
    const after = (await (await getRepository()).listAudit('org_a', med.id)).length;
    expect(after).toBe(before);
  });

  it('quem so le nao declara desfecho', async () => {
    const med = await novoMed();
    const viewer: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'teste' };
    await expect(setMedOutcome(viewer, med.id, 'ACCEPTED')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('nao alcanca caso de outra organizacao', async () => {
    const med = await novoMed();
    const other: AuthContext = { organizationId: 'org_b', role: 'OWNER', actor: 'teste' };
    await expect(setMedOutcome(other, med.id, 'ACCEPTED')).rejects.toThrow(/não encontrado/);
  });
});

describe('recorte por data de abertura', () => {
  beforeEach(async () => {
    for (const [id, openedAt] of [
      ['MED-AGO', '2026-08-10T12:00:00.000Z'],
      ['MED-SET-01', '2026-09-01T12:00:00.000Z'],
      ['MED-SET-20', '2026-09-20T12:00:00.000Z'],
    ] as const) {
      await createMed(auth, {
        medId: id,
        amount: 1000,
        currency: 'BRL',
        openedAt,
        reason: 'OTHER',
        payer: {},
      });
    }
  });

  const ids = async (filter: Parameters<Awaited<ReturnType<typeof getRepository>>['listMeds']>[1]) =>
    (await (await getRepository()).listMeds('org_a', filter)).map((row) => row.med.medId).sort();

  it('sem recorte, traz tudo', async () => {
    expect(await ids({})).toEqual(['MED-AGO', 'MED-SET-01', 'MED-SET-20']);
  });

  it('recorta pelo inicio', async () => {
    expect(await ids({ openedFrom: '2026-09-01T00:00:00.000Z' })).toEqual([
      'MED-SET-01',
      'MED-SET-20',
    ]);
  });

  it('recorta pelo fim', async () => {
    expect(await ids({ openedTo: '2026-09-01T23:59:59.999Z' })).toEqual(['MED-AGO', 'MED-SET-01']);
  });

  it('o mesmo dia nos dois campos traz o que abriu naquele dia', async () => {
    expect(
      await ids({
        openedFrom: '2026-09-01T00:00:00.000Z',
        openedTo: '2026-09-01T23:59:59.999Z',
      }),
    ).toEqual(['MED-SET-01']);
  });

  it('periodo sem nada devolve vazio, em vez de ignorar o recorte', async () => {
    expect(
      await ids({
        openedFrom: '2026-01-01T00:00:00.000Z',
        openedTo: '2026-01-31T23:59:59.999Z',
      }),
    ).toEqual([]);
  });
});
