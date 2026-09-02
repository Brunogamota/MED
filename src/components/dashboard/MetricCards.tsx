import { Banknote, Gauge, Inbox, Send, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmount } from '@/lib/format';
import type { DashboardMetrics } from '@/lib/dashboard';

/**
 * Faixa de indicadores do painel.
 *
 * Cada cartao mostra um numero que existe no sistema e uma linha que diz o
 * que ele significa para o operador. Onde nao ha dado — nenhuma defesa
 * gerada ainda — o cartao diz isso, em vez de exibir zero.
 */

function MetricCard({
  icon,
  label,
  value,
  badge,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: { text: string; tone: 'default' | 'destructive' | 'secondary'; icon?: React.ReactNode };
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            {icon}
          </div>
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-3xl leading-none tracking-tight tabular-nums">{value}</div>
          {badge ? (
            <Badge variant={badge.tone === 'default' ? undefined : badge.tone}>
              {badge.icon}
              {badge.text}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <MetricCard
        icon={<Inbox className="size-4" />}
        label="MEDs abertos"
        value={String(metrics.open)}
        badge={{
          text: formatAmount(metrics.openAmount, metrics.currency),
          tone: 'secondary',
          icon: <Banknote className="size-3" />,
        }}
        hint="Casos que ainda dependem de você"
      />

      <MetricCard
        icon={<Timer className="size-4" />}
        label="Vencendo em 48h"
        value={String(metrics.dueSoon)}
        badge={
          metrics.hasUrgent
            ? { text: 'menos de 24h', tone: 'destructive', icon: <TrendingDown className="size-3" /> }
            : undefined
        }
        hint={metrics.hasUrgent ? 'Há caso com prazo virando hoje' : 'Nenhum caso virando hoje'}
      />

      <MetricCard
        icon={<Send className="size-4" />}
        label="Prontos para envio"
        value={String(metrics.readyToSubmit)}
        badge={
          metrics.readyToSubmit > 0
            ? { text: 'sem bloqueio', tone: 'default', icon: <TrendingUp className="size-3" /> }
            : undefined
        }
        hint="Defesa gerada e evidências completas"
      />

      <MetricCard
        icon={<Gauge className="size-4" />}
        label="Score médio"
        value={metrics.averageScore === null ? '—' : `${metrics.averageScore}%`}
        hint={
          metrics.averageScore === null
            ? 'Nenhuma defesa gerada ainda'
            : 'Completude média das defesas geradas'
        }
      />
    </div>
  );
}
