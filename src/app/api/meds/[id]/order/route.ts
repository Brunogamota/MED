import { parseBody, withAuth } from '@/lib/api';
import { upsertOrderSchema } from '@/domain/schemas';
import { upsertOrder } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, upsertOrderSchema);
    return { data: await upsertOrder(auth, id, input) };
  });
}
