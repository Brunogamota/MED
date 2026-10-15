import { Bell, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/previews/opcao-2/app-shell';
import { BentoOverview } from '@/components/previews/opcao-2/bento';
import { QueueTable } from '@/components/previews/opcao-2/queue-table';

export const dynamic = 'force-static';

export default function Opcao2Page() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1240px]">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
          <div>
            <p className="text-[13px] font-semibold text-[var(--o2-brand-strong)]">Bulls Cash</p>
            <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-[34px]">
              Visão geral
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--o2-ink-3)]">
              O que entrou, o que vence e o que já pode ser defendido.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full border-[var(--o2-line-strong)] bg-card px-4 text-[13.5px] font-semibold text-[var(--o2-ink-2)] shadow-[var(--o2-shadow)] hover:bg-[var(--o2-brand-wash)] hover:text-foreground"
            >
              <FileUp className="size-4" aria-hidden="true" />
              Importar MEDs
            </Button>
            <button
              type="button"
              aria-label="Notificações"
              className="relative flex size-10 items-center justify-center rounded-full border border-[var(--o2-line-strong)] bg-card text-[var(--o2-ink-2)] shadow-[var(--o2-shadow)] outline-none transition-colors hover:bg-[var(--o2-brand-wash)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              <span aria-hidden="true" className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[var(--o2-brand)] ring-2 ring-card" />
            </button>
          </div>
        </header>

        <BentoOverview />

        <div className="mt-4 lg:mt-5">
          <QueueTable />
        </div>
      </div>
    </AppShell>
  );
}
