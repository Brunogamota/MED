import { parseBody, withAuth } from '@/lib/api';
import { upsertTrackingSchema } from '@/domain/schemas';
import { upsertTracking } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, upsertTrackingSchema);
    return { data: await upsertTracking(auth, id, input) };
  });
}
