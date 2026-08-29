import { parseBody, withAuth } from '@/lib/api';
import { recordShipmentSchema } from '@/domain/schemas';
import { recordShipment } from '@/services/fulfillmentService';

export const dynamic = 'force-dynamic';

/**
 * Registra o status de entrega de um produto fisico com os marcos datados.
 * Complementa os eventos vindos da transportadora, sem apaga-los.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const input = await parseBody(request, recordShipmentSchema);
    return { data: await recordShipment(auth, id, input) };
  });
}
