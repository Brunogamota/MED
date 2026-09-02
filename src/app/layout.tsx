import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getConfig } from '@/lib/env';
import { APP_CONFIG } from '@/config/app';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SearchDialog } from '@/components/layout/search-dialog';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { NavCounts } from '@/components/layout/nav-main';
import { serverPageContext } from '@/infra/auth/context';
import { listMeds } from '@/services/medService';
import { hoursUntil } from '@/lib/format';
import type { MedStatus } from '@/domain/types';
import './globals.css';

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

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
    const rows = await listMeds(serverPageContext(), { limit: 200 });
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();
  const counts = await navCounts();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={{ '--sidebar-width': 'calc(var(--spacing) * 68)' } as React.CSSProperties}
          >
            <AppSidebar
              counts={counts}
              organization={config.demoMode ? 'Organização demo' : 'Minha organização'}
              demoMode={config.demoMode}
            />

            <SidebarInset className="min-w-0 overflow-x-clip">
              <header
                data-print-hide
                className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
              >
                <div className="flex w-full items-center justify-between px-4 lg:px-6">
                  <div className="flex items-center gap-1 lg:gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                      orientation="vertical"
                      className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                    />
                    <SearchDialog />
                  </div>
                  <div className="flex items-center gap-2">
                    {config.demoMode ? (
                      <Badge
                        variant="outline"
                        title="Sem banco configurado: os dados vivem em memória e se perdem a cada reinício."
                      >
                        Modo demo
                      </Badge>
                    ) : null}
                    <ThemeSwitcher />
                  </div>
                </div>
              </header>

              <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</div>
            </SidebarInset>
          </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
