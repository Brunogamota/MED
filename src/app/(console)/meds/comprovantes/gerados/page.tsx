import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { serverPageContext } from '@/infra/auth/context';
import { listGeneratedReceipts } from '@/services/medService';
import {
  COMMUNICATION_TEMPLATE_LABEL,
  parseCommunicationReceipt,
} from '@/domain/communication/receipt';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 50;

/**
 * Comprovantes gerados: a lista, não as peças.
 *
 * O lote (`/meds/comprovantes`) monta cada peça inteira na página para
 * imprimir ou baixar. Com centenas de casos de uma vez ele não terminava. Aqui
 * a lista é leve (uma consulta, cinquenta por página, mais novos primeiro) e
 * "Baixar esta página" abre o lote só com os casos dela.
 */
export default async function ComprovantesGeradosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { pagina } = await searchParams;
  const atual = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1);
  const auth = await serverPageContext();
  const { total, rows } = await listGeneratedReceipts(auth, {
    limit: POR_PAGINA,
    offset: (atual - 1) * POR_PAGINA,
  });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const casosDaPagina = [...new Set(rows.map((row) => row.med.id))];
  const inicio = total === 0 ? 0 : (atual - 1) * POR_PAGINA + 1;
  const fim = Math.min(atual * POR_PAGINA, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comprovantes gerados"
        description="Todos os comprovantes já gerados, dos mais novos para os mais antigos. Abra um para ver, ou baixe a página inteira de uma vez."
        actions={
          casosDaPagina.length > 0 ? (
            <Button asChild>
              <Link href={`/meds/comprovantes?ids=${casosDaPagina.join(',')}`}>
                <Download data-icon="inline-start" />
                Baixar esta página ({rows.length})
              </Link>
            </Button>
          ) : null
        }
      />

      {total === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-card-foreground">
          <p className="font-medium">Nenhum comprovante gerado ainda.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Eles aparecem aqui quando você sobe os envios em{' '}
            <Link href="/meds/entregas" className="font-medium text-primary hover:underline">
              Importar envios
            </Link>{' '}
            com “Gerar o comprovante” marcado.
          </p>
        </div>
      ) : (
        <div data-slot="card" className="overflow-hidden rounded-xl border bg-card text-card-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {inicio}–{fim} de {total} comprovante{total === 1 ? '' : 's'}
            </span>
            <Paginacao atual={atual} paginas={paginas} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">MED</th>
                  <th className="px-4 py-2.5 font-medium">Comprador</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Enviado em</th>
                  <th className="px-4 py-2.5 font-medium">Gerado em</th>
                  <th className="px-4 py-2.5" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ evidence, med }) => {
                  const receipt = parseCommunicationReceipt(evidence.value);
                  return (
                    <tr key={evidence.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2.5 font-mono text-xs">{med.medId}</td>
                      <td className="px-4 py-2.5">{receipt?.toName ?? med.payerName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {receipt ? COMMUNICATION_TEMPLATE_LABEL[receipt.template] : '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular">{formatDateTime(receipt?.sentAt) ?? '—'}</td>
                      <td className="px-4 py-2.5 tabular">{formatDateTime(evidence.createdAt) ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/meds/${med.id}/comprovante/${evidence.id}`}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Abrir
                          <ExternalLink className="size-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t px-4 py-3">
            <Paginacao atual={atual} paginas={paginas} />
          </div>
        </div>
      )}
    </div>
  );
}

function Paginacao({ atual, paginas }: { atual: number; paginas: number }) {
  if (paginas <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" disabled={atual <= 1}>
        <Link
          href={`/meds/comprovantes/gerados?pagina=${Math.max(1, atual - 1)}`}
          aria-disabled={atual <= 1}
          className={atual <= 1 ? 'pointer-events-none opacity-50' : undefined}
        >
          Anterior
        </Link>
      </Button>
      <span className="text-muted-foreground text-sm tabular">
        Página {atual} de {paginas}
      </span>
      <Button asChild variant="outline" size="sm" disabled={atual >= paginas}>
        <Link
          href={`/meds/comprovantes/gerados?pagina=${Math.min(paginas, atual + 1)}`}
          aria-disabled={atual >= paginas}
          className={atual >= paginas ? 'pointer-events-none opacity-50' : undefined}
        >
          Próxima
        </Link>
      </Button>
    </nav>
  );
}
