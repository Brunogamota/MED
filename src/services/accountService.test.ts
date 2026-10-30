import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { getConfig } from '@/lib/env';
import { createAccount, listAccounts, senderNameFor } from '@/services/accountService';
import { createMed, listMeds } from '@/services/medService';
import { draftCommunication } from '@/domain/communication/receipt';

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('contas', () => {
  it('a conta principal existe antes de qualquer cadastro', async () => {
    const accounts = await listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ id: getConfig().organizationId, skin: 'jade', isDefault: true });
  });

  it('cria a conta com ambiente próprio e não repete nome', async () => {
    const bulls = await createAccount({ name: 'Bulls Cash', skin: 'bulls' });
    expect(bulls).toMatchObject({ id: 'org_bulls-cash', name: 'Bulls Cash', skin: 'bulls', isDefault: false });
    await expect(createAccount({ name: 'bulls cash', skin: 'bulls' })).rejects.toThrow(/Já existe/);
    expect((await listAccounts()).map((a) => a.name)).toEqual(['Jade', 'Bulls Cash']);
  });

  it('cria a conta com o ambiente Marketplace Verificado', async () => {
    const conta = await createAccount({ name: 'Marketplace Verificado', skin: 'marketplace' });
    expect(conta).toMatchObject({ name: 'Marketplace Verificado', skin: 'marketplace', isDefault: false });
  });

  it('ambiente desconhecido cai no padrão', async () => {
    const conta = await createAccount({ name: 'Outra', skin: 'nao-existe' });
    expect(conta.skin).toBe('jade');
  });

  it('MED de uma conta não aparece na outra', async () => {
    const bulls = await createAccount({ name: 'Bulls Cash', skin: 'bulls' });
    const jade = getConfig().organizationId;
    await createMed(
      { organizationId: bulls.id, role: 'OWNER', actor: 'teste' },
      {
        medId: 'MED-BULLS-1',
        amount: 10,
        currency: 'BRL',
        openedAt: '2026-10-01T12:00:00.000Z',
        reason: 'FRAUD_SCAM',
        payer: { name: 'Fulano' },
      },
    );
    const naBulls = await listMeds({ organizationId: bulls.id, role: 'OWNER', actor: 't' }, {});
    const naJade = await listMeds({ organizationId: jade, role: 'OWNER', actor: 't' }, {});
    expect(naBulls.map((row) => row.med.medId)).toEqual(['MED-BULLS-1']);
    expect(naJade.map((row) => row.med.medId)).not.toContain('MED-BULLS-1');
  });

  it('o comprovante sai com o nome da conta como remetente', async () => {
    const bulls = await createAccount({ name: 'Bulls Cash', skin: 'bulls' });
    expect(await senderNameFor(bulls.id)).toBe('Bulls Cash');
    expect(await senderNameFor(getConfig().organizationId)).toBeNull();
  });
});

describe('remetente do rascunho', () => {
  it('usa o remetente informado', () => {
    const medCase = {
      med: { payer: { name: 'Ana Souza' }, transactionAt: null },
      customer: null,
      order: null,
      digitalDelivery: null,
      tracking: null,
      evidences: [],
    } as unknown as Parameters<typeof draftCommunication>[0];
    expect(draftCommunication(medCase, 'ORDER_TRACKING', { sender: 'Bulls Cash' }).from).toBe('Bulls Cash');
  });
});
