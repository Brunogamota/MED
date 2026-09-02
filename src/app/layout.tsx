import type { Metadata } from 'next';
import { APP_CONFIG } from '@/config/app';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

/**
 * Layout raiz: só o documento e os provedores.
 *
 * O cromo do console (trilho, painel, cabeçalho) mora em `(console)/layout`,
 * porque o login precisa da mesma base de tema sem herdar a navegação — quem
 * ainda não entrou não deve ver o menu do que existe lá dentro.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
