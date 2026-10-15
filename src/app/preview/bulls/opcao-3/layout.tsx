import type { Metadata } from 'next';
import { op3Sans } from '@/components/previews/opcao-3/fonts';
import { OP3_CSS, OP3_THEME_CLASS } from '@/components/previews/opcao-3/theme';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Bulls Cash · Opção 3 — Banking App',
};

/**
 * Invólucro da Opção 3: carrega a fonte e redefine os tokens do shadcn só aqui
 * dentro. Claro sempre, mesmo com `.dark` no `<html>` — a paleta é a mesma
 * nos dois casos e `color-scheme: light` mantém os controles nativos claros.
 */
export default function Opcao3Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OP3_CSS }} />
      <div
        className={cn(
          op3Sans.variable,
          OP3_THEME_CLASS,
          'min-h-screen bg-background text-foreground antialiased print:bg-white',
        )}
      >
        {children}
      </div>
    </>
  );
}
