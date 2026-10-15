import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import type { AuthContext } from '@/infra/auth/context';
import { addCommunicationReconstruction, createMed, getCase } from '@/services/medService';
import { isEventPhrase } from '@/domain/import/eventLog';
import { importArksFiles, splitArksFiles } from '@/services/eventImportService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

const EVENTOS_CABECALHO =
  'Pedido,ID MED,Evento,Data/Hora do Evento,Canal,Código do Evento,URL Operacional,Observação,Canal / Distribuidor,ID Externo do Pedido,Referência do Fornecedor';

function eventosDe(med: string, pedido: string): string[] {
  return [
    `${pedido},${med},Pagamento confirmado,01/10/2026 10:00,Site,EV-${med}-1,,,Distrib X,EXT-${pedido},REF-1`,
    `${pedido},${med},Pedido recebido,01/10/2026 10:05,Site,EV-${med}-2,,,Distrib X,EXT-${pedido},REF-1`,
    `${pedido},${med},Em preparação,01/10/2026 14:00,Site,EV-${med}-3,,,Distrib X,EXT-${pedido},REF-1`,
    `${pedido},${med},Pedido transmitido ao fornecedor internacional,02/10/2026 09:30,Site,EV-${med}-4,,,Distrib X,EXT-${pedido},REF-1`,
  ];
}

const PEDIDOS = [
  'ID MED,Pedido,Data/Hora do Pagamento,Status do Pagamento,Cliente,Documento,Valor,PSP,Reference,Natureza,E-mail de Contato,Status Atual do Pedido,Última Atualização,Referência Operacional,Canal / Distribuidor,ID do Pedido no Fornecedor,País de Origem,Status no Fornecedor,Referência do Fornecedor',
  'MED-1,P-1,01/10/2026 10:00,Pago,Fulano,,"R$ 100,00",PSP,R1,Físico,f@exemplo.com,Em preparação,02/10/2026,OP-1,Distrib X,FORN-1,CN,Recebido,REF-1',
].join('\n');

beforeEach(async () => {
  __setRepositoryForTests(new InMemoryMedRepository());
  for (const medId of ['MED-1', 'MED-2']) {
    await createMed(auth, {
      medId,
      amount: 100,
      currency: 'BRL',
      openedAt: '2026-10-03T12:00:00.000Z',
      transactionAt: '2026-10-01T13:00:00.000Z',
      reason: 'PRODUCT_NOT_RECEIVED',
      payer: { name: 'Fulano' },
    });
  }
});
afterEach(() => __setRepositoryForTests(null));

