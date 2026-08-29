import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { __setRepositoryForTests } from '@/infra/container';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { importMedsFromText } from '@/services/importService';
import { getCase, listMeds } from '@/services/medService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'test:a' };
const viewer: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'test:viewer' };

const CSV = [
  'MED ID;Valor;Data da compra;Data abertura;Prazo;Motivo;Nome do cliente;CPF;E-mail;Instituição;Tipo de produto;Pedido',
  'MED-001;R$ 349,90;10/08/2026 14:32;20/08/2026 09:00;05/09/2026;Produto não recebido;Maria Souza;12345678909;maria@example.com;Banco Exemplo;Produto físico;PED-1',
  'MED-002;89,90;15/08/2026 09:15;22/08/2026 09:00;07/09/2026;Não reconhece a transação;João Lima;98765432100;joao@example.com;Banco Exemplo;Infoproduto;',
].join('\n');

beforeEach(() => {
  __setRepositoryForTests(new InMemoryMedRepository());
});

describe('importacao em lote', () => {
  it('cria um MED por linha, com os dados normalizados', async () => {
    const { report } = await importMedsFromText(auth, CSV);

    expect(report?.created).toBe(2);
    expect(report?.failed).toBe(0);
    expect(report?.skipped).toBe(0);

    const rows = await listMeds(auth, {});
    expect(rows).toHaveLength(2);

    const first = rows.find((row) => row.med.medId === 'MED-001');
    expect(first?.med.amount).toBe(349.9);
    expect(first?.med.transactionAt).toBe('2026-08-10T17:32:00.000Z');
    expect(first?.med.reason).toBe('PRODUCT_NOT_RECEIVED');
    expect(first?.med.productType).toBe('PHYSICAL');
    expect(first?.med.payer.name).toBe('Maria Souza');
  });

  it('e idempotente: reimportar o mesmo arquivo nao duplica', async () => {
    await importMedsFromText(auth, CSV);
    const { report } = await importMedsFromText(auth, CSV);

    expect(report?.created).toBe(0);
    expect(report?.duplicated).toBe(2);
    expect(await listMeds(auth, {})).toHaveLength(2);
  });

  it('guarda o numero do pedido como evidencia com a procedencia da importacao', async () => {
    const { report } = await importMedsFromText(auth, CSV, { batchReference: 'lote-29-08' });
    const created = report?.results.find((result) => result.medId === 'MED-001');

    const medCase = await getCase(auth, created!.id!);
    const orderEvidence = medCase.evidences.find((evidence) => evidence.type === 'ORDER_RECORD');

    expect(orderEvidence?.value).toBe('PED-1');
    expect(orderEvidence?.source).toBe('MANUAL');
    expect(orderEvidence?.sourceReference).toBe('lote-29-08');
  });

  it('pula a linha ilegivel e importa o resto', async () => {
    const csv = [
      'MED ID;Valor;Data abertura',
      'MED-010;R$ 100,00;20/08/2026',
      'MED-011;a combinar;20/08/2026',
      'MED-012;R$ 50,00;20/08/2026',
    ].join('\n');

    const { report } = await importMedsFromText(auth, csv);

    expect(report?.created).toBe(2);
    expect(report?.skipped).toBe(1);
    const skipped = report?.results.find((result) => result.outcome === 'SKIPPED');
    expect(skipped?.line).toBe(3);
    expect(skipped?.messages.join(' ')).toContain('nao pode ser interpretado');

    expect((await listMeds(auth, {})).map((row) => row.med.medId).sort()).toEqual([
      'MED-010',
      'MED-012',
    ]);
  });

  it('exige data de abertura, aceitando um valor declarado para o lote', async () => {
    const csv = 'MED ID;Valor\nMED-020;R$ 10,00';

    const semData = await importMedsFromText(auth, csv);
    expect(semData.report?.skipped).toBe(1);
    expect(semData.report?.results[0]?.messages.join(' ')).toContain('Data de abertura');

    const comData = await importMedsFromText(auth, csv, {
      defaultOpenedAt: '2026-08-25T12:00:00.000Z',
    });
    expect(comData.report?.created).toBe(1);
  });

  it('nao importa nada quando o arquivo nao tem coluna de identificador', async () => {
    const { parsed, report } = await importMedsFromText(auth, 'Coluna A;Coluna B\n1;2');

    expect(parsed.fatalError).toContain('identificador do MED');
    expect(report).toBeNull();
    expect(await listMeds(auth, {})).toEqual([]);
  });

  it('respeita o RBAC', async () => {
    await expect(importMedsFromText(viewer, CSV)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('mantem os MEDs de cada organizacao separados', async () => {
    const other: AuthContext = { organizationId: 'org_b', role: 'OWNER', actor: 'test:b' };
    await importMedsFromText(auth, CSV);
    await importMedsFromText(other, CSV);

    expect(await listMeds(auth, {})).toHaveLength(2);
    expect(await listMeds(other, {})).toHaveLength(2);
  });
});
