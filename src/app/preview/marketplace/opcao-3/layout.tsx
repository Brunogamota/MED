import type { Metadata } from 'next';
import { cn } from '@/lib/cn';
import { NOITE_FONT_CLASS, NOITE_STYLE } from '@/components/previews/marketplace/opcao-3/theme';

export const metadata: Metadata = {
  title: 'Noite Coral · Marketplace Verificado',
};

/**
 * Invólucro da opção 3. As variáveis ficam neste nó, não no <html>: assim a
 * paleta vale para tudo que está dentro, com ou sem a classe `.dark` na raiz.
 */
export default function NoiteCoralLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-preview="noite-coral"
      style={NOITE_STYLE}
      className={cn(
        NOITE_FONT_CLASS,
        'min-h-screen bg-(--nc-bg) font-sans text-(--nc-text) antialiased selection:bg-(--nc-coral)/30',
      )}
    >
      {children}
    </div>
  );
}
