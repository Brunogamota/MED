import { parseBody, withAuth, withAuthCreated } from '@/lib/api';
import { createMedSchema, listMedsQuerySchema } from '@/domain/schemas';
import { createMed, listMeds } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withAuth(request, async (auth) => {
    const url = new URL(request.url);
    const filter = listMedsQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    return { data: await listMeds(auth, filter) };
  });
}

export async function POST(request: Request) {
  return withAuthCreated(request, async (auth) => {
    const input = await parseBody(request, createMedSchema);
    return { data: await createMed(auth, input) };
  });
}
