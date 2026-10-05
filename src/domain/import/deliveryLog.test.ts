import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyOutcome, isDeliveryLog, parseDeliveryLog, parseLogTimestamp } from '@/domain/import/deliveryLog';

/**
 * Export de MTA com os envios de confirmacao.
 *
 * Estrutura e respostas SMTP sao as de um arquivo real; as pessoas e o dominio
 * do remetente foram trocados. O bounce por dominio digitado errado
 * (`gmial.com`) ficou porque e justamente o caso que o leitor precisa tratar
 * direito — e o que um arquivo forjado nunca traria.
 */
const RAW = readFileSync(join(__dirname, 'fixtures/delivery-log.csv'), 'utf8');

describe('classifyOutcome', () => {
  it('reconhece entrega e recusa', () => {
    expect(classifyOutcome('delivered')).toBe('DELIVERED');
    expect(classifyOutcome('bounced')).toBe('BOUNCED');
  });

  it('o que nao e entrega nem recusa fica em OTHER, e nao vira entrega', () => {
    // `deferred` e `queued` sao mensagem a caminho. Contar como entregue faria
    // a defesa afirmar que chegou o que ainda nao chegou.
    expect(classifyOutcome('deferred')).toBe('OTHER');
    expect(classifyOutcome('queued')).toBe('OTHER');
    expect(classifyOutcome('')).toBe('OTHER');
  });
});

describe('parseLogTimestamp', () => {
  it('le o formato do log no fuso de Brasilia', () => {
    // 09:29:42 em -03:00 sao 12:29:42 em UTC.
    expect(parseLogTimestamp('2026-09-17 09:29:42')).toBe('2026-09-17T12:29:42.000Z');
  });

  it('texto que nao e data vira null, em vez de virar hoje', () => {
    expect(parseLogTimestamp('')).toBeNull();
    expect(parseLogTimestamp('sem data')).toBeNull();
  });
});

describe('log de entrega', () => {
  const parsed = parseDeliveryLog(RAW);

  it('le a linha inteira, com message-id sem os sinais', () => {
    const row = parsed.rows[0];
    expect(row?.messageId).toBe('20260917092942.311152766e@mta03.exemplo.com.br');
    expect(row?.customerEmail).toBe('fulano.azevedo@outlook.com');
    expect(row?.amount).toBe(35.12);
    expect(row?.sentAt).toBe('2026-09-17T12:29:42.000Z');
    expect(row?.deliveredAt).toBe('2026-09-17T12:29:54.000Z');
    expect(row?.outcome).toBe('DELIVERED');
    expect(row?.smtpResponse).toContain('250 2.6.0');
    expect(row?.errors).toEqual([]);
  });

  it('recusa por dominio inexistente entra como recusa, e sem data de entrega', () => {
    const bounced = parsed.rows.filter((row) => row.outcome === 'BOUNCED');
    expect(bounced).toHaveLength(2);
    expect(bounced[0]?.deliveredAt).toBeNull();
    expect(bounced[0]?.smtpResponse).toContain('Domain gmial.com not found');
    // Recusa sem hora de entrega e o esperado: nao houve entrega para datar.
    expect(bounced[0]?.errors).toEqual([]);
  });

  it('entrega sem hora da entrega vale pela hora do envio', () => {
    const row = parsed.rows.find((entry) => entry.customerName === 'Sem Hora Exemplo');
    expect(row?.errors).not.toContain(
      'Status é entrega, mas a data da entrega está ausente ou ilegível.',
    );
  });

  it('status intermediario nao e promovido a entrega', () => {
    const row = parsed.rows.find((entry) => entry.customerName === 'Deferido Exemplo');
    expect(row?.outcome).toBe('OTHER');
    expect(row?.rawStatus).toBe('deferred');
    expect(row?.deliveredAt).toBeNull();
  });

  it('arquivo sem message-id e lido: a coluna decide a peca, nao a leitura', () => {
    // Barrar o arquivo inteiro aqui jogaria fora destinatario, URL e primeiro
    // acesso junto. A ausencia fica na linha, e quem gera a peca e que decide.
    const semId = parseDeliveryLog(
      'customer_email,status,delivered_at\na@b.com,delivered,2026-09-18 12:31:50',
    );
    expect(semId.fatalError).toBeNull();
    expect(semId.rows[0]?.messageId).toBeNull();
    expect(semId.rows[0]?.errors).toEqual([]);
  });

  it('arquivo que nao identifica destinatario nenhum e recusado', () => {
    // O caso de subir o arquivo errado: nada ali diz de quem e a linha.
    const errado = parseDeliveryLog('coluna_a,coluna_b\n1,2');
    expect(errado.fatalError).toMatch(/não parece um log de envio/);
    expect(errado.rows).toEqual([]);
  });
});

