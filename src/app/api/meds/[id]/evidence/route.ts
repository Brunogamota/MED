import { parseBody, withAuth, withAuthCreated } from '@/lib/api';
import { createEvidenceSchema } from '@/domain/schemas';
import { addEvidence, getCase } from '@/services/medService';
import { assessEvidence } from '@/domain/evidence/engine';
import { deriveEvidence, mergeEvidence } from '@/domain/evidence/derive';
import { resolveProductType } from '@/domain/defense/engine';

export const dynamic = 'force-dynamic';

/** Current evidence picture: what is available, what is missing, and the score. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const medCase = await getCase(auth, id);
    const evidences = mergeEvidence(medCase.evidences, deriveEvidence(medCase));
    const assessment = assessEvidence({
      productType: resolveProductType(medCase),
      reason: medCase.med.reason,
      evidences,
    });
    return { data: { assessment, evidences } };
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthCreated(request, async (auth) => {
    const input = await parseBody(request, createEvidenceSchema);
    return { data: await addEvidence(auth, id, input) };
  });
}
