import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { o2Vars } from '@/components/previews/opcao-2/tokens';

/** Plus Jakarta Sans só nesta prévia: a variável vive no invólucro abaixo. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bulls Cash · Opção 2 — Bento Claro',
  description: 'Prévia de direção visual do console de defesa de MED para a Bulls Cash.',
};

/**
 * Invólucro da Opção 2. As variáveis em `o2Vars` redefinem os papéis do shadcn
 * para os descendentes, então as primitivas de `components/ui` saem nesta
 * paleta sem tocar em `globals.css` — e sempre claras, com ou sem `.dark`.
 */
export default function Opcao2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={o2Vars}
      className={`${jakarta.variable} min-h-screen bg-background font-sans text-foreground antialiased selection:bg-[var(--o2-brand-soft)] selection:text-[var(--o2-brand-deep)] print:bg-white`}
    >
      {children}
    </div>
  );
}
