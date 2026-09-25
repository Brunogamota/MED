import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests, getRepository } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { createMed, getCase, listMeds } from '@/services/medService';
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

  it('sem message-id a entrega entra, mas nao vira comprovante', async () => {
    const SEM_ID = [
      'customer_name,customer_email,amount_brl,purchase_at,status,delivered_at,product_url',
      'Fulano de Tal,fulano@exemplo.com,32.80,2026-09-18 12:30:04,delivered,2026-09-18 12:31:50,https://console.exemplo.com/p/abc',
    ].join('\n');

    const report = await importDeliveryLog(auth, SEM_ID, { generateReceipts: true });
    expect(report.fatalError).toBeNull();
    expect(report.recorded).toBe(1);
    expect(report.withoutMessageId).toBe(1);
    // O dado entra; a peca que afirmaria um envio inconferivel, nao.
    expect(report.receipts).toBe(0);
    expect(report.lines[0]?.message).toContain('sem comprovante');

    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-ENTREGUE',
    );
    const caso = await repository.loadCase('org_a', med?.med.id ?? '');
    expect(caso?.digitalDelivery?.sentTo).toBe('fulano@exemplo.com');
  });

  it('nome que nao existe em MED nenhum diz qual nome e, e nao fala de valor', async () => {
    // O motivo do casador fala de valor e data, e deixa a pessoa sem saber que
    // a busca por nome tambem aconteceu e falhou.
    const SO_ENTREGAS = [
      'customer_name,customer_email,sent_at,product_url,message_id,status,delivered_at,smtp_response',
      'Pessoa Que Nao Existe,x@exemplo.com,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m9@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, SO_ENTREGAS);
    const linha = report.lines.find((entry) => entry.kind === 'UNMATCHED');
    expect(linha?.message).toContain('Pessoa Que Nao Existe');
    expect(linha?.message).not.toContain('valor');
    expect(report.medsWithPayerName).toBeGreaterThan(0);
  });

  it('nenhum MED com nome de pagador: o relatorio aponta para o outro lado', async () => {
    __setRepositoryForTests(new InMemoryMedRepository());
    await createMed(auth, {
      medId: 'MED-ANONIMO',
      amount: 10,
      currency: 'BRL',
      openedAt: '2026-09-20T12:00:00.000Z',
      transactionAt: '2026-09-19T12:00:00.000Z',
      reason: 'FRAUD_SCAM',
      payer: {},
    });

    const SO_ENTREGAS = [
      'customer_name,customer_email,sent_at,product_url,message_id,status,delivered_at,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m9@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, SO_ENTREGAS);
    expect(report.medsConsidered).toBe(1);
    expect(report.medsWithPayerName).toBe(0);
    expect(report.lines[0]?.message).toContain('Importe os MEDs no passo 1');
  });

  it('sobrenome a mais de um lado ainda casa', async () => {
    const SO_ENTREGAS = [
      'customer_name,customer_email,sent_at,product_url,message_id,status,delivered_at,smtp_response',
      'Fulano de Tal Silva,fulano@exemplo.com,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m9@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, SO_ENTREGAS);
    expect(report.accessLinked).toBe(1);
  });

  it('arquivo que nao identifica destinatario e recusado, sem gravar nada', async () => {
    const report = await importDeliveryLog(auth, 'coluna_a,coluna_b\n1,2');
    expect(report.fatalError).toMatch(/não parece um log de envio/);
    expect(report.recorded).toBe(0);
  });

  it('liberacao anterior a cobranca nao vira comprovante', async () => {
    // O caso que um analista pega em dois segundos: a peca diria que o acesso
    // foi entregue antes de a compra existir.
    const LOG_ACESSO = [
      'customer_name,customer_email,amount_brl,purchase_at,message_id,status,delivered_at,product_url,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,32.80,2026-09-18 12:30:04,<m1@mta03.exemplo.com.br>,delivered,2026-09-18 12:31:50,,250 OK',
      // Mesma pessoa, liberacao tres semanas antes da cobranca contestada.
      'Fulano de Tal,fulano@exemplo.com,,2026-08-27 10:00:00,<m9@mta03.exemplo.com.br>,delivered,2026-08-27 10:01:00,https://console.exemplo.com/p/abc,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, LOG_ACESSO, { generateReceipts: true });
    expect(report.anachronistic).toBe(1);
    expect(report.accessLinked).toBe(0);

    const linha = report.lines.find((entry) => entry.kind === 'ACCESS_BEFORE_CHARGE');
    expect(linha?.message).toContain('anterior à cobrança');

    // E o MED nao fica com uma peca que se contradiz na propria data.
    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-ENTREGUE',
    );
    const evidencias = await repository.listEvidence('org_a', med?.med.id ?? '');
    const acesso = evidencias.filter(
      (evidence) =>
        evidence.type === 'DELIVERY_COMMUNICATION' &&
        (evidence.value as { reference?: string })?.reference,
    );
    expect(acesso).toHaveLength(0);
  });

  it('junta os dois arquivos do export e liga pelo id da transacao', async () => {
    // Como o export costuma chegar: cobrancas num arquivo, entregas no outro.
    // So o de cobranca identifica o MED; o de entrega traz a URL e se pendura
    // nele pelo txn_id.
    const COBRANCAS = [
      'customer_name,customer_email,amount_brl,purchase_at,txn_id,message_id,status,delivered_at,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,32.80,2026-09-18 12:30:04,txn_abc,<m1@mta03.exemplo.com.br>,delivered,2026-09-18 12:31:50,250 OK',
    ].join('\n');
    const ENTREGAS = [
      'customer_name,customer_email,txn_id,sent_at,product_url,message_id,status,delivered_at,first_access_at,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,txn_abc,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m2@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,2026-09-18 13:02:11,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, [COBRANCAS, ENTREGAS]);
    expect(report.recorded).toBe(1);
    expect(report.accessLinked).toBe(1);
    expect(report.unmatched).toBe(0);
    expect(
      report.lines.find((entry) => entry.kind === 'ACCESS_LINKED')?.message,
    ).toContain('txn_abc');

    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-ENTREGUE',
    );
    const caso = await repository.loadCase('org_a', med?.med.id ?? '');
    // O e-mail vai para o cadastro do caso, nao so para dentro da entrega.
    expect(caso?.customer?.identification.email).toBe('fulano@exemplo.com');
    // E a URL fica no registro de entrega mesmo sem gerar comprovante.
    expect(caso?.digitalDelivery?.platform).toBe('https://console.exemplo.com/p/abc');
    expect(caso?.digitalDelivery?.firstAccessAt).toBe('2026-09-18T16:02:11.000Z');
  });

  it('arquivo de entregas sozinho ainda casa pelo nome, quando o nome e unico', async () => {
    // Foi o que aconteceu de verdade: o operador subiu so a metade de
    // entregas, que nao tem valor nem data da compra, e nada casou.
    const SO_ENTREGAS = [
      'customer_name,customer_email,sent_at,product_url,message_id,status,delivered_at,first_access_at,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m2@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,2026-09-18 13:02:11,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, SO_ENTREGAS);
    expect(report.accessLinked).toBe(1);
    expect(
      report.lines.find((entry) => entry.kind === 'ACCESS_LINKED')?.message,
    ).toContain('nome do comprador');

    const repository = await getRepository();
    const med = (await repository.listMeds('org_a', {})).find(
      (row) => row.med.medId === 'MED-ENTREGUE',
    );
    const caso = await repository.loadCase('org_a', med?.med.id ?? '');
    expect(caso?.digitalDelivery?.platform).toBe('https://console.exemplo.com/p/abc');
  });

  it('nome que aponta para dois MEDs nao e sorteado', async () => {
    // O mesmo comprador com duas cobrancas contestadas: o nome nao distingue,
    // e escolher uma seria inventar.
    await createMed(auth, {
      medId: 'MED-SEGUNDO',
      amount: 99.9,
      currency: 'BRL',
      openedAt: '2026-09-19T12:00:00.000Z',
      transactionAt: '2026-09-18T18:00:00.000Z',
      reason: 'FRAUD_SCAM',
      payer: { name: 'Fulano de Tal' },
    });

    const SO_ENTREGAS = [
      'customer_name,customer_email,sent_at,product_url,message_id,status,delivered_at,smtp_response',
      'Fulano de Tal,fulano@exemplo.com,2026-09-18 12:35:00,https://console.exemplo.com/p/abc,<m2@mta01.exemplo.com.br>,delivered,2026-09-18 12:36:00,250 OK',
    ].join('\n');

    const report = await importDeliveryLog(auth, SO_ENTREGAS);
    expect(report.accessLinked).toBe(0);
    const linha = report.lines.find((entry) => entry.kind === 'UNMATCHED');
    expect(linha?.message).toContain('2 MEDs de Fulano de Tal');
  });

  it('arquivo ilegivel no meio derruba a importacao inteira', async () => {
    const report = await importDeliveryLog(auth, [LOG, 'sem cabecalho reconhecivel']);
    expect(report.fatalError).not.toBeNull();
    expect(report.recorded).toBe(0);
  });

  it('quem nao pode escrever MED nao importa entrega', async () => {
    const viewer: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'teste' };
    await expect(importDeliveryLog(viewer, LOG)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

/**
 * O caminho mais forte: o log de envio traz, na coluna da transacao, o proprio
 * numero do MED. Nao ha nome para comparar, valor para conferir nem arquivo de
 * cobrancas para casar antes — a linha diz de que caso ela e.
 */
describe('log de envio que traz o numero do MED', () => {
  const E2E = 'E18236120202609220604s1415b933c2';

  const LOG_COM_E2E = [
    'txn_id,customer_name,customer_email,message_id,status,delivered_at,first_access_at,product_url,smtp_response',
    `${E2E},Nome Que Nao Casa,outro@exemplo.com,<m9@mta03.exemplo.com.br>,delivered,2026-09-22 04:10:00,2026-09-22 05:01:00,https://console.exemplo.com/p/xyz,250 OK`,
  ].join('\n');

  beforeEach(async () => {
    await createMed(auth, {
      medId: E2E,
      amount: 34.8,
      currency: 'BRL',
      openedAt: '2026-09-23T12:00:00.000Z',
      transactionAt: '2026-09-22T03:04:33.000Z',
      reason: 'FRAUD_SCAM',
      payer: { name: 'Antônio Marcos Alves da Silva Júnior' },
    });
  });

  it('casa pelo identificador mesmo com nome e e-mail diferentes', async () => {
    const report = await importDeliveryLog(auth, LOG_COM_E2E);

    expect(report.unmatched).toBe(0);
    expect(report.accessLinked).toBe(1);

    // A linha nao traz valor nem horario da cobranca, entao o casador nao a
    // alcanca: quem ligou foi o identificador. O que importa e que o envio
    // ficou gravado no caso certo.
    const linha = report.lines.find((line) => line.medId === E2E);
    expect(linha?.kind).toBe('ACCESS_LINKED');

    const fila = await listMeds(auth, { limit: 100 });
    const alvo = fila.find((linha) => linha.med.medId === E2E);
    const caso = await getCase(auth, alvo?.med.id ?? '');
    expect(caso.digitalDelivery?.sentTo).toBe('outro@exemplo.com');
  });

  it('identificador que nao existe nao cai no nome nem no e-mail', async () => {
    const outro = LOG_COM_E2E.replace(E2E, 'E99999999202609220604s0000000000');
    const report = await importDeliveryLog(auth, outro);

    // O nome do log nao corresponde a nenhum MED, e o identificador tambem nao:
    // a linha fica sem casar em vez de ser encaixada em algum caso.
    expect(report.recorded).toBe(0);
    expect(report.unmatched).toBe(1);
  });
});
