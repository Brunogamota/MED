import { serverPageContext } from '@/infra/auth/context';
import { mapError } from '@/lib/api';
import { getEvidencePack } from '@/services/medService';
import { masterAuthFor } from '@/services/masterService';
import { renderDefenseReport } from '@/infra/pdf/defenseReport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PDF da defesa de um MED de qualquer empresa, para o lote da conta Master.
 *
 * Fica atrás do login do console (não em `/api`, que é de máquina com chave):
 * quem chega aqui já pode trocar para qualquer conta. A conta pedida é
 * conferida contra as que existem, e a leitura filtra pela organização dela.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get('conta') ?? '';
  const id = url.searchParams.get('id') ?? '';
  try {
    const { auth } = await masterAuthFor(await serverPageContext(), accountId);
    const pack = await getEvidencePack(auth, id);
    const bytes = await renderDefenseReport(pack);
    return new Response(bytes as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="med-${pack.med.medId}-defesa-v${pack.defense.version}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return mapError(error);
  }
}
