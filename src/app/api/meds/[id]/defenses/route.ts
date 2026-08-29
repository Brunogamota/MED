import { withAuth } from '@/lib/api';
import { listDefenses } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => ({ data: await listDefenses(auth, id) }));
}
