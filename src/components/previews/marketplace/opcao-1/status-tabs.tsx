'use client';

import { motion } from 'motion/react';
import {
  AlarmClockIcon,
  CircleCheckIcon,
  FileWarningIcon,
  InboxIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { cn } from '@/lib/cn';

/**
 * Segunda faixa do cabeçalho (a partir do "Tabs with Icons", 21st.dev 24990):
 * recortes da fila por situação, cada um com ícone e contagem.
 */

export type FilaVisao = 'todas' | 'vencendo' | 'prontas' | 'sem-evidencia' | 'enviadas';

const ABAS: { value: FilaVisao; label: string; icon: LucideIcon; count: number; tone?: 'warning' }[] = [
  { value: 'todas', label: 'Todas', icon: InboxIcon, count: RESUMO.emAberto },
  { value: 'vencendo', label: 'Vencendo', icon: AlarmClockIcon, count: RESUMO.vencendo24h, tone: 'warning' },
  { value: 'prontas', label: 'Prontas', icon: CircleCheckIcon, count: RESUMO.prontos },
  { value: 'sem-evidencia', label: 'Sem evidência', icon: FileWarningIcon, count: RESUMO.semEvidencia },
  { value: 'enviadas', label: 'Enviadas no mês', icon: SendIcon, count: RESUMO.enviadosMes },
];

export function StatusTabs({
  value,
  onValueChange,
}: {
  value: FilaVisao;
  onValueChange: (v: FilaVisao) => void;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-[1440px] overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 lg:px-6">
        <Tabs
          value={value}
          onValueChange={(v) => {
            const aba = ABAS.find((a) => a.value === v);
            if (aba) onValueChange(aba.value);
          }}
          className="gap-0"
        >
          <TabsList
            variant="line"
            aria-label="Situação das contestações"
            className="h-12! gap-1 p-0"
          >
            {ABAS.map((aba) => {
              const ativa = value === aba.value;
              return (
                <TabsTrigger
                  key={aba.value}
                  value={aba.value}
                  className={cn(
                    'relative h-12! flex-none gap-2 rounded-none border-0 px-3 text-[13.5px] font-medium text-(--o1-ink-3) after:hidden hover:text-foreground data-active:text-foreground',
                    '[&_svg:not([class*=size-])]:size-4',
                  )}
                >
                  <aba.icon className={cn('size-4', ativa ? 'text-primary' : 'text-(--o1-ink-3)')} />
                  {aba.label}
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-medium tabular-nums transition-colors',
                      ativa
                        ? 'bg-primary text-primary-foreground'
                        : aba.tone === 'warning'
                          ? 'bg-(--o1-warning-bg) text-(--o1-warning)'
                          : 'bg-secondary text-(--o1-ink-2)',
                    )}
                  >
                    {aba.count.toLocaleString('pt-BR')}
                  </span>
                  {ativa ? (
                    <motion.span
                      layoutId="o1-tab-active"
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
