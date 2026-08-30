import { NextResponse } from 'next/server';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import { mapError } from '@/lib/api';
import { maskDocument } from '@/lib/format';
import { MED_STATUS_LABEL } from '@/lib/labels';

export const dynamic = 'force-dynamic';

/**
 * Busca da paleta de comandos (Cmd+K).
 *
 * Rota interna da interface: usa a mesma autenticação das páginas
 * (serverPageContext), não a de API key — o navegador do operador não carrega
 * credencial de API. Devolve linhas enxutas e com documento mascarado; o
 * detalhe completo fica na página do caso.
 */
export async function GET(request: Request) {
  try {
    const auth = serverPageContext();
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() ?? '';
    if (query.length < 2) return NextResponse.json({ data: [] });

    const rows = await listMeds(auth, { search: query, limit: 8 });
    return NextResponse.json({
      data: rows.map(({ med }) => ({
        id: med.id,
        medId: med.medId,
        payerName: med.payer.name ?? null,
        payerDocument: maskDocument(med.payer.document),
        amount: med.amount,
        currency: med.currency,
        status: MED_STATUS_LABEL[med.status],
      })),
    });
  } catch (error) {
    return mapError(error);
  }
}
