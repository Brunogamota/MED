import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ComprovanteTicket } from '@/components/previews/marketplace/opcao-3/comprovante-ticket';
import { PrintButton } from '@/components/previews/marketplace/opcao-3/print-button';

export const dynamic = 'force-static';

/** Comprovante de envio da opção 3: bilhete claro, centrado no chão escuro. */
export default function NoiteCoralComprovantePage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8 sm:py-12 print:bg-white print:p-0">
      <div className="mb-8 flex w-full max-w-[660px] items-center justify-between gap-3 print:hidden">
        <Link
          href="/preview/marketplace/opcao-3"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-[13.5px] text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-2) hover:text-(--nc-text)"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Voltar à visão geral
        </Link>
        <PrintButton />
      </div>
      <ComprovanteTicket />
    </div>
  );
}
