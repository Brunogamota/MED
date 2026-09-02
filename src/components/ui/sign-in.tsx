'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/cn';

/**
 * Tela de entrada do console.
 *
 * Duas colunas: o formulário à esquerda e, à direita, o que este produto
 * promete. O painel da direita não traz depoimento de cliente: um elogio
 * assinado por alguém que não existe é prova social fabricada, e num produto
 * que se sustenta em proveniência de evidência isso não passa.
 */

export interface SignInPromise {
  title: string;
  text: string;
}

export interface SignInState {
  error?: string;
  /**
   * Usuário que foi tentado. O React 19 limpa o formulário depois de uma
   * action, então sem devolver isto o operador redigita o usuário a cada
   * senha errada. A senha, essa, não volta — de propósito.
   */
  user?: string;
  /** Muda a cada tentativa, para o campo remontar com o valor devolvido. */
  attempt?: number;
}

interface SignInPageProps {
  title?: ReactNode;
  description?: ReactNode;
  promises?: SignInPromise[];
  /** Nota abaixo do formulário — por exemplo, que não há credencial configurada. */
  notice?: ReactNode;
  /** Para onde voltar depois de entrar. */
  nextPath?: string;
  action: (state: SignInState | null, formData: FormData) => Promise<SignInState>;
}

const FieldShell = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border bg-foreground/5 transition-colors focus-within:border-ring focus-within:bg-foreground/10">
    {children}
  </div>
);

function PromiseCard({ promise, delay }: { promise: SignInPromise; delay: string }) {
  return (
    <div
      className={cn(
        'animate-element w-64 rounded-3xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl',
        delay,
      )}
    >
      <p className="font-medium text-neutral-50 text-sm">{promise.title}</p>
      <p className="mt-1 text-neutral-300 text-sm leading-snug">{promise.text}</p>
    </div>
  );
}

export function SignInPage({
  title = <span className="font-light tracking-tighter">Entrar</span>,
  description = 'Acesse o console de defesa de MED.',
  promises = [],
  notice,
  nextPath,
  action,
}: SignInPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, submit, pending] = useActionState<SignInState | null, FormData>(action, null);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <section className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <BrandMark size={40} className="animate-element animate-delay-100" />

            <h1 className="animate-element animate-delay-200 font-semibold text-4xl leading-tight md:text-5xl">
              {title}
            </h1>
            <p className="animate-element animate-delay-300 text-muted-foreground">{description}</p>

            <form className="space-y-5" action={submit}>
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

              <div className="animate-element animate-delay-400">
                <label htmlFor="signin-user" className="font-medium text-muted-foreground text-sm">
                  Usuário
                </label>
                <FieldShell>
                  <input
                    key={state?.attempt ?? 0}
                    id="signin-user"
                    name="user"
                    type="text"
                    autoComplete="username"
                    required
                    defaultValue={state?.user ?? ''}
                    placeholder="operador"
                    className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                  />
                </FieldShell>
              </div>

              <div className="animate-element animate-delay-500">
                <label htmlFor="signin-password" className="font-medium text-muted-foreground text-sm">
                  Senha
                </label>
                <FieldShell>
                  <div className="relative">
                    <input
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Sua senha"
                      className="w-full rounded-2xl bg-transparent p-4 pr-12 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ocultar a senha' : 'Mostrar a senha'}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </FieldShell>
              </div>

              {state?.error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive text-sm"
                >
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {pending ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            {notice ? (
              <div className="animate-element animate-delay-700 rounded-xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm">
                {notice}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {promises.length > 0 ? (
        <section className="relative hidden flex-1 p-4 md:block">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl bg-neutral-950">
            {/* Fundo próprio, em vez de foto de banco de imagens: uma foto
                hospedada fora quebra o login no dia em que ela sair do ar. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'radial-gradient(60% 50% at 20% 15%, rgba(90,90,110,0.35), transparent 70%), radial-gradient(50% 45% at 85% 80%, rgba(60,80,70,0.30), transparent 70%)',
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-10">
              <p className="max-w-md font-light text-2xl text-neutral-100 leading-snug tracking-tight">
                Nenhuma afirmação sem evidência.
                <br />
                Nenhuma evidência sem procedência.
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
            <PromiseCard promise={promises[0]!} delay="animate-delay-1000" />
            {promises[1] ? (
              <div className="hidden xl:flex">
                <PromiseCard promise={promises[1]} delay="animate-delay-1200" />
              </div>
            ) : null}
            {promises[2] ? (
              <div className="hidden 2xl:flex">
                <PromiseCard promise={promises[2]} delay="animate-delay-1400" />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
