import { ArrowLeft, Check } from 'lucide-react';
import { COMPROVANTE } from '@/components/previews/fixtures';
import { PrintButton } from '@/components/previews/opcao-4/print-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/previews/opcao-4/statement-card';
import { cn } from '@/lib/cn';

export const dynamic = 'force-static';

/*
 * Comprovante de envio. Cada valor impresso sai de COMPROVANTE; o que não
 * está lá não entra na folha. Rótulos de campo são os únicos textos fixos.
 */

const C = COMPROVANTE;

function Campo({ rotulo, children, mono, largo }: { rotulo: string; children: React.ReactNode; mono?: boolean; largo?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1 border-t border-[#E4E4E7] py-3', largo && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A]">{rotulo}</dt>
      <dd className={cn('text-[13px] leading-5 text-[#18181B]', mono && 'break-all font-mono text-[12.5px]')}>{children}</dd>
    </div>
  );
}

function Etapas() {
  const total = C.etapas.length;
  return (
    <>
      <ol className="hidden sm:grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {C.etapas.map((e, i) => {
          const feito = e.status === 'completed';
          const proximoFeito = i < total - 1 && C.etapas[i + 1]?.status === 'completed';
          return (
            <li key={e.titulo} className="relative flex flex-col items-start pr-3">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'relative z-10 grid size-5 shrink-0 place-items-center rounded-full',
                    feito ? 'bg-[#18181B] text-white' : 'border-[1.5px] border-[#7E22CE] bg-white',
                  )}
                >
                  {feito ? (
                    <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                  ) : (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#7E22CE]" />
                  )}
                </span>
                {i < total - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn('ml-1 h-px flex-1', proximoFeito ? 'bg-[#18181B]' : 'border-t border-dashed border-[#A1A1AA] bg-transparent')}
                  />
                ) : null}
              </div>
              <span className="mt-2 text-[12px] font-medium leading-4 text-[#18181B]">{e.titulo}</span>
              <span className={cn('mt-0.5 font-mono text-[11px] leading-4', feito ? 'text-[#71717A]' : 'text-[#7E22CE]')}>
                {e.data}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Em tela estreita, a mesma sequência em coluna. */}
      <ol className="flex flex-col sm:hidden">
        {C.etapas.map((e, i) => {
          const feito = e.status === 'completed';
          return (
            <li key={e.titulo} className="relative flex gap-3 pb-3 last:pb-0">
              {i < total - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[9.5px] top-5 w-px bg-[#D4D4D8]" /> : null}
              <span
                className={cn(
                  'relative z-10 grid size-5 shrink-0 place-items-center rounded-full',
                  feito ? 'bg-[#18181B] text-white' : 'border-[1.5px] border-[#7E22CE] bg-white',
                )}
              >
                {feito ? (
                  <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                ) : (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-[#7E22CE]" />
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-[12px] font-medium leading-5 text-[#18181B]">{e.titulo}</span>
                <span className={cn('font-mono text-[11px] leading-4', feito ? 'text-[#71717A]' : 'text-[#7E22CE]')}>{e.data}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function ComprovantePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4">
        <div data-print-hide className="flex items-center justify-between gap-3">
          <a
            href="/preview/bulls/opcao-4"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Visão geral
          </a>
          <PrintButton />
        </div>

        <Card variant="document" size="document" className="font-sans">
          <CardHeader className="gap-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-md bg-[#18181B] font-mono text-[12px] font-semibold text-white"
                >
                  BC
                </span>
                <div>
                  <p className="text-[15px] font-semibold leading-5 text-[#18181B]">{C.remetente}</p>
                  <p className="text-[12px] leading-4 text-[#71717A]">{C.tipo}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <CardTitle className="text-[#18181B]">Comprovante de envio</CardTitle>
                <CardDescription className="font-mono text-[12px] text-[#52525B]">{C.idMensagem}</CardDescription>
              </div>
            </div>
            <div aria-hidden="true" className="mt-6 h-[3px] w-full bg-[linear-gradient(90deg,#7E22CE_0%,#7E22CE_18%,#18181B_18%,#18181B_100%)]" />
          </CardHeader>

          <CardContent className="mt-6 gap-7">
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <Campo rotulo="Remetente">{C.remetente}</Campo>
              <Campo rotulo="Destinatário">
                <span className="block font-medium">{C.destinatarioNome}</span>
                <span className="block font-mono text-[12.5px] text-[#52525B]">{C.destinatarioEmail}</span>
              </Campo>
              <Campo rotulo="Canal">{C.canal}</Campo>
              <Campo rotulo="Tipo">{C.tipo}</Campo>
              <Campo rotulo="Enviado em" mono>
                {C.enviadoEm}
              </Campo>
              <Campo rotulo="ID da mensagem" mono>
                {C.idMensagem}
              </Campo>
              <Campo rotulo="End-to-end" mono largo>
                {C.e2e}
              </Campo>
              <Campo rotulo="Assunto" largo>
                {C.assunto}
              </Campo>
            </dl>

            <section aria-labelledby="o4c-msg">
              <h2 id="o4c-msg" className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A]">
                Mensagem
              </h2>
              <div className="rounded-[8px] border border-[#E4E4E7] bg-[#FAFAFA] p-1.5">
                <div className="flex items-center justify-between gap-3 border-b border-[#E4E4E7] px-3 py-2 text-[12px]">
                  <span className="truncate text-[#52525B]">
                    <span className="text-[#A1A1AA]">Assunto · </span>
                    <span className="font-medium text-[#18181B]">{C.assunto}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[#71717A]">{C.canal}</span>
                </div>
                <div className="rounded-[6px] bg-white px-4 py-5 sm:px-6">
                  <p className="text-[14px] font-semibold text-[#18181B]">{C.saudacao}</p>
                  <p className="mt-2 max-w-[56ch] text-[13px] leading-[1.6] text-[#3F3F46]">{C.corpo}</p>
                  <a
                    href={C.linkPedido}
                    className="mt-4 inline-flex h-9 items-center rounded-md bg-[#7E22CE] px-4 text-[13px] font-medium text-white outline-none hover:bg-[#6B21A8] focus-visible:ring-2 focus-visible:ring-[#7E22CE] focus-visible:ring-offset-2 print:bg-white print:text-[#7E22CE] print:underline"
                  >
                    {C.botao}
                  </a>
                  <p className="mt-2 break-all font-mono text-[11px] text-[#71717A]">{C.linkPedido}</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="o4c-etapas">
              <h2 id="o4c-etapas" className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A]">
                Etapas do pedido
              </h2>
              <Etapas />
            </section>
          </CardContent>

          <CardFooter className="mt-8 border-t border-[#E4E4E7] pt-4">
            <p className="text-[11px] leading-4 text-[#71717A]">{C.declaracao}</p>
            <p className="shrink-0 font-mono text-[11px] text-[#A1A1AA]">{C.idMensagem}</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
