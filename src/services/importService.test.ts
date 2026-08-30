import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { __setRepositoryForTests } from '@/infra/container';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { importMedsFromText } from '@/services/importService';
import { deriveEvidence } from '@/domain/evidence/derive';
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

  it('preenche Transação, Cliente e Pedido sozinho, sem passo manual depois', async () => {
    const { report } = await importMedsFromText(auth, CSV, { batchReference: 'lote-29-08' });
    const created = report?.results.find((result) => result.medId === 'MED-001');

    const medCase = await getCase(auth, created!.id!);

    expect(medCase.transaction?.amount).toBe(349.9);
    expect(medCase.transaction?.authorizedAt).toBe('2026-08-10T17:32:00.000Z');
    expect(medCase.transaction?.capturedAt).toBe('2026-08-10T17:32:00.000Z');
    expect(medCase.transaction?.currency).toBe('BRL');

    expect(medCase.customer?.identification.name).toBe('Maria Souza');
    expect(medCase.customer?.identification.document).toBe('12345678909');
    expect(medCase.customer?.identification.email).toBe('maria@example.com');

    expect(medCase.order?.productType).toBe('PHYSICAL');
    expect(medCase.order?.externalId).toBe('PED-1');
    expect(medCase.order?.totalAmount).toBe(349.9);
    expect(medCase.order?.placedAt).toBe('2026-08-10T17:32:00.000Z');
  });

  it('o pedido criado vira evidência ORDER_RECORD sozinho (nada de evidência manual duplicada)', async () => {
    const { report } = await importMedsFromText(auth, CSV, { batchReference: 'lote-29-08' });
    const created = report?.results.find((result) => result.medId === 'MED-001');

    const medCase = await getCase(auth, created!.id!);
    const derived = deriveEvidence(medCase);
    const orderEvidences = derived.filter((evidence) => evidence.type === 'ORDER_RECORD');

    expect(orderEvidences).toHaveLength(1);
    expect(orderEvidences[0]?.value).toBe('PED-1');
    expect(
      medCase.evidences.filter((evidence) => evidence.type === 'ORDER_RECORD'),
    ).toHaveLength(0);
  });

  it('sem coluna de tipo de produto, o pedido fica em branco e a referência vira evidência manual', async () => {
    const csv = [
      'MED ID;Valor;Data da compra;Data abertura;Pedido',
      'MED-030;R$ 199,00;10/08/2026 10:00;20/08/2026;PED-30',
    ].join('\n');

    const { report } = await importMedsFromText(auth, csv, { batchReference: 'lote-29-08' });
    const result = report?.results[0];
    const medCase = await getCase(auth, result!.id!);

    expect(medCase.order).toBeNull();
    const orderEvidence = medCase.evidences.find((evidence) => evidence.type === 'ORDER_RECORD');
    expect(orderEvidence?.value).toBe('PED-30');
    expect(orderEvidence?.sourceReference).toBe('lote-29-08');
    expect(result?.messages.join(' ')).toContain('Tipo de produto');

    // Transação e Cliente não dependem de tipo de produto: continuam nascendo.
    expect(medCase.transaction?.amount).toBe(199);
  });

  it('reimportar o mesmo arquivo não sobrescreve uma correção manual', async () => {
    const first = await importMedsFromText(auth, CSV);
    const created = first.report?.results.find((result) => result.medId === 'MED-001');

    const { upsertCustomer } = await import('@/services/medService');
    await upsertCustomer(auth, created!.id!, {
      identification: { name: 'Nome Corrigido Manualmente' },
    });

    await importMedsFromText(auth, CSV);
    const medCase = await getCase(auth, created!.id!);
    expect(medCase.customer?.identification.name).toBe('Nome Corrigido Manualmente');
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
    expect(skipped?.messages.join(' ')).toContain('não pode ser interpretado');

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
