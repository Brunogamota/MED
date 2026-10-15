import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, FileCheck2, Mail, UserRound } from 'lucide-react';
import { COMPROVANTE } from '@/components/previews/fixtures';
import { PrintButton } from '@/components/previews/opcao-5/print-button';
import { HEADING, MONO } from '@/components/previews/opcao-5/theme';
import { TopBar } from '@/components/previews/opcao-5/top-bar';
import { Tracker } from '@/components/previews/opcao-5/tracker';
import { cn } from '@/lib/cn';

export const dynamic = 'force-static';

/*
 * Comprovante de envio. É peça externa e vai impressa: por isso, e só aqui,
 * a cor é literal (papel branco, faixa roxa) e não sai dos tokens do console.
 * Todo texto da peça vem de COMPROVANTE; o resto são os rótulos dos campos.
 */

const INK = 'text-[#0F172A]';
const SOFT = 'text-[#475569]';
const LABEL = 'text-[11px] font-semibold tracking-[0.08em] text-[#64748B] uppercase';

function Campo({
  label,
  children,
  mono = false,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className={LABEL}>{label}</dt>
      <dd className={cn('mt-1.5 text-sm font-medium break-words', INK, mono && cn(MONO, 'text-[13px] break-all'))}>
        {children}
      </dd>
    </div>
  );
}

export default function ComprovantePage() {
  const c = COMPROVANTE;
  return (
    <>
      <TopBar active="comprovantes" />
      <main className="mx-auto max-w-[760px] px-4 pt-8 pb-16 sm:px-6 lg:pt-10 print:max-w-none print:p-0">
        <div data-print-hide className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/preview/bulls/opcao-5"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white/[0.04] px-3.5 text-sm font-semibold text-foreground backdrop-blur-xl transition-colors outline-none hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar ao painel
          </Link>
          <PrintButton />
        </div>

        <article
          aria-label="Comprovante de envio"
          className="overflow-hidden rounded-[28px] bg-white shadow-[0_40px_120px_-24px_rgba(168,85,247,0.55),0_0_0_1px_rgba(255,255,255,0.18)] [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:rounded-none print:shadow-none"
        >
          {/* Faixa de vidro roxo. */}
          <header className="relative overflow-hidden bg-[linear-gradient(135deg,#A855F7_0%,#8B5CF6_55%,#6D28D9_100%)] px-6 pt-7 pb-6 sm:px-8">
            <span aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-[#F0ABFC]/40 blur-3xl" />
            <span aria-hidden className="absolute -bottom-28 -left-10 size-64 rounded-full bg-[#C084FC]/40 blur-3xl" />
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0)_60%)]"
            />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75 uppercase">
                  Comprovante de envio
                </p>
                <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase">Remetente</p>
                <p className={cn(HEADING, 'mt-1 text-[28px] leading-none font-semibold text-white')}>{c.remetente}</p>
              </div>
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md"
              >
                <Mail className="size-5 text-white" />
              </span>
            </div>

            <dl className="relative mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-md">
                <dt className="text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase">Enviado em</dt>
                <dd className={cn(MONO, 'mt-1 text-sm font-medium text-white')}>{c.enviadoEm}</dd>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-md">
                <dt className="text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase">ID da mensagem</dt>
                <dd className={cn(MONO, 'mt-1 text-sm font-medium break-all text-white')}>{c.idMensagem}</dd>
              </div>
            </dl>
          </header>

          <div className="space-y-8 px-6 py-7 sm:px-8">
            <section className="flex items-center gap-4 rounded-2xl border border-[#EDE4FB] bg-[#FAF7FF] p-4">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F1E9FE] text-[#7C3AED]"
              >
                <UserRound className="size-5" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>Destinatário</p>
                <p className={cn('mt-1 text-[15px] font-semibold', INK)}>{c.destinatarioNome}</p>
                <p className={cn('text-sm break-all', SOFT)}>{c.destinatarioEmail}</p>
              </div>
            </section>

            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Campo label="Canal">{c.canal}</Campo>
              <Campo label="Tipo">{c.tipo}</Campo>
              <Campo label="End-to-end" mono wide>
                {c.e2e}
              </Campo>
            </dl>

            <section aria-label="Assunto" className="rounded-2xl border border-[#E2E8F0]">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <p className={LABEL}>Assunto</p>
                <p className={cn(HEADING, 'mt-1.5 text-base font-semibold', INK)}>{c.assunto}</p>
              </div>
              <div className="px-5 py-5">
                <p className={cn('text-[15px] font-semibold', INK)}>{c.saudacao}</p>
                <p className={cn('mt-2 text-sm leading-6', SOFT)}>{c.corpo}</p>
                <a
                  href={c.linkPedido}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8B5CF6,#A855F7)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(168,85,247,0.9)] transition-[filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#A855F7] focus-visible:ring-offset-2"
                >
                  {c.botao}
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
                <p className={cn(MONO, 'mt-3 text-[11px] break-all text-[#64748B]')}>{c.linkPedido}</p>
              </div>
            </section>

            <section aria-labelledby="o5-comp-etapas">
              <h2 id="o5-comp-etapas" className={cn(HEADING, 'mb-5 text-base font-semibold', INK)}>
                {c.tipo}
              </h2>
              <Tracker etapas={c.etapas} variant="light" label={c.tipo} />
            </section>
          </div>

          <footer className="flex items-center gap-2.5 border-t border-[#EDE4FB] bg-[#FAF7FF] px-6 py-4 sm:px-8">
            <FileCheck2 className="size-4 shrink-0 text-[#7C3AED]" aria-hidden />
            <p className="text-xs text-[#475569]">{c.declaracao}</p>
          </footer>
        </article>
      </main>
    </>
  );
}
