import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Neutraliza, em desenvolvimento, o bloqueio de Server Actions por origem.
 *
 * O Next protege Server Actions contra CSRF exigindo que o cabeçalho `Origin`
 * bata com o `Host`. Quando o app é aberto por um host encaminhado (Dev Tunnels
 * do VS Code, Codespaces, proxy, túnel, preview), os dois não coincidem e todo
 * POST de formulário é recusado com "Invalid Server Actions request".
 *
 * Aqui, e SOMENTE fora de produção, reescrevemos o `Origin` para o mesmo host
 * da requisição — o que faz a verificação passar para qualquer endereço, sem
 * precisar enumerar provedores. Em produção o middleware é um no-op: a proteção
 * CSRF continua íntegra e restrita ao host do app (ver next.config.ts).
 */
export function middleware(request: NextRequest): NextResponse {
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

export const config = {
  // Roda em tudo, menos assets estáticos do Next.
  matcher: ['/((?!_next/image|favicon.ico).*)'],
};
