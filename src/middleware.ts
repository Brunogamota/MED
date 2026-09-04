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
 * Faltando as variáveis, o que acontece depende do ambiente, e a diferença é
 * deliberada. Em desenvolvimento nada é bloqueado: exigir configuração para
 * rodar `next dev` só atrapalha. **Em produção o console fecha** e manda para
 * `/login`, que explica o que definir. Um deploy mal configurado servindo CPF,
 * nome e endereço de comprador para quem souber a URL é pior do que um deploy
 * fora do ar — e "esqueci de ligar o login" é exatamente o erro que acontece.
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

/** Produção é onde há dado real; é lá que a falta de login não pode passar. */
function isProduction(): boolean {
  return (process.env.VERCEL_ENV ?? process.env.APP_ENV) === 'production';
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const sessionSecret = process.env.SESSION_SECRET?.trim();
  const authEnabled = Boolean(process.env.ADMIN_PASSWORD_HASH?.trim() && sessionSecret);
  const { pathname } = request.nextUrl;

  if (!isPublic(pathname)) {
    const session =
      authEnabled && sessionSecret
        ? await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret)
        : null;

    // Sem sessão válida, ou sem login configurado num ambiente de produção.
    if (!session && (authEnabled || isProduction())) {
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
