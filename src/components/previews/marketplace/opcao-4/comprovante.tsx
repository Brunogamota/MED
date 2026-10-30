import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPROVANTE } from '@/components/previews/marketplace/fixtures';
import { PrintButton } from './print-button';
import { display, focusRing, mono } from './ui';

/*
 * Comprovante de envio — peça impressa, preto no branco, com o bloco amarelo
 * da marca no topo. Só os campos do registro de envio e a mensagem que foi
 * mandada. Sem selo, sem etapa do pedido, sem código de barras: o documento
 * mostra o registro, não opina sobre ele.
 */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b-[1.5px] border-(--o4-ink) px-6 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:px-8">
      <dt className={cn(mono, 'pt-px text-[10.5px] font-medium uppercase tracking-[0.14em] text-(--o4-ink-3)')}>
        {label}
      </dt>
      <dd className={cn(mono, 'min-w-0 break-words text-[13px] leading-relaxed text-(--o4-ink)')}>{children}</dd>
    </div>
  );
}

export function Comprovante() {
  const c = COMPROVANTE;
  return (
    <main className="min-h-screen bg-(--o4-panel) px-4 py-8 sm:py-12 print:bg-(--o4-paper) print:p-0">
      <div className="mx-auto w-full max-w-[780px]">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/preview/marketplace/opcao-4"
            className={cn(
              'inline-flex items-center gap-2',
              mono,
              'text-[11px] font-medium uppercase tracking-[0.12em] text-(--o4-ink-2) hover:text-(--o4-ink)',
              focusRing,
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar à fila
          </Link>
          <PrintButton />
        </div>

        <article
          aria-labelledby="o4-comp-titulo"
          className="border-2 border-(--o4-ink) bg-(--o4-paper) text-(--o4-ink) shadow-[10px_10px_0_var(--o4-ink)] [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:shadow-none"
        >
          {/* Bloco da marca. */}
          <header className="border-b-2 border-(--o4-ink) bg-(--o4-yellow) px-6 pb-7 pt-6 sm:px-8 sm:pb-9">
            <p className={cn(mono, 'text-[11px] font-semibold uppercase tracking-[0.18em]')}>{c.remetente}</p>
            <h1
              id="o4-comp-titulo"
              className={cn(display, 'mt-8 text-[44px] font-bold leading-[0.88] sm:mt-12 sm:text-[68px]')}
            >
              Comprovante
              <br />
              de envio
            </h1>
          </header>

          {/* Registro. */}
          <section aria-label="Dados do envio">
            <dl>
              <Row label="Remetente">{c.remetente}</Row>
              <Row label="Destinatário">
                <span className="block font-semibold">{c.destinatarioNome}</span>
                <span className="block text-(--o4-ink-2)">{c.destinatarioEmail}</span>
              </Row>
              <Row label="Canal">{c.canal}</Row>
              <Row label="Tipo">{c.tipo}</Row>
              <Row label="Enviado em">{c.enviadoEm}</Row>
              <Row label="End-to-end">
                <span className="break-all">{c.e2e}</span>
              </Row>
              <Row label="ID da mensagem">{c.idMensagem}</Row>
            </dl>
          </section>

          {/* Mensagem. */}
          <section aria-labelledby="o4-comp-msg" className="border-t-2 border-(--o4-ink) px-6 pb-10 pt-7 sm:px-8">
            <h2
              id="o4-comp-msg"
              className={cn(mono, 'mb-5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-(--o4-ink-3)')}
            >
              Mensagem enviada
            </h2>

            <div className="grid grid-cols-[10px_minmax(0,1fr)] border-[3px] border-(--o4-ink) bg-(--o4-paper) shadow-[7px_7px_0_var(--o4-ink)] print:shadow-[5px_5px_0_var(--o4-ink)]">
              <span aria-hidden="true" className="border-r-[3px] border-(--o4-ink) bg-(--o4-yellow)" />
              <div className="px-6 py-7 sm:px-9 sm:py-9">
                <p className={cn(display, 'text-[36px] font-bold leading-[0.95] sm:text-[52px]')}>{c.assunto}</p>
                <div aria-hidden="true" className="my-6 h-[3px] w-16 bg-(--o4-ink)" />
                <p className="text-[17px] font-semibold">{c.saudacao}</p>
                <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-(--o4-ink-2)">{c.corpo}</p>
                <a
                  href={c.linkPedido}
                  className={cn(
                    'mt-7 inline-flex h-12 items-center gap-2.5 border-2 border-(--o4-ink) bg-(--o4-ink) px-6 text-[15px] font-semibold text-(--o4-yellow)',
                    'shadow-[4px_4px_0_var(--o4-yellow-deep)] transition-transform hover:-translate-x-px hover:-translate-y-px',
                    display,
                    focusRing,
                    'focus-visible:outline-offset-4',
                  )}
                >
                  {c.botao}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          <footer className="border-t-2 border-(--o4-ink) px-6 py-4 sm:px-8">
            <p className={cn(mono, 'text-[11px] text-(--o4-ink-2)')}>{c.declaracao}</p>
          </footer>
        </article>
      </div>
    </main>
  );
}
