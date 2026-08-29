import { parseBody, withAuth } from '@/lib/api';
import { upsertTransactionSchema } from '@/domain/schemas';
import { upsertTransaction } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, upsertTransactionSchema);
    return { data: await upsertTransaction(auth, id, input) };
  });
}
