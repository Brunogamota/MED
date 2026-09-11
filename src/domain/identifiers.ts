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
/**
 * Formato do End-to-End ID do Pix, definido pelo arranjo.
 *
 * `E` + 8 dígitos de ISPB + 12 dígitos de data e hora (AAAAMMDDHHMM) + 11
 * alfanuméricos. São 32 caracteres, e nenhum outro identificador do caso tem
 * essa forma — por isso dá para reconhecê-lo sem depender de qual campo o
 * guardou.
 */
const END_TO_END_FORMAT = /^E\d{8}\d{12}[A-Za-z0-9]{11}$/;

export function looksLikeEndToEndId(value: string | null | undefined): boolean {
  return typeof value === 'string' && END_TO_END_FORMAT.test(value.trim());
}

export function resolveEndToEndId(source: {
  med: Pick<Med, 'endToEndId' | 'medId'>;
  transaction?: Pick<Transaction, 'endToEndId'> | null;
}): string | null {
  if (source.med.endToEndId) return source.med.endToEndId;
  if (source.transaction?.endToEndId) return source.transaction.endToEndId;

  // Várias instituições usam o próprio end-to-end como identificador do MED.
  // Quando o `medId` tem exatamente essa forma, ele **é** o end-to-end — dizer
  // "não informado" com o número impresso no topo da tela é errado, e nada
  // aqui é inventado: o valor já estava no registro.
  if (looksLikeEndToEndId(source.med.medId)) return source.med.medId.trim();
  return null;
}
