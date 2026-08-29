import { parseBody, withAuth } from '@/lib/api';
import { upsertCustomerSchema } from '@/domain/schemas';
import { upsertCustomer } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, upsertCustomerSchema);
    return { data: await upsertCustomer(auth, id, input) };
  });
}
