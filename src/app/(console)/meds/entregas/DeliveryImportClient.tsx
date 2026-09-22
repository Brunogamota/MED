'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { FileDropField } from '@/components/ui/file-drop';
import { SubmitButton } from '@/components/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Panel, MetricCell, MetricStrip } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import {
  importDeliveryLogAction,
  type DeliveryImportState,
} from '@/app/(console)/meds/actions';
import type { DeliveryOutcomeKind } from '@/services/deliveryImportService';

const MAX_BYTES = 5 * 1024 * 1024;

const KIND_LABEL: Record<DeliveryOutcomeKind, string> = {
  RECORDED: 'Registrado',
  NOT_DELIVERED: 'Não entregue',
  UNMATCHED: 'Sem MED',
  INVALID: 'Linha inválida',
};

const KIND_TONE: Record<DeliveryOutcomeKind, string> = {
  RECORDED: 'text-emerald-700 dark:text-emerald-400',
  NOT_DELIVERED: 'text-destructive',
  UNMATCHED: 'text-muted-foreground',
  INVALID: 'text-amber-700 dark:text-amber-400',
};

export function DeliveryImportClient() {
  const [state, action] = useActionState<DeliveryImportState | null, FormData>(
    importDeliveryLogAction,
    null,
  );
  const report = state?.report ?? null;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel title="Arquivo do provedor">
        <form action={action} className="space-y-4">
          <FileDropField
            name="file"
            label="Log de envio"
            extensions={['.csv', '.tsv', '.txt']}
            maxBytes={MAX_BYTES}
            hint="Export do provedor de e-mail. Precisa ter a coluna de message-id; as de primeiro acesso e URL do produto entram quando existem."
          />
          <SubmitButton>Importar e registrar</SubmitButton>
        </form>
      </Panel>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Não deu para importar</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {report ? (
        <>
          <MetricStrip>
            <MetricCell label="Linhas no arquivo" value={report.total} />
            <MetricCell
              label="Entregas registradas"
              value={report.recorded}
              tone={report.recorded > 0 ? 'success' : 'neutral'}
            />
            <MetricCell
              label="Com primeiro acesso"
              value={report.withFirstAccess}
              tone={report.withFirstAccess > 0 ? 'success' : 'neutral'}
            />
            <MetricCell label="Sem casamento" value={report.unmatched} />
          </MetricStrip>

          {report.withFirstAccess > 0 ? (
            <Alert>
              <AlertTitle>
                {report.withFirstAccess} caso
                {report.withFirstAccess > 1 ? 's' : ''} com primeiro acesso registrado
              </AlertTitle>
              <AlertDescription>
                É a evidência que responde “não recebi”: mostra que o comprador usou o que
                comprou. Entrega de e-mail sozinha só prova que a mensagem chegou.
              </AlertDescription>
            </Alert>
          ) : null}

          <Panel flush title={`Resultado por linha (${report.lines.length})`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Linha</TableHead>
                  <TableHead>MED</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="w-32">Situação</TableHead>
                  <TableHead>O que aconteceu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.lines.map((line) => (
                  <TableRow key={`${line.line}-${line.medId ?? 'x'}`}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {line.line}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{line.medId ?? '—'}</TableCell>
                    <TableCell className="max-w-56 truncate">
                      {line.customerEmail ?? '—'}
                    </TableCell>
                    <TableCell className={cn('font-medium', KIND_TONE[line.kind])}>
                      {KIND_LABEL[line.kind]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{line.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>

          {report.medsWithoutDelivery.length > 0 ? (
            <Panel
              title={`MEDs sem entrega registrada neste arquivo (${report.medsWithoutDelivery.length})`}
              footer="Ou nenhuma linha mencionou o MED, ou a linha existia e não era entrega. Nos dois casos a defesa não pode afirmar que houve comunicação — e saber disso antes de contestar é o ponto."
            >
              <ul className="flex flex-wrap gap-2">
                {report.medsWithoutDelivery.map((med) => (
                  <li key={med.id}>
                    <Link
                      href={`/meds/${med.id}`}
                      className="inline-flex rounded-md border px-2 py-1 font-mono text-xs hover:bg-accent"
                    >
                      {med.medId}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
