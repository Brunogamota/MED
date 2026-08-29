import { authenticate } from '@/infra/auth/context';
import { mapError } from '@/lib/api';
import { getEvidencePack } from '@/services/medService';
import { renderDefenseReport } from '@/infra/pdf/defenseReport';

export const dynamic = 'force-dynamic';
// PDF generation is CPU-bound but small; it stays well inside the function
// budget configured in vercel.json.
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = authenticate(request.headers);
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
