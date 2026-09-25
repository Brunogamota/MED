import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setRepositoryForTests } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import type { AuthContext } from '@/infra/auth/context';
import { createMed } from '@/services/medService';
import { importDeliveryLog } from '@/services/deliveryImportService';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

const E2E_A = 'E18236120202609220604s1415b933c2';
const E2E_B = 'E9040088820260922104470415645487';

const CABECALHO =
  'txn_id,customer_name,customer_email,amount_brl,purchase_at,message_id,status,delivered_at,first_access_at,product_url,smtp_response';

const COBRANCA_A = `${E2E_A},Fulano de Tal,fulano@exemplo.com,34.80,2026-09-22 03:04:33,<c1@mta01.exemplo.com.br>,delivered,2026-09-22 03:05:52,,,250 OK`;
const ENTREGA_A = `${E2E_A},Fulano de Tal,fulano@exemplo.com,,,<e1@mta03.exemplo.com.br>,delivered,2026-09-22 03:09:35,2026-09-22 04:01:35,https://console.exemplo.com/p/a,250 OK`;
const COBRANCA_B = `${E2E_B},Beltrana Silva,beltrana@exemplo.com,110.98,2026-09-22 10:44:57,<c2@mta01.exemplo.com.br>,delivered,2026-09-22 10:46:00,,,250 OK`;
const ENTREGA_B = `${E2E_B},Beltrana Silva,beltrana@exemplo.com,,,<e2@mta07.exemplo.com.br>,delivered,2026-09-22 10:48:51,2026-09-22 11:14:51,https://console.exemplo.com/p/b,250 OK`;

const COBRANCAS = [CABECALHO, COBRANCA_A, COBRANCA_B].join('\n');
const ENTREGAS = [CABECALHO, ENTREGA_A, ENTREGA_B].join('\n');
/** O "completo" do provedor: os dois de cima somados, no mesmo arquivo. */
const COMPLETO = [CABECALHO, COBRANCA_A, COBRANCA_B, ENTREGA_A, ENTREGA_B].join('\n');

async function semear() {
  await createMed(auth, {
    medId: E2E_A,
    amount: 34.8,
    currency: 'BRL',
    openedAt: '2026-09-25T12:00:00.000Z',
    transactionAt: '2026-09-22T06:04:33.000Z',
    reason: 'FRAUD_SCAM',
    payer: { name: 'Fulano de Tal' },
  });
  await createMed(auth, {
    medId: E2E_B,
    amount: 110.98,
    currency: 'BRL',
    openedAt: '2026-09-25T12:00:00.000Z',
    transactionAt: '2026-09-22T13:44:57.000Z',
    reason: 'FRAUD_SCAM',
    payer: { name: 'Beltrana Silva' },
  });
}

beforeEach(async () => {
  __setRepositoryForTests(new InMemoryMedRepository());
  await semear();
});
afterEach(() => __setRepositoryForTests(null));

/**
 * O export do provedor vem partido **e** junto: cobrancas, entregas, e um
 * "completo" que e os dois somados. Subir os tres e o razoavel a fazer quando
 * chegam os tres — e era exatamente isso que quebrava a conta.
 */
describe('mesmo envio em mais de um arquivo', () => {
  it('subir os tres arquivos da o mesmo resultado que subir os dois', async () => {
    const tres = await importDeliveryLog(auth, [COBRANCAS, ENTREGAS, COMPLETO]);

    expect(tres.total).toBe(4);
    expect(tres.duplicated).toBe(4);
    expect(tres.unmatched).toBe(0);

    __setRepositoryForTests(new InMemoryMedRepository());
    await semear();
    const dois = await importDeliveryLog(auth, [COBRANCAS, ENTREGAS]);

    expect(tres.total).toBe(dois.total);
    expect(tres.recorded).toBe(dois.recorded);
    expect(tres.accessLinked).toBe(dois.accessLinked);
    expect(tres.unmatched).toBe(dois.unmatched);
  });

  it('subir so o completo da o mesmo resultado', async () => {
    const completo = await importDeliveryLog(auth, [COMPLETO]);
    expect(completo.total).toBe(4);
    expect(completo.duplicated).toBe(0);
    expect(completo.unmatched).toBe(0);
  });

  it('o mesmo arquivo subido duas vezes nao conta duas vezes', async () => {
    const report = await importDeliveryLog(auth, [COMPLETO, COMPLETO]);

    expect(report.total).toBe(4);
    expect(report.duplicated).toBe(4);
  });

  it('message-id diferente e envio diferente, e os dois entram', async () => {
    // A cobranca e a entrega do mesmo MED tem message-ids proprios: sao duas
    // mensagens, e deduplicar por comprador ou por transacao perderia uma.
    const report = await importDeliveryLog(auth, [COBRANCAS, ENTREGAS]);

    expect(report.total).toBe(4);
    expect(report.duplicated).toBe(0);
  });

  it('linha sem message-id nao e tratada como repetida', async () => {
    // Sem a chave nao da para afirmar que e o mesmo envio, e descartar seria
    // perder registro. Entra, e o relatorio ja conta como "sem message-id".
    const semId = [
      CABECALHO,
      `${E2E_A},Fulano de Tal,fulano@exemplo.com,34.80,2026-09-22 03:04:33,,delivered,2026-09-22 03:05:52,,,250 OK`,
      `${E2E_B},Beltrana Silva,beltrana@exemplo.com,110.98,2026-09-22 10:44:57,,delivered,2026-09-22 10:46:00,,,250 OK`,
    ].join('\n');

    const report = await importDeliveryLog(auth, [semId]);
    expect(report.total).toBe(2);
    expect(report.duplicated).toBe(0);
    expect(report.withoutMessageId).toBe(2);
  });
});
