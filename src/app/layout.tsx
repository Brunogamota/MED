import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { APP_CONFIG } from '@/config/app';
import { MotionProvider } from '@/components/layout/motion-provider';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getActiveAccount } from '@/services/accountService';
import { LIGHT_ONLY_SKINS, type SkinId } from '@/config/skins';
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

/* Ambiente Bulls Cash: Plus Jakarta Sans em tudo — título, corpo e número. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

/** Ambiente da conta em uso. Falha de leitura cai no padrão, não derruba a página. */
async function activeSkin(): Promise<{ skin: SkinId; name: string | null }> {
  try {
    const account = await getActiveAccount();
    return { skin: account.skin, name: account.isDefault ? null : account.name };
  } catch {
    return { skin: 'jade', name: null };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await activeSkin();
  return {
    title: name ? `${name} · Defesa de MED` : APP_CONFIG.name,
    description: APP_CONFIG.description,
  };
}

/**
 * Layout raiz: só o documento e os provedores.
 *
 * O cromo do console (trilho, painel, cabeçalho) mora em `(console)/layout`,
 * porque o login precisa da mesma base de tema sem herdar a navegação — quem
 * ainda não entrou não deve ver o menu do que existe lá dentro.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { skin } = await activeSkin();
  return (
    <html
      lang="pt-BR"
      data-skin={skin}
      className={`${sans.variable} ${mono.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Bulls Cash e Marketplace Verificado são claros sempre: o tema do
            sistema não escurece o ambiente. */}
        <ThemeProvider forcedTheme={LIGHT_ONLY_SKINS.includes(skin) ? 'light' : undefined}>
          <MotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
