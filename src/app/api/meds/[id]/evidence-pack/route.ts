import { withAuth } from '@/lib/api';
import { getEvidencePack } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => ({ data: await getEvidencePack(auth, id) }));
}
