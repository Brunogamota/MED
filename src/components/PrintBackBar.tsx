import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Barra de volta das páginas de impressão nos ambientes com cromo próprio
 * (Bulls Cash, Marketplace Verificado). Some no papel.
 */
export function PrintBackBar({ href, label = 'Voltar ao MED' }: { href: string; label?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Button asChild variant="outline">
        <Link href={href}>
          <ArrowLeft data-icon="inline-start" />
          {label}
        </Link>
      </Button>
      <span className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Printer className="size-4" aria-hidden />
        Ctrl/Cmd+P salva em PDF; ou capture a tela.
      </span>
    </div>
  );
}
