import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ComprovanteCard, PrintButton } from '@/components/previews/opcao-2/comprovante-card';

export const dynamic = 'force-static';

export default function Opcao2ComprovantePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(900px_420px_at_50%_-120px,var(--o2-brand-soft),transparent_70%)] px-4 py-6 sm:px-6 sm:py-10 print:bg-none print:p-0">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/preview/bulls/opcao-2"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-[var(--o2-ink-2)] outline-none transition-colors hover:bg-[var(--o2-brand-wash)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Visão geral
          </Link>
          <PrintButton />
        </div>
        <ComprovanteCard />
      </div>
    </main>
  );
}
