'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hardButton } from './ui';

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} className={hardButton('brand', 'h-9 text-[12px]')}>
      <Printer aria-hidden="true" />
      Imprimir
    </Button>
  );
}
