import { parseBody, withAuthCreated } from '@/lib/api';
import { createDocumentSchema } from '@/domain/schemas';
import { addDocument } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthCreated(request, async (auth) => {
    const input = await parseBody(request, createDocumentSchema);
    return { data: await addDocument(auth, id, input) };
  });
}
