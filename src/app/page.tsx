import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { IntakeChart } from '@/components/dashboard/IntakeChart';
import { QueuePreview } from '@/components/dashboard/QueuePreview';
import { buildDashboardMetrics, buildIntakeSeries } from '@/lib/dashboard';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';

export const dynamic = 'force-dynamic';

const INTAKE_DAYS = 30;

async function DashboardContent() {
  const now = new Date();
  const rows = await listMeds(serverPageContext(), { limit: 200 });

  return (
    <>
      <MetricCards metrics={buildDashboardMetrics(rows, now)} />
      <IntakeChart series={buildIntakeSeries(rows, now, INTAKE_DAYS)} days={INTAKE_DAYS} />
      <QueuePreview rows={rows} now={now} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="skeleton-defer flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Painel</h1>
          <p className="text-muted-foreground text-sm">
            O estado da operação de defesa, com os casos que pedem ação primeiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/meds/import">
              <Upload data-icon="inline-start" />
              Importar lote
            </Link>
          </Button>
          <Button asChild>
            <Link href="/meds/new">
              <Plus data-icon="inline-start" />
              Novo MED
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
