import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/cn';
import { O1_SCOPE, o1ThemeCss } from '@/components/previews/opcao-1/theme';

const geist = Geist({ subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Bulls Cash · Opção 1 — Pro Dark',
};

/**
 * Prévia da Opção 1. O tema é declarado numa classe (ver `theme.ts`) para que
 * as primitivas shadcn dentro do wrapper — e os portais que recebem a mesma
 * classe — usem esta paleta sem tocar em `globals.css`.
 */
export default function Opcao1Layout({ children }: { children: React.ReactNode }) {
  const css = o1ThemeCss(geist.style.fontFamily, geistMono.style.fontFamily);
  return (
    <div className={cn(O1_SCOPE, 'min-h-screen bg-background text-foreground antialiased')}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </div>
  );
}
