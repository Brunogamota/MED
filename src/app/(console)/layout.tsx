import { Suspense } from 'react';
import { getConfig } from '@/lib/env';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { TwoLevelSidebar, type NavCounts } from '@/components/layout/two-level-sidebar';
import { Badge } from '@/components/ui/badge';
import { serverPageContext } from '@/infra/auth/context';
import { getActiveAccount, listAccounts } from '@/services/accountService';
import { BullsShell } from '@/components/skins/bulls/bulls-shell';
import { MarketplaceShell } from '@/components/skins/marketplace/marketplace-shell';
import { listMeds } from '@/services/medService';
import { hoursUntil } from '@/lib/format';
import type { MedStatus } from '@/domain/types';

const OPEN_STATUSES: MedStatus[] = [
  'RECEIVED',
  'COLLECTING_DATA',
  'MISSING_EVIDENCE',
  'READY_TO_GENERATE',
  'DEFENSE_GENERATED',
  'READY_TO_SUBMIT',
];

/** Contadores da navegação. Falha de leitura não derruba o shell. */
async function navCounts(): Promise<NavCounts> {
  try {
    const rows = await listMeds((await serverPageContext()), {});
    const open = rows.filter((row) => OPEN_STATUSES.includes(row.med.status));
    const hours = open.map((row) => hoursUntil(row.med.responseDeadlineAt));
    return {
      open: open.length,
      dueSoon: hours.filter((value) => value !== null && value <= 72).length,
      hasUrgent: hours.some((value) => value !== null && value >= 0 && value < 24),
      submitted: rows.filter((row) => ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(row.med.status))
        .length,
    };
  } catch {
    return { open: 0, dueSoon: 0, hasUrgent: false, submitted: 0 };
  }
}

/** Cromo do console: trilho + painel à esquerda, cabeçalho fino e conteúdo. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();
  const [counts, accounts, active] = await Promise.all([
    navCounts(),
    listAccounts(),
    getActiveAccount(),
  ]);
  const options = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    active: account.id === active.id,
  }));

  // Cada ambiente tem o próprio cromo. O Bulls Cash não reaproveita nada do
  // trilho lateral do Jade.
  if (active.skin === 'bulls') {
    return (
      <BullsShell
        accountName={active.name}
        accounts={options}
        counts={counts}
        demoMode={config.demoMode}
      >
        {children}
      </BullsShell>
    );
  }

  // Marketplace Verificado: navegação no topo, sem trilho lateral.
  if (active.skin === 'marketplace') {
    return (
      <MarketplaceShell accounts={options} counts={counts} demoMode={config.demoMode}>
        {children}
      </MarketplaceShell>
    );
  }

  return (
    <div className="flex min-h-svh">
      {/* A sidebar lê `?view=`, e useSearchParams exige limite de Suspense. */}
      <Suspense fallback={<div className="w-16 shrink-0 bg-black md:w-88" aria-hidden />}>
        <TwoLevelSidebar
          counts={counts}
          organization={config.demoMode && active.isDefault ? 'Organização demo' : active.name}
          demoMode={config.demoMode}
          accounts={options}
          defaultCollapsed={false}
        />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-print-hide
          className="flex h-12 shrink-0 items-center justify-end gap-2 border-b px-4 md:px-6"
        >
          {config.demoMode ? (
            <Badge
              variant="outline"
              title="Sem banco configurado: os dados vivem em memória e se perdem a cada reinício."
            >
              Modo demo
            </Badge>
          ) : null}
          <ThemeSwitcher />
          <SignOutButton />
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
