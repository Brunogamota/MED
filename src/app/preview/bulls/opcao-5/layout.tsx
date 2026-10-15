import type { Metadata } from 'next';
import { O5_FONT_VARS } from '@/components/previews/opcao-5/fonts';
import { GlowBackdrop } from '@/components/previews/opcao-5/glow-backdrop';
import { O5_VARS } from '@/components/previews/opcao-5/theme';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Opção 5 · Vidro Noturno — Bulls Cash',
};

/**
 * Prévia "Vidro Noturno": noite profunda com brilho roxo e superfícies de
 * vidro. Os tokens do shadcn são redefinidos neste wrapper, então nada fora
 * de /preview/bulls/opcao-5 muda.
 */
export default function Opcao5Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={O5_VARS}
      className={cn(
        O5_FONT_VARS,
        'relative isolate min-h-screen overflow-x-clip bg-background text-foreground antialiased selection:bg-(--o5-brand)/40 print:bg-white',
      )}
    >
      <GlowBackdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
