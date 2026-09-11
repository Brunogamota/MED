import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * Duas responsabilidades, nesta ordem: proteger o console e destravar as
 * Server Actions em desenvolvimento.
 *
 * **Sessão.** Quando `ADMIN_PASSWORD_HASH` e `SESSION_SECRET` existem, toda
 * rota fora de `/login` e da API exige um cookie de sessão assinado e no
 * prazo.
 *
 * Faltando as variáveis, nada é bloqueado: o console abre sem pedir senha, em
 * qualquer ambiente.
 *
 * Houve aqui um fechamento automático em produção, e ele saiu. O efeito real
 * não foi proteger dado, foi trancar quem administra do lado de fora do
 * próprio deploy, sem caminho de volta pela interface — a mesma tela que
 * pedia a configuração era a que só a configuração destravava. Porta aberta
 * que o dono sabe que deixou é um risco que ele escolhe; porta que tranca o
 * dono não é escolha de ninguém.
 *
 * Para fechar: `npm run gerar-senha`, e defina `ADMIN_PASSWORD_HASH` e
 * `SESSION_SECRET`. A partir daí toda rota fora de `/login` e da API exige
 * sessão. Enquanto não forem definidas, a tela de login e a tela de Equipe
 * dizem, as duas, que o console está aberto.
 *
 * As rotas de API ficam de fora porque têm autenticação própria, por API key
 * (`infra/auth/context.ts`); um cookie de navegador não serve para elas.
 *
 * **Origem em desenvolvimento.** O Next protege Server Actions contra CSRF
 * exigindo que o `Origin` bata com o `Host`. Aberto por um host encaminhado
 * (Codespaces, túnel, preview), os dois não coincidem e todo POST de
 * formulário é recusado. Fora de produção reescrevemos o `Origin` para o host
 * da requisição; em produção isso não acontece e a proteção fica íntegra.
 */

// `/privacidade` fica aberta de proposito: o Google busca a URL da politica
// sem sessao ao publicar o app OAuth, e um redirect para /login faria a
// verificacao falhar. E, de todo modo, politica de privacidade atras de login
// nao e politica publica.
const PUBLIC_PREFIXES = ['/login', '/privacidade', '/api', '/_next'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function relaxOriginInDevelopment(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === 'production') return NextResponse.next();

  const origin = request.headers.get('origin');
  if (!origin) return NextResponse.next();

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return NextResponse.next();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.next();
  }
  if (originHost === host) return NextResponse.next();

  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const headers = new Headers(request.headers);
  headers.set('origin', `${proto}://${host}`);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const sessionSecret = process.env.SESSION_SECRET?.trim();
  const authEnabled = Boolean(process.env.ADMIN_PASSWORD_HASH?.trim() && sessionSecret);
  const { pathname } = request.nextUrl;

  if (authEnabled && sessionSecret && !isPublic(pathname)) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret);
    if (!session) {
      const login = new URL('/login', request.url);
      // Guarda para onde a pessoa ia, para voltar depois de entrar.
      if (pathname !== '/') login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
  }

  return relaxOriginInDevelopment(request);
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next.
  matcher: ['/((?!_next/image|favicon.ico).*)'],
};
