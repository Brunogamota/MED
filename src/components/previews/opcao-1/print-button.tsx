'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button variant="outline" className="border-white/[0.08] bg-transparent text-(--o1-text-2)" onClick={() => window.print()}>
      <Printer />
      Imprimir
    </Button>
  );
}
