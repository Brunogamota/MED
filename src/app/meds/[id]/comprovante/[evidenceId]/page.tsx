import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import { getCase } from '@/services/medService';
import { NotFoundError } from '@/services/errors';
import { parseCommunicationReceipt } from '@/domain/communication/receipt';
import { ClientEmailView } from '@/components/ClientEmailView';

export const dynamic = 'force-dynamic';

/**
 * Página de impressão do comprovante: a visão do cliente em tela cheia, pronta
 * para imprimir (salvar em PDF pelo navegador) ou capturar como print. O selo
 * de reconstrução vai junto no ClientEmailView e não pode ser removido.
 */
export default async function ComprovantePage({
  params,
}: {
  params: Promise<{ id: string; evidenceId: string }>;
}) {
  const { id, evidenceId } = await params;
  const auth = serverPageContext();

  let medCase;
  try {
    medCase = await getCase(auth, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const evidence = medCase.evidences.find(
    (item) => item.id === evidenceId && item.type === 'DELIVERY_COMMUNICATION',
  );
  const receipt = evidence ? parseCommunicationReceipt(evidence.value) : null;
  if (!receipt) notFound();

  return (
    <div className="mx-auto max-w-[680px] py-4">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link
          href={`/meds/${id}?tab=evidencias`}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Voltar ao MED
        </Link>
        <span className="text-xs text-[var(--color-text-muted)]">
          Use Imprimir (Ctrl/Cmd+P) para salvar em PDF, ou capture a tela.
        </span>
      </div>
      <ClientEmailView receipt={receipt} />
    </div>
  );
}
