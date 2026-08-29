import { parseBody, withAuthCreated } from '@/lib/api';
import { generateDefenseSchema } from '@/domain/schemas';
import { generateDefenseForMed } from '@/services/medService';

export const dynamic = 'force-dynamic';

/**
 * Generates a new immutable defense version. Repeated calls append versions
 * rather than overwriting: the previously generated defense is always preserved.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthCreated(request, async (auth) => {
    const input = await parseBody(request, generateDefenseSchema).catch(() => ({ useLlm: false }));
    return { data: await generateDefenseForMed(auth, id, { useLlm: input.useLlm }) };
  });
}
