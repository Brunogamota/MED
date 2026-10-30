import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Comprovante } from '@/components/previews/marketplace/opcao-1/comprovante';
import { PrintButton } from '@/components/previews/marketplace/opcao-1/print-button';

export const dynamic = 'force-static';

export default function Opcao1ComprovantePage() {
  return (
    <div className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex w-full max-w-[780px] items-center justify-between gap-3 print:hidden">
        <Link
          href="/preview/marketplace/opcao-1"
          className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-2 text-[13px] font-medium text-[#425466] transition-colors hover:bg-white hover:text-[#0B1F3A]"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Voltar ao console
        </Link>
        <PrintButton />
      </div>
      <Comprovante />
    </div>
  );
}
