import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';
import { EDITORIAL_VARS } from '@/components/previews/marketplace/opcao-2/tokens';

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-ed-fraunces',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-ed-instrument',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ed-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Opção 2 · Editorial Âmbar · Marketplace Verificado',
};

export default function EditorialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable} min-h-screen bg-(--ed-paper) font-sans text-(--ed-ink) antialiased selection:bg-(--ed-brand-soft) selection:text-(--ed-brand-hover)`}
      style={EDITORIAL_VARS}
    >
      {children}
    </div>
  );
}
