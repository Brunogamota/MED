'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Op3PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="h-10 gap-2 rounded-full px-4"
    >
      <Printer />
      Imprimir
    </Button>
  );
}
