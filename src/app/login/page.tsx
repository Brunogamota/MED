import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getConfig } from '@/lib/env';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { SignInPage, type SignInPromise } from '@/components/ui/sign-in';
import { signInAction } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrar — MED Defense',
};

/**
 * O que este produto entrega, no painel da direita.
 *
 * São afirmações sobre o próprio sistema, verificáveis no código — não
 * depoimento atribuído a cliente nenhum.
 */
const PROMISES: SignInPromise[] = [
  {
    title: 'O caso chega preenchido',
    text: 'Webhook e lote da adquirente preenchem transação, cliente e pedido sem digitação.',
  },
  {
    title: 'Nada é inventado',
    text: 'Dado que não veio da fonte fica ausente e é reportado como evidência faltante.',
  },
  {
    title: 'A fila diz o que fazer',
    text: 'Ordenada por prazo e por quanto falta para a defesa virar enviável.',
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const config = getConfig();
  const { next } = await searchParams;

  // Quem já tem sessão válida não vê a tela de entrada.
  if (config.auth.enabled && config.auth.sessionSecret) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (await verifySession(token, config.auth.sessionSecret)) redirect('/');
  }

  return (
    <SignInPage
      title={<span className="font-light tracking-tighter">MED Defense</span>}
      description="Entre para acessar a fila de casos e as defesas."
      promises={PROMISES}
      nextPath={next}
      action={signInAction}
      notice={
        config.auth.enabled ? undefined : (
          <>
            <strong className="font-medium">Login desligado neste ambiente.</strong> Sem
            `ADMIN_PASSWORD_HASH` e `SESSION_SECRET`, o console fica aberto e esta tela não
            protege nada. Veja `docs/DEPLOYMENT.md`.
          </>
        )
      }
    />
  );
}
