import { z } from 'zod';
import { parseBody, withAuth } from '@/lib/api';
import { importMedsFromText } from '@/services/importService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const importSchema = z.object({
  /** Conteudo do arquivo da adquirente (CSV, ponto e virgula ou virgula). */
  csv: z.string().min(1),
  /** Usada apenas nas linhas em que o arquivo nao traz a data de abertura. */
  defaultOpenedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Data invalida')
    .optional(),
  batchReference: z.string().trim().min(1).optional(),
});

/**
 * Importacao em lote. Idempotente pelo identificador do MED: reenviar o mesmo
 * arquivo devolve o relatorio com as linhas marcadas como duplicadas, sem criar
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
