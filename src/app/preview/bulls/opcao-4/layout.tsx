import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { O4_ROOT_CLASS, O4_TOKENS_CSS } from '@/components/previews/opcao-4/tokens';

/**
 * Opção 4 — "Analytics Denso".
 *
 * Grafite escuro, roxo de marca, grade de 8px. Os tokens do shadcn são
 * redefinidos só dentro desta árvore (e no portal do menu móvel), então as
 * primitivas de `components/ui` e o `chart.tsx` saem nesta paleta sem tocar
 * no `globals.css`.
 */
const geist = Geist({ subsets: ['latin'], variable: '--font-o4-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-o4-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Bulls Cash · Opção 4 — Analytics Denso',
};

export default function Opcao4Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: O4_TOKENS_CSS }} />
      <div
        className={`${O4_ROOT_CLASS} ${geist.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased print:bg-white`}
      >
        {children}
      </div>
    </>
  );
}
