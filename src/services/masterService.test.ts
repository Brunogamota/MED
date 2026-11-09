import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import type { AuthContext } from '@/infra/auth/context';
import { createAccount, listAccounts } from '@/services/accountService';
import { listMeds } from '@/services/medService';
import { applyMasterGroups, importMasterChunk, previewMasterImport } from '@/services/masterService';

const base: AuthContext = { organizationId: 'ignorado', role: 'OWNER', actor: 'teste' };

const HEADER = 'ID MED;Valor;Data abertura;Nome;Pedido;Empresa;CNPJ Recebedor';
function linha(n: number, pedido: string, empresa: string, cnpj: string): string {
  const id = `E0000000020261101100${String(n).padStart(2, '0')}abcdefghijk`;
  return [id, '10,00', '02/11/2026 09:00', `Pessoa ${n} Teste`, pedido, empresa, cnpj].join(';');
}

beforeEach(() => __setRepositoryForTests(new InMemoryMedRepository()));
afterEach(() => __setRepositoryForTests(null));

describe('conta Master', () => {
  it('separa por empresa, aprende o prefixo no próprio lote e cria a empresa nova', async () => {
    await createAccount({ name: 'Bulls Cash', skin: 'bulls' });
    const csv = [
      HEADER,
      linha(1, 'BLS-1', 'Bulls Cash', '11.111.111/0001-11'),
      linha(2, 'BLS-2', 'BULLS CASH LTDA', ''),
      linha(3, 'BLS-3', 'Bulls Cash', ''),
      // Só o pedido: cai na Bulls pelo prefixo que as linhas de cima ensinaram.
      linha(4, 'BLS-4', '', ''),
      linha(5, 'AUR-1', 'Loja Aurora', '33.333.333/0001-33'),
      // Sem pista nenhuma: fica de fora.
      linha(6, 'X1', '', ''),
    ].join('\n');

    const preview = await previewMasterImport([{ name: 'misturado.csv', text: csv }]);
    const bulls = preview.groups.find((group) => group.name === 'Bulls Cash');
    const aurora = preview.groups.find((group) => group.name === 'Loja Aurora');
    expect(bulls).toMatchObject({ rows: 4, isNew: false });
    expect(bulls?.learned).toEqual(['doc:11111111000111', 'prefixo:BLS-']);
    expect(aurora).toMatchObject({ rows: 1, isNew: true, skin: 'auto' });
    expect(aurora?.brandColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(preview.unknown).toHaveLength(1);

    const mapping = await applyMasterGroups(preview.groups);
    for (const group of preview.groups) {
      for (const chunk of group.chunks) await importMasterChunk(base, mapping[group.key]!, chunk);
    }

    const accounts = await listAccounts();
    const auroraAccount = accounts.find((account) => account.name === 'Loja Aurora');
    expect(auroraAccount).toMatchObject({ skin: 'auto', brandColor: aurora?.brandColor, brandLayout: aurora?.brandLayout });
    expect(accounts.find((account) => account.name === 'Bulls Cash')?.aliases).toContain('prefixo:BLS-');

    // Cada MED na conta da sua empresa, e só nela.
    const naBulls = await listMeds({ ...base, organizationId: mapping[bulls!.key]! }, {});
    const naAurora = await listMeds({ ...base, organizationId: auroraAccount!.id }, {});
    expect(naBulls).toHaveLength(4);
    expect(naAurora).toHaveLength(1);
  });

  it('duas empresas novas não saem com o mesmo desenho nem a mesma cor', async () => {
    const csv = [HEADER, linha(1, 'A-1', 'Loja Um', ''), linha(2, 'B-1', 'Loja Dois', '')].join('\n');
    const preview = await previewMasterImport([{ name: 'x.csv', text: csv }]);
    const [a, b] = preview.groups;
    expect(a?.brandLayout).not.toBe(b?.brandLayout);
    expect(a?.brandColor).not.toBe(b?.brandColor);
  });

  it('conta inexistente não recebe importação', async () => {
    await expect(importMasterChunk(base, 'org_nao-existe', `${HEADER}\n${linha(1, 'P', '', '')}`)).rejects.toThrow(
      /Conta não encontrada/,
    );
  });
});