describe('isDeliveryLog', () => {
  it('reconhece o log de envio do provedor', () => {
    const log = readFileSync(join(__dirname, 'fixtures/delivery-log.csv'), 'utf8');
    expect(isDeliveryLog(log)).toBe(true);
  });

  it('nao confunde o lote de MEDs da instituicao com log de envio', () => {
    const lote = readFileSync(join(__dirname, 'fixtures/psp-rejeitados.csv'), 'utf8');
    expect(isDeliveryLog(lote)).toBe(false);
  });

  it('arquivo vazio nao e log', () => {
    expect(isDeliveryLog('')).toBe(false);
  });
});

describe('planilha de envio em portugues', () => {
  const PLANILHA = [
    'Nome;E2E;Horário da compra;Lançado no sistema;Confirmação recebida;E-mail;Tipo do produto;URL de acesso / confirmação de pedido para logistica',
    'Fulano de Tal;E18236120202609240950s05ae179c2b;24/09/2026 06:50;24/09/2026 06:52;24/09/2026 06:52:07;fulano@exemplo.com;Digital;https://console.exemplo.com/p/1',
    'Beltrana Silva;E00416968202609221447eFD2QZqmSuJ;22/09/2026 11:47;22/09/2026 11:48;;beltrana@exemplo.com;Físico;https://rastreio.exemplo.com/2',
  ].join('\n');

  it('reconhece todas as colunas', () => {
    const { rows, fatalError } = parseDeliveryLog(PLANILHA);
    expect(fatalError).toBeNull();
    const [a, b] = rows;
    expect(a?.customerName).toBe('Fulano de Tal');
    expect(a?.transactionRef).toBe('E18236120202609240950s05ae179c2b');
    expect(a?.purchaseAt).toBe('2026-09-24T09:50:00.000Z');
    expect(a?.sentAt).toBe('2026-09-24T09:52:00.000Z');
    expect(a?.deliveredAt).toBe('2026-09-24T09:52:07.000Z');
    expect(a?.customerEmail).toBe('fulano@exemplo.com');
    expect(a?.productType).toBe('DIGITAL');
    expect(a?.productUrl).toBe('https://console.exemplo.com/p/1');
    expect(b?.productType).toBe('PHYSICAL');
  });

  it('sem coluna de status, data de envio ou de confirmacao preenchida e entrega', () => {
    const [a, b] = parseDeliveryLog(PLANILHA).rows;
    expect(a?.outcome).toBe('DELIVERED');
    expect(b?.outcome).toBe('DELIVERED');
  });

  it('le data de planilha xlsx (numero serial)', () => {
    expect(parseLogTimestamp('46289.25')).toBe('2026-09-24T09:00:00.000Z');
  });
});

describe('cabecalho com e-mail ou url no meio do nome', () => {
  it('qualquer coluna com e-mail e o e-mail, com url e o link', () => {
    const [row] = parseDeliveryLog(
      [
        'Nome,E2E,Horário da compra,Lançado no sistema ,Confirmação recebida ,E-mail sintético de teste,Tipo do produto,URL de acesso / tracking ',
        'Fulano,E00416968202609171227tISg5WgulqA,17/09/2026 09:27,17/09/2026 09:28:13,17/09/2026 09:29:58,f@exemplo.com,Físico,https://track.exemplo.com/BR-1',
      ].join('\n'),
    ).rows;
    expect(row?.customerEmail).toBe('f@exemplo.com');
    expect(row?.productUrl).toBe('https://track.exemplo.com/BR-1');
  });
});

