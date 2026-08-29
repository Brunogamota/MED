import { parseBody, withAuth, withAuthCreated } from '@/lib/api';
import { createSubmissionSchema } from '@/domain/schemas';
import { createSubmission, listSubmissions } from '@/services/medService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => ({ data: await listSubmissions(auth, id) }));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthCreated(request, async (auth) => {
    const input = await parseBody(request, createSubmissionSchema);
    return { data: await createSubmission(auth, id, input) };
  });
}