describe('planilhas Arks', () => {
  const eventos = [EVENTOS_CABECALHO, ...eventosDe('MED-1', 'P-1'), ...eventosDe('MED-2', 'P-2'), ...eventosDe('MED-9', 'P-9')].join('\n');

  it('separa eventos, pedidos e o resto', () => {
    const split = splitArksFiles([eventos, PEDIDOS, 'a,b\n1,2']);
    expect(split.eventos).toHaveLength(1);
    expect(split.pedidos).toHaveLength(1);
    expect(split.outros).toHaveLength(1);
  });

  it('conta MED distinto, não linha, e registra os marcos com data', async () => {
    const report = await importArksFiles(auth, { eventos: [eventos], pedidos: [PEDIDOS] });
    expect(report.arks).toEqual({ linhasDeEvento: 12, medsComEvento: 3, pedidos: 1 });
    expect(report.total).toBe(3);
    expect(report.recorded).toBe(2);
    expect(report.unmatched).toBe(1);
    expect(report.receipts).toBe(2);

    const medCase = await getCase(auth, report.touchedMedIds[0] ?? '');
    const events = medCase.tracking?.events ?? [];
    // Pagamento não vira marco logístico.
    expect(events.map((e) => e.status)).toEqual(['CREATED', 'CREATED', 'IN_PRODUCTION']);
    expect(events.every((e) => e.source === 'MERCHANT' && e.sourceReference)).toBe(true);
    expect(medCase.tracking?.status).toBe('IN_PRODUCTION');
    expect(medCase.order?.productType).toBe('PHYSICAL');
    expect(medCase.order?.externalId).toBe('P-1');
  });

  it('reimportar não duplica marcos', async () => {
    await importArksFiles(auth, { eventos: [eventos], pedidos: [] });
    const segunda = await importArksFiles(auth, { eventos: [eventos], pedidos: [] });
    expect(segunda.receipts).toBe(0);
    const linha = segunda.lines.find((l) => l.medId === 'MED-1');
    expect(linha?.kind).toBe('RECORDED');
    expect(linha?.message).toMatch(/já estavam/);
    const medCase = await getCase(auth, segunda.touchedMedIds[0] ?? '');
    expect(medCase.tracking?.events).toHaveLength(3);
    expect(medCase.evidences.filter((e) => e.type === 'DELIVERY_COMMUNICATION')).toHaveLength(1);
  });

  it('evento sem data não vira marco', async () => {
    const semData = [EVENTOS_CABECALHO, 'P-1,MED-1,Em preparação,,Site,EV-x,,,,,'].join('\n');
    const report = await importArksFiles(auth, { eventos: [semData], pedidos: [] });
    expect(report.recorded).toBe(0);
    expect(report.lines[0]?.kind).toBe('INVALID');
  });
});

describe('planilha de eventos com cabeçalho livre', () => {
  // Cabeçalhos que não batem com nenhum nome conhecido: o conteúdo decide.
  const LIVRE = [
    'Ordem,Transação,Etapa do fluxo,Quando,Link',
    'IRP-1,MED-1,Pagamento confirmado,01/10/2026 10:00,https://console.exemplo.com/orders/IRP-1/payment',
    'IRP-1,MED-1,Pedido recebido,01/10/2026 10:05,https://console.exemplo.com/orders/IRP-1',
    'IRP-1,MED-1,Pedido transmitido ao fornecedor internacional,02/10/2026 09:30,https://console.exemplo.com/orders/IRP-1/x',
  ].join('\n');

  it('reconhece pelo conteúdo e nunca usa a etapa como nome', () => {
    expect(isEventPhrase('Pagamento confirmado')).toBe(true);
    expect(isEventPhrase('Em preparação')).toBe(true);
    expect(isEventPhrase('Maria da Silva')).toBe(false);
  });

  it('E2E na coluna sem nome conhecido também é reconhecido', () => {
    const e2e = 'E0036030520261012190600000000001';
    const texto = LIVRE.replaceAll('MED-1', e2e);
    expect(splitArksFiles([texto]).eventos).toHaveLength(1);
  });

  it('substitui os comprovantes antigos pelo do pedido', async () => {
    const eventos = [EVENTOS_CABECALHO, ...eventosDe('MED-1', 'P-1')].join('\n');
    const antes = await importArksFiles(auth, { eventos: [eventos], pedidos: [] });
    const id = antes.touchedMedIds[0] ?? '';
    await addCommunicationReconstruction(auth, id, {
      template: 'ORDER_TRACKING',
      from: 'Loja',
      to: 'Pagamento confirmado',
      subject: 'Obrigado pela sua compra',
      body: 'Olá, Pagamento',
      source: 'EMAIL',
      sourceReference: 'linha-antiga',
    });
    const depois = await importArksFiles(auth, { eventos: [eventos], pedidos: [] }, {
      replacePreviousReceipts: true,
    });
    expect(depois.replacedReceipts).toBe(1);
    const medCase = await getCase(auth, id);
    const pecas = medCase.evidences.filter((e) => e.type === 'DELIVERY_COMMUNICATION');
    expect(pecas.map((e) => e.sourceReference)).toEqual(['P-1']);
  });
});
