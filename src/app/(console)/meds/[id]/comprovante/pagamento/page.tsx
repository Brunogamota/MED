import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import { getCase } from '@/services/medService';
import { NotFoundError } from '@/services/errors';
import { PaymentReceiptCard } from '@/components/PaymentReceiptCard';

export const dynamic = 'force-dynamic';

/**
 * Página de impressão do comprovante de pagamento: a visão do cliente em tela
 * cheia, pronta para imprimir (salvar em PDF pelo navegador) ou capturar como
 * print. O selo de reconstrução vai junto no PaymentReceiptCard e não pode ser
 * removido.
 */
export default async function ComprovantePagamentoPage({
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
    <div className="mx-auto max-w-[440px] py-4">
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
      <PaymentReceiptCard medCase={medCase} />
    </div>
  );
}