describe('colunas com nome qualquer', () => {
  it('reconhece pelo conteudo quando o cabecalho nao diz nada', () => {
    const [row] = parseDeliveryLog(
      [
        'Cliente final;Codigo;Quando comprou;Disparo;Ok em;Contato;Produto;Onde acessar',
        'Fulano de Tal;E00416968202609171227tISg5WgulqA;17/09/2026 09:27;17/09/2026 09:28:13;17/09/2026 09:29:58;f@exemplo.com;Físico;https://track.exemplo.com/1',
      ].join('\n'),
    ).rows;
    expect(row?.transactionRef).toBe('E00416968202609171227tISg5WgulqA');
    expect(row?.customerEmail).toBe('f@exemplo.com');
    expect(row?.productUrl).toBe('https://track.exemplo.com/1');
    expect(row?.sentAt).not.toBeNull();
    expect(row?.outcome).toBe('DELIVERED');
  });

  it('datas sem nome reconhecivel entram como compra, envio e confirmacao', () => {
    const [row] = parseDeliveryLog(
      [
        'A;B;C;D;E',
        'E00416968202609171227tISg5WgulqA;17/09/2026 09:27;17/09/2026 09:28;17/09/2026 09:29;f@exemplo.com',
      ].join('\n'),
    ).rows;
    expect(row?.purchaseAt).toBe('2026-09-17T12:27:00.000Z');
    expect(row?.sentAt).toBe('2026-09-17T12:28:00.000Z');
    expect(row?.deliveredAt).toBe('2026-09-17T12:29:00.000Z');
  });
});

describe('planilha com Status, Reference e medId', () => {
  const header =
    'Nome\tValor\tData/hora da compra\tCPF\tPSP\tE2E\tReference\tTipo do produto\tE-mail\t' +
    'Lançado no sistema\tStatus \tConfirmação de recebimento\tURL de acesso digital\t' +
    'Detalhe informado\tmedId\tData/hora de envio\tData/hora da confirmação';
  const e2e = 'E18236120202609251353s139a9ad5d9';
  const linha = (status: string) =>
    [
      'Maria Souza',
      '97,90',
      '25/09/2026 10:53',
      '123.456.789-00',
      'Nubank',
      e2e,
      'REF-991',
      'Digital',
      'maria@exemplo.com',
      'Sim',
      status,
      'Sim',
      'https://acesso.exemplo.com/x',
      'Acesso liberado',
      e2e,
      '25/09/2026 10:55',
      '25/09/2026 11:02',
    ].join('\t');

  it('le as datas de verdade e reconhece o status em portugues', () => {
    for (const status of ['Entregue', 'Enviado', 'Confirmado', 'Lançado', '']) {
      const { rows, fatalError } = parseDeliveryLog(`${header}\n${linha(status)}`);
      expect(fatalError).toBeNull();
      const [row] = rows;
      expect(row?.outcome).toBe('DELIVERED');
      expect(row?.transactionRef).toBe(e2e);
      expect(row?.sentAt).toBe(parseLogTimestamp('25/09/2026 10:55'));
      expect(row?.deliveredAt).toBe(parseLogTimestamp('25/09/2026 11:02'));
      expect(row?.purchaseAt).toBe(parseLogTimestamp('25/09/2026 10:53'));
      expect(row?.customerEmail).toBe('maria@exemplo.com');
      expect(row?.productType).toBe('DIGITAL');
      expect(row?.errors).toEqual([]);
    }
  });

  it('nao entregue explicito continua nao entregue', () => {
    for (const status of ['Não entregue', 'Pendente', 'Bounce']) {
      const { rows } = parseDeliveryLog(`${header}\n${linha(status)}`);
      expect(rows[0]?.outcome).not.toBe('DELIVERED');
    }
  });
});
