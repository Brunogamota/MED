import { z } from 'zod';
import { parseBody, withAuth } from '@/lib/api';
import { createMedSchema } from '@/domain/schemas';
import { createMedWithOutcome } from '@/services/medService';

export const dynamic = 'force-dynamic';

const batchSchema = z.object({
  meds: z.array(createMedSchema).min(1).max(500),
});

/**
 * Criacao de varios MEDs em uma chamada, para quem integra direto com a
 * adquirente em vez de subir arquivo.
 *
 * Cada item e processado individualmente: um erro em um MED nao descarta os
 * demais, e a resposta diz exatamente o que aconteceu com cada um. Idempotente
 * pelo identificador do MED.
 */
export async function POST(request: Request) {
  return withAuth(request, async (auth) => {
    const { meds } = await parseBody(request, batchSchema);

    const results = [];
    for (const [index, input] of meds.entries()) {
      try {
        const { med, created } = await createMedWithOutcome(auth, input);
        results.push({
          index,
          medId: med.medId,
          id: med.id,
          outcome: created ? 'CREATED' : 'DUPLICATE',
        });
      } catch (error) {
        results.push({
          index,
          medId: input.medId,
          id: null,
          outcome: 'FAILED',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return {
      data: {
        total: results.length,
        created: results.filter((result) => result.outcome === 'CREATED').length,
        duplicated: results.filter((result) => result.outcome === 'DUPLICATE').length,
        failed: results.filter((result) => result.outcome === 'FAILED').length,
        results,
      },
    };
  });
}
