import { op3Sans } from '@/components/previews/opcao-3/fonts';
import { Op3Hero } from '@/components/previews/opcao-3/hero';
import { Op3IntakeChart } from '@/components/previews/opcao-3/intake-chart';
import { Op3QueueTable } from '@/components/previews/opcao-3/queue-table';
import { Op3RecentList } from '@/components/previews/opcao-3/recent-list';
import { Op3Sidebar } from '@/components/previews/opcao-3/sidebar';
import { Op3StatusHub } from '@/components/previews/opcao-3/status-hub';

export const dynamic = 'force-static';

/**
 * Opção 3 — "Banking App". Home de banco aplicada à defesa de MED: faixa roxa
 * com o valor em contestação e ações rápidas, baldes de status sobrepostos à
 * faixa, entrada diária, extrato recente e a fila em tabela.
 */
export default function Opcao3Page() {
  return (
    <div className="flex min-h-screen">
      <Op3Sidebar active="visao-geral" />
      <main className="min-w-0 flex-1">
        <Op3Hero fontClass={op3Sans.variable} />
        <div className="relative z-10 mx-auto -mt-20 max-w-[1240px] space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
          <Op3StatusHub />
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <Op3IntakeChart />
            </div>
            <div className="xl:col-span-2">
              <Op3RecentList />
            </div>
          </div>
          <Op3QueueTable />
        </div>
      </main>
    </div>
  );
}
