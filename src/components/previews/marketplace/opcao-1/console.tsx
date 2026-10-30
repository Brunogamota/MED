'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileSpreadsheetIcon, FileTextIcon, MailCheckIcon } from 'lucide-react';
import { TopNav } from './top-nav';
import { StatusTabs, type FilaVisao } from './status-tabs';
import { KpiStrip } from './kpi-strip';
import { IntakeChart } from './intake-chart';
import { QueueTable } from './queue-table';

const COMPROVANTE_HREF = '/preview/marketplace/opcao-1/comprovante';

const secundario =
  'inline-flex h-9 items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-(--o1-shadow) transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40';

export function Console() {
  const [visao, setVisao] = React.useState<FilaVisao>('todas');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40">
        <TopNav active="visao" />
        <StatusTabs value={visao} onValueChange={setVisao} />
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-primary">Marketplace Verificado</p>
            <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-foreground">
              Visão geral
            </h1>
            <p className="mt-1 text-[14px] text-(--o1-ink-2)">
              Contestações MED recebidas, prazos de resposta e defesas prontas para envio.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={COMPROVANTE_HREF} className={secundario}>
              <FileTextIcon className="size-4 text-(--o1-ink-3)" />
              Comprovantes
            </Link>
            <button type="button" className={secundario}>
              <MailCheckIcon className="size-4 text-(--o1-ink-3)" />
              Importar envios
            </button>
            <button type="button" className={secundario}>
              <FileSpreadsheetIcon className="size-4 text-(--o1-ink-3)" />
              Importar MEDs
            </button>
          </div>
        </div>

        <KpiStrip />
        <IntakeChart />
        <QueueTable visao={visao} />
      </main>
    </div>
  );
}
