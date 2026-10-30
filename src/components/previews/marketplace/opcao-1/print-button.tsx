'use client';

import { PrinterIcon } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#1D4ED8] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E40AF] focus-visible:ring-3 focus-visible:ring-[#1D4ED8]/30 focus-visible:outline-none"
    >
      <PrinterIcon className="size-4" aria-hidden="true" />
      Imprimir
    </button>
  );
}
