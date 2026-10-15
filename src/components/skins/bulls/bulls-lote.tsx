import Link from 'next/link';
import { ArrowLeft, CalendarRange, Printer, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceiptPrintsButton } from '@/components/ReceiptPrintsButton';

/**
 * Cabeçalho do lote de comprovantes no ambiente Bulls Cash.
 *
 * O lote nasce de dois jeitos, os mesmos da página: a seleção da fila
 * (`?ids=`) ou o recorte por data de abertura (`?de=&ate=`). Sem nenhum dos
 * dois a página não tem o que montar — em vez de uma frase solta, oferece o
 * recorte por data ali mesmo e o caminho para a fila.
 */
export function BullsLoteHeader({
  accountName,
  pecas,
  casos,
  semSelecao,
  de,
  ate,
}: {
  accountName: string;
  pecas: number;
  casos: number;
  semSelecao: boolean;
  de?: string;
  ate?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-5 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-bulls-brand-strong">{accountName}</p>
          <h1 data-bulls-title className="mt-1">
            Comprovantes
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-[14px] text-bulls-ink-3">
            Uma peça por envio registrado, pronta para imprimir ou baixar como imagem e anexar à defesa.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/meds">
            <ArrowLeft data-icon="inline-start" />
            Voltar à fila
          </Link>
        </Button>
      </div>

      <section className="rounded-[24px] border border-bulls-line bg-card p-5 shadow-bulls sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <form method="get" action="/meds/comprovantes" className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="lote-de" className="text-[12.5px] font-semibold text-bulls-ink-2">
                Abertos de
              </label>
              <input
                id="lote-de"
                type="date"
                name="de"
                defaultValue={de}
                className="h-10 rounded-[0.875rem] border border-bulls-line-strong bg-bulls-bg-2 px-3 text-[13.5px] text-foreground"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="lote-ate" className="text-[12.5px] font-semibold text-bulls-ink-2">
                até
              </label>
              <input
                id="lote-ate"
                type="date"
                name="ate"
                defaultValue={ate}
                className="h-10 rounded-[0.875rem] border border-bulls-line-strong bg-bulls-bg-2 px-3 text-[13.5px] text-foreground"
              />
            </div>
            <Button type="submit">
              <CalendarRange data-icon="inline-start" />
              Montar lote
            </Button>
          </form>

          {semSelecao ? null : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-bulls-brand-soft px-3 py-1.5 text-[13px] font-semibold text-bulls-brand-deep tabular-nums">
                <ReceiptText className="size-4" aria-hidden="true" />
                {pecas} comprovante{pecas === 1 ? '' : 's'} de {casos} caso{casos === 1 ? '' : 's'}
              </span>
              {pecas > 0 ? <ReceiptPrintsButton /> : null}
            </div>
          )}
        </div>

        {semSelecao ? (
          <p className="mt-4 text-[13px] text-bulls-ink-3">
            Escolha o período de abertura dos MEDs, ou selecione os casos na{' '}
            <Link href="/meds" className="font-semibold text-bulls-brand-strong hover:text-bulls-brand-deep">
              fila de contestações
            </Link>{' '}
            e use “Comprovantes”.
          </p>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-bulls-ink-3">
            <Printer className="size-4" aria-hidden="true" />
            Ctrl/Cmd+P salva o lote em PDF, um comprovante por página.
          </p>
        )}


        {!semSelecao && pecas === 0 ? (
          <p className="mt-4 text-[13px] text-bulls-ink-3">
            Nenhum comprovante nesta seleção. Registre os envios em{' '}
            <Link href="/meds/entregas" className="font-semibold text-bulls-brand-strong hover:text-bulls-brand-deep">
              Importar envios
            </Link>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}
