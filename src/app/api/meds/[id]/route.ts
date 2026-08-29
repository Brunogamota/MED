import { parseBody, withAuth } from '@/lib/api';
import { updateMedSchema } from '@/domain/schemas';
import { getCase, updateMed } from '@/services/medService';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (auth) => ({ data: await getCase(auth, id) }));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, updateMedSchema);
    return { data: await updateMed(auth, id, input) };
  });
}
