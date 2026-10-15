import { FileUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RESUMO } from '@/components/previews/fixtures';
import { ConsoleShell } from '@/components/previews/opcao-1/console-shell';
import { StatCards } from '@/components/previews/opcao-1/stat-cards';
import { IntakeChart } from '@/components/previews/opcao-1/intake-chart';
import { DueSoon } from '@/components/previews/opcao-1/due-soon';
import { QueueTable } from '@/components/previews/opcao-1/queue-table';

export const dynamic = 'force-static';

const numero = new Intl.NumberFormat('pt-BR');

export default function Opcao1Page() {
  return (
    <ConsoleShell
      actions={
        <>
          <Button variant="outline" className="hidden border-white/[0.08] bg-transparent text-(--o1-text-2) sm:inline-flex">
            <FileUp />
            Importar MEDs
          </Button>
          <Button className="shadow-[0_8px_24px_-10px_rgb(168_85_247/0.8)] hover:bg-(--o1-brand-hover)">
            <Send />
            Enviar prontos
            <span className="ml-0.5 rounded-full bg-white/20 px-1.5 font-mono text-[11px] leading-[18px] tabular-nums">{RESUMO.prontos}</span>
          </Button>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Visão geral</h1>
          <p className="text-[13px] text-muted-foreground">
            Contestações de MED abertas na Bulls Cash ·{' '}
            <span className="font-mono text-(--o1-text-2) tabular-nums">{numero.format(RESUMO.enviadosMes)}</span> enviados neste mês
          </p>
        </div>

        <StatCards />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <IntakeChart />
          </div>
          <DueSoon />
        </div>

        <QueueTable />
      </div>
    </ConsoleShell>
  );
}
