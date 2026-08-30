import { z } from 'zod';
import { parseBody, withAuth } from '@/lib/api';
import { importMedsFromText } from '@/services/importService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const importSchema = z.object({
  /** Conteúdo do arquivo da adquirente (CSV, ponto e vírgula ou vírgula). */
  csv: z.string().min(1),
  /** Usada apenas nas linhas em que o arquivo não traz a data de abertura. */
  defaultOpenedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida')
    .optional(),
  batchReference: z.string().trim().min(1).optional(),
});

/**
 * Importação em lote. Idempotente pelo identificador do MED: reenviar o mesmo
 * arquivo devolve o relatório com as linhas marcadas como duplicadas, sem criar
 * nada de novo.
 */
export async function POST(request: Request) {
  return withAuth(request, async (auth) => {
    const contentType = request.headers.get('content-type') ?? '';

    const input = contentType.includes('text/csv')
      ? { csv: await request.text(), defaultOpenedAt: undefined, batchReference: undefined }
      : await parseBody(request, importSchema);

    const { parsed, report } = await importMedsFromText(auth, input.csv, {
      defaultOpenedAt: input.defaultOpenedAt,
      batchReference: input.batchReference,
    });

    return {
      data: {
        fatalError: parsed.fatalError,
        recognizedColumns: parsed.recognized,
        ignoredColumns: parsed.ignored,
        report,
      },
    };
  });
}
