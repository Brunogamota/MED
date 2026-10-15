import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { COMPROVANTE } from '@/components/previews/fixtures';
import { Op3PrintButton } from '@/components/previews/opcao-3/print-button';
import { Op3TrackingTimeline } from '@/components/previews/opcao-3/tracking-timeline';

export const dynamic = 'force-static';

/**
 * Comprovante de envio — a peça que mostra que o comprador recebeu o e-mail de
 * acompanhamento do pedido. Só campos de COMPROVANTE; nada de código de barras,
 * selo de bandeira ou id que não exista. Documento branco, pronto para imprimir.
 */

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium tracking-wide text-(--op3-ink-3) uppercase sm:pt-0.5">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function Opcao3ComprovantePage() {
  const c = COMPROVANTE;
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 print:p-0">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/preview/bulls/opcao-3"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-(--op3-ink-2) outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </Link>
          <Op3PrintButton />
        </div>

        <article
          aria-labelledby="op3-comprovante-titulo"
          className="op3-elev overflow-hidden rounded-3xl border border-border bg-white print:rounded-none print:border-0"
        >
          <div aria-hidden className="op3-hero h-1.5 print:h-1" />

          <header className="flex flex-col gap-5 px-6 pt-7 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:pt-9">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="op3-hero grid size-11 place-items-center rounded-2xl text-sm font-bold text-white"
              >
                BC
              </span>
              <p className="text-lg font-semibold tracking-tight text-foreground">{c.remetente}</p>
            </div>
            <div className="sm:text-right">
              <h1 id="op3-comprovante-titulo" className="text-2xl font-semibold tracking-tight text-foreground">
                Comprovante de envio
              </h1>
              <p className="mt-1 text-sm text-(--op3-ink-3)">{c.tipo}</p>
            </div>
          </header>

          <div className="grid border-t border-border md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <section
              aria-labelledby="op3-etapas"
              className="border-b border-border bg-(--op3-lilac-soft)/50 px-6 py-7 sm:px-10 md:border-r md:border-b-0 print:bg-transparent"
            >
              <h2
                id="op3-etapas"
                className="mb-6 text-xs font-semibold tracking-[0.08em] text-(--op3-violet) uppercase"
              >
                Etapas do pedido
              </h2>
              <Op3TrackingTimeline items={c.etapas} />
            </section>

            <section aria-labelledby="op3-detalhes" className="px-6 py-5 sm:px-10 sm:py-6">
              <h2 id="op3-detalhes" className="sr-only">
                Dados do envio
              </h2>
              <dl className="divide-y divide-border">
                <Campo rotulo="Remetente">{c.remetente}</Campo>
                <Campo rotulo="Destinatário">
                  <span className="block font-medium">{c.destinatarioNome}</span>
                  <span className="block text-(--op3-ink-2)">{c.destinatarioEmail}</span>
                </Campo>
                <Campo rotulo="Canal">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail aria-hidden className="size-4 text-(--op3-violet)" />
                    {c.canal}
                  </span>
                </Campo>
                <Campo rotulo="Tipo">{c.tipo}</Campo>
                <Campo rotulo="Enviado em">
                  <span className="tabular-nums">{c.enviadoEm}</span>
                </Campo>
                <Campo rotulo="End-to-end">
                  <span className="font-mono text-[13px] break-all">{c.e2e}</span>
                </Campo>
                <Campo rotulo="ID da mensagem">
                  <span className="font-mono text-[13px] break-all">{c.idMensagem}</span>
                </Campo>
              </dl>
            </section>
          </div>

          <section aria-labelledby="op3-mensagem" className="border-t border-border px-6 py-7 sm:px-10 sm:py-8">
            <h2 id="op3-mensagem" className="text-xs font-semibold tracking-[0.08em] text-(--op3-violet) uppercase">
              Mensagem enviada
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <div className="flex flex-col gap-1 border-b border-border bg-muted/60 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 print:bg-transparent">
                <span className="text-xs font-medium tracking-wide text-(--op3-ink-3) uppercase sm:w-[72px]">
                  Assunto
                </span>
                <span className="text-sm font-semibold text-foreground">{c.assunto}</span>
              </div>
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <p className="text-base font-semibold text-foreground">{c.saudacao}</p>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-(--op3-ink-2)">{c.corpo}</p>
                <a
                  href={c.linkPedido}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 items-center rounded-full bg-(--op3-violet) px-6 text-sm font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 print:border print:border-(--op3-violet) print:bg-transparent print:text-(--op3-violet)"
                >
                  {c.botao}
                </a>
                <p className="mt-3 font-mono text-xs break-all text-(--op3-ink-3)">{c.linkPedido}</p>
              </div>
            </div>
          </section>

          <footer className="flex items-start gap-2.5 border-t border-border px-6 py-5 text-xs text-(--op3-ink-3) sm:px-10">
            <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-(--op3-violet)" />
            <p>{c.declaracao}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
