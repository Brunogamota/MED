import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { APP_CONFIG } from '@/config/app';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

/**
 * Uma família para tudo — título, rótulo, tabela, número.
 *
 * O `next/font` baixa e serve os arquivos junto com a aplicação: nada é pedido
 * a um domínio de terceiro em tempo de execução, e o texto não pisca trocando
 * de fonte no primeiro paint. Antes disto a pilha declarava 'Inter' sem nunca
 * carregá-la, então o console saía com a fonte do sistema de quem abrisse —
 * diferente em cada máquina.
 */
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Só para id técnico, end-to-end e trecho de arquivo. */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

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
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
