import type { Med, Transaction } from '@/domain/types';

/**
 * O End-to-End ID do caso, venha de onde vier.
 *
 * O identificador chega por dois caminhos: no aviso do MED (`med.endToEndId`)
 * ou digitado no formulario da transacao (`transaction.endToEndId`). Cada
 * consumidor resolvia isso por conta propria, e nao resolviam igual — o
 * detalhe do PDF olhava os dois, o cabecalho e o payload de envio olhavam so o
 * MED. Resultado: caso cujo E2E veio pelo formulario chegava a instituicao com
 * `endToEndId: null`, sem o unico numero que permite a ela achar a transacao
 * no SPI.
 *
 * O MED vem primeiro porque e o que a instituicao declarou; a transacao e o
 * que o lojista registrou. Quando os dois existem e divergem, a palavra da
 * instituicao prevalece — divergencia e assunto de risk flag, nao de escolha
 * silenciosa aqui.
 *
 * Puro: nao inventa identificador nenhum. Sem os dois, devolve `null`, e quem
 * exibe diz "nao informado".
 */
export function resolveEndToEndId(source: {
  med: Pick<Med, 'endToEndId'>;
  transaction?: Pick<Transaction, 'endToEndId'> | null;
}): string | null {
  return source.med.endToEndId ?? source.transaction?.endToEndId ?? null;
}
