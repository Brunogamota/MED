'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-(--o4-brand-strong) bg-(--o4-brand-strong) px-3 text-[13px] font-medium text-primary-foreground outline-none transition-colors hover:bg-(--o4-brand) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Printer aria-hidden="true" className="size-3.5" />
      Imprimir
    </button>
  );
}
