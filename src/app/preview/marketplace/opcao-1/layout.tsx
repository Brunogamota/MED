import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeRoot } from '@/components/previews/marketplace/opcao-1/theme-root';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-o1-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-o1-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Opção 1 · Selo Azul · Marketplace Verificado',
};

export default function Opcao1Layout({ children }: { children: React.ReactNode }) {
  return <ThemeRoot className={`${sans.variable} ${mono.variable}`}>{children}</ThemeRoot>;
}
