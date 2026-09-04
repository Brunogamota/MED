import { type NextRequest, NextResponse } from 'next/server';
import { serverPageContext } from '@/infra/auth/context';
import { readRawMessage } from '@/services/gmailService';

export const dynamic = 'force-dynamic';

/**
 * Baixa uma mensagem inteira, no formato `.eml`.
 *
 * Existe para tirar da caixa um MED real e escrever o parser contra ele. O
 * arquivo sai como anexo — nao renderizado —, porque um e-mail de terceiro
 * exibido inline no nosso dominio e HTML de terceiro rodando no nosso dominio.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Informe o id da mensagem em ?id=' }, { status: 400 });
  }

  const result = await readRawMessage(serverPageContext().organizationId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }

  return new NextResponse(result.raw, {
    headers: {
      'content-type': 'message/rfc822; charset=utf-8',
      'content-disposition': `attachment; filename="gmail-${id}.eml"`,
      // Mensagem de e-mail nao e conteudo publico: fora de cache compartilhado.
      'cache-control': 'no-store',
    },
  });
}
