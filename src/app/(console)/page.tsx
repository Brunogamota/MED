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
import { getActiveAccount } from '@/services/accountService';
import { buildBullsHome } from '@/lib/bullsHome';
import { BullsHome } from '@/components/skins/bulls/bulls-home';
import { MarketplaceHome } from '@/components/skins/marketplace/marketplace-home';

export const dynamic = 'force-dynamic';

const INTAKE_DAYS = 30;

async function DashboardContent() {
  const now = new Date();
  const rows = await listMeds((await serverPageContext()), {});

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

/** Visão geral do Bulls Cash: o bento, com os MEDs da conta. */
async function BullsDashboard({ accountName }: { accountName: string }) {
  const now = new Date();
  const rows = await listMeds((await serverPageContext()), {});
  return <BullsHome accountName={accountName} data={buildBullsHome(rows, now)} />;
}

/** Visão geral do Marketplace Verificado: indicadores, entrada e fila. */
async function MarketplaceDashboard({ accountName }: { accountName: string }) {
  const now = new Date();
  const rows = await listMeds((await serverPageContext()), {});
  return <MarketplaceHome accountName={accountName} data={buildBullsHome(rows, now)} />;
}

function MarketplaceDashboardSkeleton() {
  return (
    <div className="skeleton-defer flex flex-col gap-6">
      <Skeleton className="h-20 w-80 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function BullsDashboardSkeleton() {
  return (
    <div className="skeleton-defer flex flex-col gap-5">
      <Skeleton className="h-20 w-72 rounded-3xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-[340px] rounded-[28px] lg:col-span-5" />
        <Skeleton className="h-[340px] rounded-[28px] lg:col-span-7" />
      </div>
      <Skeleton className="h-80 rounded-[28px]" />
    </div>
  );
}

export default async function DashboardPage() {
  const account = await getActiveAccount();
  if (account.skin === 'marketplace') {
    return (
      <Suspense fallback={<MarketplaceDashboardSkeleton />}>
        <MarketplaceDashboard accountName={account.name} />
      </Suspense>
    );
  }
  if (account.skin === 'bulls') {
    return (
      <Suspense fallback={<BullsDashboardSkeleton />}>
        <BullsDashboard accountName={account.name} />
      </Suspense>
    );
  }

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
