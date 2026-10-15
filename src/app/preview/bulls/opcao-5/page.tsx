import Link from 'next/link';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { RESUMO, brl } from '@/components/previews/fixtures';
import { IntakeChart } from '@/components/previews/opcao-5/intake-chart';
import { MedQueue } from '@/components/previews/opcao-5/med-queue';
import { QueueSummary } from '@/components/previews/opcao-5/queue-summary';
import { Sparkline } from '@/components/previews/opcao-5/sparkline';
import { StatusCards } from '@/components/previews/opcao-5/status-cards';
import { HEADING, MONO } from '@/components/previews/opcao-5/theme';
import { TopBar } from '@/components/previews/opcao-5/top-bar';
import { cn } from '@/lib/cn';

export const dynamic = 'force-static';

const entrada14d = RESUMO.entradaDiaria.reduce((s, v) => s + v, 0);
const ultimoDia = RESUMO.entradaDiaria[RESUMO.entradaDiaria.length - 1];

export default function Opcao5Page() {
  return (
    <>
      <TopBar active="painel" />
      <main className="mx-auto max-w-[1360px] space-y-6 px-4 pt-8 pb-16 sm:px-6 lg:pt-10">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-(--o5-brand)/30 bg-(--o5-brand)/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-(--o5-lilac) uppercase">
              <span aria-hidden className="size-1.5 rounded-full bg-(--o5-lilac) shadow-[0_0_8px_var(--o5-lilac)]" />
              MED Pix · Bulls Cash
            </p>
            <h1 className={cn(HEADING, 'mt-4 text-[30px] leading-tight font-semibold text-foreground sm:text-[38px]')}>
              Painel de defesa
            </h1>
            <p className="mt-2 text-sm text-(--o5-text-2) sm:text-[15px]">
              <span className={cn(MONO, 'font-semibold text-foreground')}>{RESUMO.emAberto}</span> casos em aberto
              <span className="mx-2 text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className={cn(MONO, 'font-semibold text-foreground')}>{brl(RESUMO.valorEmAberto)}</span> em
              disputa
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2.5 backdrop-blur-xl">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Entrada 14 dias</p>
                <p className={cn(MONO, 'mt-0.5 text-sm font-semibold text-foreground')}>
                  {entrada14d} <span className="font-normal text-muted-foreground">MEDs</span>
                </p>
              </div>
              <Sparkline
                data={RESUMO.entradaDiaria}
                width={104}
                height={30}
                label={`Entrada de MEDs nos últimos 14 dias, de ${RESUMO.entradaDiaria[0]} a ${ultimoDia} por dia`}
              />
              <div className="border-l border-border pl-4 text-right">
                <p className="text-[11px] font-medium text-muted-foreground">Hoje</p>
                <p className={cn(MONO, 'mt-0.5 text-sm font-semibold text-(--o5-lilac)')}>{ultimoDia}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/preview/bulls/opcao-5/comprovante"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.04] px-3.5 text-sm font-semibold text-foreground backdrop-blur-xl transition-colors outline-none hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
              >
                <FileCheck2 className="size-4 text-(--o5-lilac)" aria-hidden />
                <span className="sr-only sm:not-sr-only">Comprovante</span>
              </Link>
              <Link
                href="#fila"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-(--o5-violet) to-(--o5-brand) px-5 text-sm font-semibold whitespace-nowrap text-white shadow-[0_12px_32px_-10px_rgb(168_85_247/0.95)] transition-[filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none"
              >
                Abrir fila de MEDs
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <StatusCards />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IntakeChart />
          </div>
          <QueueSummary />
        </div>

        <MedQueue />

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Prévia de interface · dados ilustrativos
        </p>
      </main>
    </>
  );
}
