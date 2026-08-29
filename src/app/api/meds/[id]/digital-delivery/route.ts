import { parseBody, withAuth } from '@/lib/api';
import { recordDigitalDeliverySchema } from '@/domain/schemas';
import { recordDigitalDelivery } from '@/services/fulfillmentService';

export const dynamic = 'force-dynamic';

/** Registra a entrega de produto digital, servico ou assinatura. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, recordDigitalDeliverySchema);
    return { data: await recordDigitalDelivery(auth, id, input) };
  });
}
