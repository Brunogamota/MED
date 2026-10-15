'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-(--o5-violet) to-(--o5-brand) px-4 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(168_85_247/0.9)] transition-[filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Printer className="size-4" aria-hidden />
      Imprimir
    </button>
  );
}
