import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests, getRepository } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import {
  connectorStatus,
  deleteConnectorCredential,
  readConnectorCredential,
  saveConnectorCredential,
} from '@/services/credentialService';

const TOKEN = '1//0hXP1eQgbcHOKCgYIARAAGBESNwF-exemplo-de-refresh-token';
const owner: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };
const other: AuthContext = { organizationId: 'org_b', role: 'OWNER', actor: 'teste' };

let previousKey: string | undefined;

beforeEach(() => {
  previousKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
  __setRepositoryForTests(new InMemoryMedRepository());
});

afterEach(() => {
  if (previousKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = previousKey;
  __setRepositoryForTests(null);
});

describe('credencial de conector', () => {
  it('devolve o segredo que foi guardado', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN, accountLabel: 'a@b.com' });
    const read = await readConnectorCredential('org_a', 'GMAIL');
    expect(read?.secret).toBe(TOKEN);
    expect(read?.accountLabel).toBe('a@b.com');
  });

  it('nunca entrega o valor claro ao repositorio', async () => {
    // A propriedade central: quem faz backup, dump ou replica do banco nao le
    // a caixa de e-mail de ninguem.
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN });
    const repository = await getRepository();
    const row = await repository.getCredential('org_a', 'GMAIL');
    expect(row).not.toBeNull();
    expect(row?.secret).not.toContain(TOKEN);
    expect(JSON.stringify(row)).not.toContain(TOKEN);
  });

  it('nao vaza credencial entre organizacoes', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN });
    expect(await readConnectorCredential('org_b', 'GMAIL')).toBeNull();
    expect((await connectorStatus('org_b', 'GMAIL')).connected).toBe(false);
  });

  it('reconectar substitui, em vez de acumular', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: 'antigo' });
    await saveConnectorCredential(owner, 'GMAIL', { secret: 'novo' });
    expect((await readConnectorCredential('org_a', 'GMAIL'))?.secret).toBe('novo');
  });

  it('o estado para a tela nao abre o envelope', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN, accountLabel: 'a@b.com' });
    const status = await connectorStatus('org_a', 'GMAIL');
    expect(status).toEqual({
      connected: true,
      accountLabel: 'a@b.com',
      connectedAt: expect.any(String),
    });
    expect(JSON.stringify(status)).not.toContain(TOKEN);
  });

  it('desconectar apaga so a credencial daquela organizacao', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN });
    await saveConnectorCredential(other, 'GMAIL', { secret: TOKEN });
    expect(await deleteConnectorCredential(owner, 'GMAIL')).toBe(true);
    expect(await readConnectorCredential('org_a', 'GMAIL')).toBeNull();
    expect(await readConnectorCredential('org_b', 'GMAIL')).not.toBeNull();
  });

  it('quem nao pode ligar conector nao liga nem desliga', async () => {
    const analyst: AuthContext = { organizationId: 'org_a', role: 'ANALYST', actor: 'teste' };
    await expect(
      saveConnectorCredential(analyst, 'GMAIL', { secret: TOKEN }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteConnectorCredential(analyst, 'GMAIL')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('chave trocada falha alto, em vez de entregar lixo', async () => {
    await saveConnectorCredential(owner, 'GMAIL', { secret: TOKEN });
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
    await expect(readConnectorCredential('org_a', 'GMAIL')).rejects.toThrow(
      /chave trocada ou conteúdo adulterado/,
    );
  });
});
