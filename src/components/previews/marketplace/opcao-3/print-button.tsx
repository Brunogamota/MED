'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-(--nc-coral) px-3.5 text-[13.5px] font-medium text-(--primary-foreground) transition-colors hover:bg-(--nc-coral-hover)"
    >
      <Printer aria-hidden className="size-4" />
      Imprimir
    </button>
  );
}
