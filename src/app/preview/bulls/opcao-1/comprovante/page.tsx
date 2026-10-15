import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ComprovanteTicket } from '@/components/previews/opcao-1/comprovante-ticket';
import { PrintButton } from '@/components/previews/opcao-1/print-button';

export const dynamic = 'force-static';

export default function Opcao1ComprovantePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pt-6 pb-16 sm:pt-8 print:p-0">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px] print:hidden" />

      <div className="relative mb-8 flex w-full max-w-[600px] items-center justify-between gap-3 print:hidden">
        <Link
          href="/preview/bulls/opcao-1"
          className="inline-flex items-center gap-2 rounded-md text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para a visão geral
        </Link>
        <PrintButton />
      </div>

      <ComprovanteTicket />
    </div>
  );
}
