import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeEncodedWords,
  decodeQuotedPrintable,
  parseMessage,
} from '@/domain/email/mime';
import {
  parseBrazilianDateTime,
  parseBrazilianMoney,
  readMedNotice,
  readMedNoticeText,
} from '@/domain/email/medNotice';

const RAW = readFileSync(join(__dirname, 'fixtures/aviso-med.eml'), 'utf8');

describe('quoted-printable', () => {
  it('decodifica acento de dois bytes', () => {
    expect(decodeQuotedPrintable('devolu=C3=A7=C3=A3o')).toBe('devolução');
  });

  it('junta a quebra suave que parte um numero ao meio', () => {
    // Caso real: o aviso trazia "28/08/202=\n6". Sem juntar, o ano some.
    expect(decodeQuotedPrintable('em 28/08/202=\n6 e')).toBe('em 28/08/2026 e');
  });

  it('preserva `=` que nao inicia sequencia valida', () => {
    expect(decodeQuotedPrintable('a=zb')).toBe('a=zb');
  });
});

describe('palavras codificadas de cabecalho', () => {
  it('junta duas palavras codificadas sem deixar o espaco do dobramento', () => {
    const folded =
      '=?UTF-8?B?W1RFU1RFXSBBYmVydHVyYSBkZSBNRUQgLSBTb2xpY2l0YcOnw6NvIGRlIGRldm9sdcOn?= ' +
      '=?UTF-8?B?w6NvIFBpeCAtIE1FRC0yMDI2LTAwMDQ4MQ==?=';
    expect(decodeEncodedWords(folded)).toBe(
      '[TESTE] Abertura de MED - Solicitação de devolução Pix - MED-2026-000481',
    );
  });

  it('decodifica Q, onde `_` e espaco', () => {
    expect(decodeEncodedWords('=?UTF-8?Q?dois_n=C3=ADveis?=')).toBe('dois níveis');
  });
});

describe('parseMessage', () => {
  it('escolhe text/plain do multipart, nao o html', () => {
    const message = parseMessage(RAW);
    expect(message.text).toContain('ID do MED: MED-2026-000481');
    expect(message.text).not.toContain('<div');
  });

  it('decodifica o assunto dobrado', () => {
    expect(parseMessage(RAW).headers.get('subject')).toBe(
      '[TESTE] Abertura de MED - Solicitação de devolução Pix - MED-2026-000481',
    );
  });
});

describe('valores brasileiros', () => {
  it('le data e hora com o fuso assumido de Brasilia', () => {
    // 10:47 em -03:00 e 13:47 em UTC.
    expect(parseBrazilianDateTime('28/08/2026 10:47')).toBe('2026-08-28T13:47:00.000Z');
  });

  it('aceita data sem hora', () => {
    expect(parseBrazilianDateTime('29/08/2026')).toBe('2026-08-29T03:00:00.000Z');
  });

  it('recusa data impossivel em vez de deslizar para outro dia', () => {
    expect(parseBrazilianDateTime('31/02/2026')).toBeNull();
  });

  it('le dinheiro em centavos', () => {
    expect(parseBrazilianMoney('R$ 349,90')).toBe(34990);
    expect(parseBrazilianMoney('R$ 1.234,56')).toBe(123456);
    expect(parseBrazilianMoney('R$ 80')).toBe(8000);
  });
});

describe('aviso de MED real', () => {
  const reading = readMedNotice(RAW);

  it('reconhece o aviso', () => {
    expect(reading.recognized).toBe(true);
  });

  it('le os identificadores', () => {
    expect(reading.draft.medId).toBe('MED-2026-000481');
    expect(reading.draft.transactionId).toBe('TXN-8842010397');
    expect(reading.draft.endToEndId).toBe('E00000000202608281047ABCDEF12345');
    expect(reading.draft.pixId).toBe('11999998888');
  });

  it('le valor e datas', () => {
    expect(reading.draft.amountCents).toBe(34990);
    expect(reading.draft.currency).toBe('BRL');
    expect(reading.draft.transactionAt).toBe('2026-08-28T13:47:00.000Z');
    expect(reading.draft.openedAt).toBe('2026-09-03T17:32:00.000Z');
    expect(reading.draft.responseDeadlineAt).toBe('2026-09-11T02:59:00.000Z');
  });

  it('traduz motivo e tipo de produto para o dominio', () => {
    expect(reading.draft.reason).toBe('PRODUCT_NOT_RECEIVED');
    expect(reading.draft.productType).toBe('PHYSICAL');
  });

  it('junta a descricao que vinha partida em duas linhas', () => {
    expect(reading.draft.reasonDescription).toBe(
      'O comprador alega que efetuou o pagamento em 28/08/2026 e não recebeu o produto até a presente data.',
    );
  });

  it('le o pagador, com documento so em digitos', () => {
    expect(reading.draft.payerName).toBe('Maria Aparecida Souza');
    expect(reading.draft.payerDocument).toBe('11111111111');
    expect(reading.draft.payerEmail).toBe('maria.souza@exemplo.com');
    expect(reading.draft.payerPhone).toBe('(11) 99999-8888');
  });

  it('le recebedor, instituicao e informacoes adicionais', () => {
    expect(reading.draft.requestingInstitution).toBe('Banco Exemplo S.A.');
    expect(reading.draft.merchantName).toBe('Ironpay Tecnologia Servicos e Pagamentos LTDA');
    expect(reading.draft.additionalInformation).toBe(
      'Pedido nº 10482. Envio declarado pelo lojista em 29/08/2026.',
    );
  });

  it('declara que assumiu o fuso nas tres datas', () => {
    expect(reading.assumedTimezone.sort()).toEqual([
      'openedAt',
      'responseDeadlineAt',
      'transactionAt',
    ]);
  });

  it('nao inventa o que o aviso nao trouxe', () => {
    // O aviso nao tem IP nem device do pagador — e o rascunho tambem nao.
    expect(reading.missing).toEqual([]);
  });
});

describe('o que falta fica faltando', () => {
  it('lista os campos ausentes em vez de preencher', () => {
    const reading = readMedNoticeText('ID do MED: MED-1\nValor: R$ 10,00');
    expect(reading.draft.medId).toBe('MED-1');
    expect(reading.draft.payerName).toBeNull();
    expect(reading.missing).toContain('payerName');
    expect(reading.missing).toContain('openedAt');
  });

  it('motivo desconhecido nao vira OTHER', () => {
    const reading = readMedNoticeText('ID do MED: MED-1\nMotivo: Coisa que ninguem previu');
    expect(reading.draft.reason).toBeNull();
    expect(reading.unmapped).toContainEqual({
      label: 'Motivo',
      value: 'Coisa que ninguem previu',
    });
  });

  it('rotulo desconhecido e reportado, nao descartado em silencio', () => {
    const reading = readMedNoticeText('ID do MED: MED-1\nCampo Novo Do Banco: 42');
    expect(reading.unmapped).toContainEqual({ label: 'Campo Novo Do Banco', value: '42' });
  });

  it('texto que nao e aviso de MED nao e reconhecido', () => {
    expect(readMedNoticeText('Oi, tudo bem? Segue o boleto.').recognized).toBe(false);
  });
});
