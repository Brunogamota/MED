import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests, getRepository } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { createMed } from '@/services/medService';
import { importDeliveryLog } from '@/services/deliveryImportService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

const LOG = [
  'customer_name,customer_email,amount_brl,purchase_at,message_id,status,delivered_at,first_access_at,product_url,smtp_response',
  // Entregue, com primeiro acesso: o caso forte.
  'Fulano de Tal,fulano@exemplo.com,32.80,2026-09-18 12:30:04,<m1@mta03.exemplo.com.br>,delivered,2026-09-18 12:31:50,2026-09-18 13:02:11,https://console.exemplo.com/p/abc,250 OK',
  // Recusado: nao pode virar registro de entrega.
  'Beltrano Silva,beltrano@gmial.com,19.90,2026-09-19 11:20:45,<m2@mta01.exemplo.com.br>,bounced,,,,550 5.1.1 Domain gmial.com not found',
  // Nao existe MED com esse valor e horario.
  'Ninguem,ninguem@exemplo.com,99.99,2026-01-01 10:00:00,<m3@mta01.exemplo.com.br>,delivered,2026-01-01 10:01:00,,,250 OK',
].join('\n');

async function semear() {
  await createMed(auth, {
    medId: 'MED-ENTREGUE',
    amount: 32.8,
    currency: 'BRL',
    openedAt: '2026-09-19T12:00:00.000Z',
    transactionAt: '2026-09-18T15:30:04.000Z',
    reason: 'PRODUCT_NOT_RECEIVED',
    payer: { name: 'Fulano de Tal' },
  });
  await createMed(auth, {
    medId: 'MED-RECUSADO',
    amount: 19.9,
    currency: 'BRL',
    openedAt: '2026-09-19T12:00:00.000Z',
    transactionAt: '2026-09-19T14:20:45.000Z',
    reason: 'FRAUD_SCAM',
    payer: { name: 'Beltrano Silva' },
  });
  await createMed(auth, {
    medId: 'MED-SEM-LOG',
    amount: 47.9,
    currency: 'BRL',
    openedAt: '2026-09-19T12:00:00.000Z',
    transactionAt: '2026-09-19T16:00:00.000Z',
    reason: 'FRAUD_SCAM',
    payer: { name: 'Sicrano Souza' },
  });
}

beforeEach(async () => {
  __setRepositoryForTests(new InMemoryMedRepository());
  await semear();
});
afterEach(() => __setRepositoryForTests(null));

describe('importar log de envio', () => {
  it('registra a entrega no MED que casou, com primeiro acesso', async () => {
    const report = await importDeliveryLog(auth, LOG);
    expect(report.recorded).toBe(1);
    expect(report.withFirstAccess).toBe(1);

    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-ENTREGUE',
    );
    const caso = await repository.loadCase('org_a', med?.med.id ?? '');
    expect(caso?.digitalDelivery?.sentTo).toBe('fulano@exemplo.com');
    expect(caso?.digitalDelivery?.firstAccessAt).toBe('2026-09-18T16:02:11.000Z');
    // Procedencia: o provedor que assinou o envio, e o id que a instituicao cruza.
    expect(caso?.digitalDelivery?.source).toBe('EMAIL');
    expect(caso?.digitalDelivery?.sourceProvider).toBe('mta03.exemplo.com.br');
    expect(caso?.digitalDelivery?.sourceReference).toBe('m1@mta03.exemplo.com.br');
  });

  it('envio recusado nao vira registro de entrega', async () => {
    const report = await importDeliveryLog(auth, LOG);
    expect(report.notDelivered).toBe(1);

    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-RECUSADO',
    );
    const caso = await repository.loadCase('org_a', med?.med.id ?? '');
    // O caso fica sem entrega, que e a verdade do log.
    expect(caso?.digitalDelivery).toBeNull();

    const linha = report.lines.find((entry) => entry.medId === 'MED-RECUSADO');
    expect(linha?.kind).toBe('NOT_DELIVERED');
    expect(linha?.message).toContain('gmial.com');
  });

  it('linha sem MED correspondente e reportada, nao descartada', async () => {
    const report = await importDeliveryLog(auth, LOG);
    expect(report.unmatched).toBe(1);
    expect(report.lines.find((entry) => entry.kind === 'UNMATCHED')?.customerEmail).toBe(
      'ninguem@exemplo.com',
    );
  });

  it('lista os MEDs que seguem sem registro de envio', async () => {
    const report = await importDeliveryLog(auth, LOG);
    // MED-RECUSADO tambem entra: recusa nao e entrega.
    expect(report.medsWithoutDelivery.map((med) => med.medId).sort()).toEqual([
      'MED-RECUSADO',
      'MED-SEM-LOG',
    ]);
  });

  it('reimportar o mesmo arquivo nao duplica nem muda o resultado', async () => {
    const primeiro = await importDeliveryLog(auth, LOG);
    const segundo = await importDeliveryLog(auth, LOG);
    expect(segundo.recorded).toBe(primeiro.recorded);
    expect(segundo.withFirstAccess).toBe(primeiro.withFirstAccess);
  });

  it('arquivo sem message-id e recusado inteiro, sem gravar nada', async () => {
    const report = await importDeliveryLog(auth, 'customer_email,status\na@b.com,delivered');
    expect(report.fatalError).toMatch(/message-id/);
    expect(report.recorded).toBe(0);
  });

  it('quem nao pode escrever MED nao importa entrega', async () => {
    const viewer: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'teste' };
    await expect(importDeliveryLog(viewer, LOG)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
