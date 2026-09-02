import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/med/StatusBadge';
import { scorePercent } from '@/lib/dashboard';
import { countdownText, formatAmount, hoursUntil } from '@/lib/format';
import { sortByUrgency } from '@/lib/urgency';
import type { MedListRow } from '@/infra/repositories/types';

/**
 * Os casos mais urgentes, na mesma ordem da fila.
 *
 * A ordenação é a de `urgencyCompare` — o painel não inventa um critério
 * proprio de prioridade, senao ele e a fila discordariam sobre o que fazer
 * primeiro.
 */
export function QueuePreview({ rows, now }: { rows: MedListRow[]; now: Date }) {
  const top = sortByUrgency(rows, now).slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">Fila de trabalho</CardTitle>
        <CardDescription>Os casos mais urgentes primeiro</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/meds">
              Ver a fila
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {top.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhum MED aberto. Importe o lote da adquirente para começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MED</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-32">Score</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((row) => {
                const score = scorePercent(row);
                const hours = hoursUntil(row.med.responseDeadlineAt, now);

                return (
                  <TableRow key={row.med.id}>
                    <TableCell>
                      <Link href={`/meds/${row.med.id}`} className="font-medium hover:underline">
                        {row.med.medId}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {row.med.payer.name ?? 'Pagador não informado'}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {row.med.requestingInstitution ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.med.amount, row.med.currency)}
                    </TableCell>
                    <TableCell>
                      {score === null ? (
                        <span className="text-muted-foreground text-xs">sem defesa</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Progress value={score} className="h-1.5" />
                          <span className="w-8 text-right text-xs tabular-nums">{score}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        hours !== null && hours >= 0 && hours < 24
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground'
                      }
                    >
                      {countdownText(hours)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.med.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
