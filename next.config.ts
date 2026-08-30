import type { NextConfig } from 'next';

/**
 * Origens confiáveis para Server Actions e recursos de desenvolvimento.
 *
 * O Next protege Server Actions contra CSRF comparando o cabeçalho `Origin` com
 * o `Host`. Quando o app é aberto por um host diferente do que o servidor
 * enxerga — URL encaminhada do VS Code (Dev Tunnels), Codespaces, proxy, túnel
 * ou preview — os dois não coincidem e todo POST de action é recusado com
 * "Invalid Server Actions request". Navegar (GET) funciona; gerar qualquer
 * documento (POST) falha.
 *
 * O Next não permite um curinga total (`*` é bloqueado de propósito), então
 * enumeramos os provedores de encaminhamento mais comuns. Em produção na Vercel,
 * Origin e Host coincidem e a lista fica restrita ao próprio host do app.
 *
 * Acessa por um host que não está coberto? Declare-o em APP_ALLOWED_ORIGINS
 * (lista separada por vírgula), por exemplo:
 *   APP_ALLOWED_ORIGINS=meu-tunel.exemplo.dev,outro-host.com
 */
function hostFrom(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).host;
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV !== 'production';

const extraOrigins = (process.env.APP_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const appHost = hostFrom(process.env.NEXT_PUBLIC_APP_URL) ?? hostFrom(process.env.VERCEL_URL);

// Provedores de encaminhamento/túnel mais usados. `**.` cobre subdomínio de
// qualquer profundidade; `*.` cobre um nível.
const forwardingWildcards = [
  '**.devtunnels.ms', // VS Code / Microsoft Dev Tunnels
  '*.devtunnels.ms',
  '**.app.github.dev', // GitHub Codespaces
  '*.app.github.dev',
  '*.github.dev',
  '*.githubpreview.dev',
  '*.gitpod.io',
  '**.gitpod.io',
  '*.ngrok-free.app',
  '*.ngrok.io',
  '*.trycloudflare.com',
  '*.loca.lt',
  '*.csb.app',
  '*.e2b.dev',
  '*.vercel.app',
];

const allowedOrigins = [
  'localhost',
  '127.0.0.1',
  ...(appHost ? [appHost] : []),
  ...extraOrigins,
  // Os curingas de túnel só entram em desenvolvimento: em produção mantemos a
  // verificação de CSRF estrita, restrita ao host do próprio app.
  ...(isDev ? forwardingWildcards : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client'],
  // Libera o carregamento de recursos de dev a partir de hosts encaminhados.
  allowedDevOrigins: [...forwardingWildcards, ...extraOrigins],
  experimental: {
    // Libera a chamada de Server Actions a partir desses hosts.
    serverActions: {
      allowedOrigins,
      // Comprovante e upload trafegam arquivos e textos: 5 MB dá folga.
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
