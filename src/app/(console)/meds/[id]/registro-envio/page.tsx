import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import { getCase } from '@/services/medService';
import { NotFoundError } from '@/services/errors';
import { DeliveryRecordSheet } from '@/components/DeliveryRecordSheet';

export const dynamic = 'force-dynamic';

/**
 * Página de impressão do registro de envio.
 *
 * Alternativa ao comprovante para quem prefere mandar o dado em vez da
 * representação da mensagem: mesma prova, sem reconstruir tela nenhuma.
 */
export default async function RegistroEnvioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = serverPageContext();

  let medCase;
  try {
    medCase = await getCase(auth, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto max-w-[680px] py-4">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link
          href={`/meds/${id}?tab=evidencias`}
          className="whitespace-nowrap text-xs text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao MED
        </Link>
        <span className="text-xs text-muted-foreground">
          Use Imprimir (Ctrl/Cmd+P) para salvar em PDF, ou capture a tela.
        </span>
      </div>
      <DeliveryRecordSheet medCase={medCase} />
    </div>
  );
}
