'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { FileDropField } from '@/components/ui/file-drop';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  ACCESS_LINKED: 'Acesso ligado',
  ACCESS_BEFORE_CHARGE: 'Acesso anterior',
  NOT_DELIVERED: 'Não entregue',
  UNMATCHED: 'Sem MED',
  INVALID: 'Linha inválida',
};

const KIND_TONE: Record<DeliveryOutcomeKind, string> = {
  RECORDED: 'text-emerald-700 dark:text-emerald-400',
  ACCESS_LINKED: 'text-emerald-700 dark:text-emerald-400',
  ACCESS_BEFORE_CHARGE: 'text-amber-700 dark:text-amber-400',
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
      <Alert>
        <AlertTitle>Suba os arquivos todos de uma vez</AlertTitle>
        <AlertDescription>
          O export costuma vir partido: um arquivo de cobranças (tem valor, horário e id da
          transação) e um de entregas (tem a URL do produto e o primeiro acesso). É a cobrança
          que identifica o MED — o de entregas sozinho não casa com nada. Arraste os dois
          juntos, ou o export único se o seu vier assim.
        </AlertDescription>
      </Alert>

      <Panel title="Arquivo do provedor">
        <form action={action} className="space-y-4">
          <FileDropField
            name="file"
            label="Export do provedor"
            extensions={['.csv', '.tsv', '.txt', '.xlsx', '.zip']}
            maxBytes={MAX_BYTES}
            multiple
            hint="Pode subir os arquivos de uma vez — cobranças e entregas juntos, ou um export único. Se vier zipado, sobe o .zip mesmo. Cada coluna que existir é aproveitada: id da transação, e-mail, message-id, URL do produto, primeiro acesso."
          />
          <div className="grid gap-2">
            <Label htmlFor="modelo">Que mensagem este log registra</Label>
            <select
              id="modelo"
              name="modelo"
              defaultValue="ACCESS_DELIVERY"
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="ACCESS_DELIVERY">Entrega de acesso</option>
              <option value="PURCHASE_CONFIRMATION">Confirmação de compra</option>
              <option value="DELIVERY_CONFIRMATION">Confirmação de entrega</option>
              <option value="GENERIC">Mensagem ao cliente</option>
            </select>
            <p className="text-muted-foreground text-sm">
              Um log de confirmação de compra e um de liberação de acesso são idênticos por
              dentro: os dois trazem message-id, hora e resposta SMTP. Quem sabe qual é você.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox id="gerarComprovantes" name="gerarComprovantes" defaultChecked />
            <div className="grid gap-1 leading-snug">
              <Label htmlFor="gerarComprovantes">
                Gerar o comprovante de cada entrega registrada
              </Label>
              <p className="text-muted-foreground text-sm">
                O log prova que a mensagem foi aceita pelo servidor do destinatário, não o que
                ela dizia. Marcar aqui é você declarar que aqueles envios eram a mensagem
                escolhida acima. A peça sai com a declaração de origem, como toda reconstrução.
              </p>
            </div>
          </div>
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
            <MetricCell label="Comprovantes gerados" value={report.receipts} />
            <MetricCell
              label="Acessos ligados"
              value={report.accessLinked}
              tone={report.accessLinked > 0 ? 'success' : 'neutral'}
            />
            <MetricCell label="Sem casamento" value={report.unmatched} />
            <MetricCell label="MEDs no sistema" value={report.medsConsidered} />
          </MetricStrip>

          {report.unmatched > 0 && report.medsWithPayerName === 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Nenhum MED tem nome de pagador</AlertTitle>
              <AlertDescription>
                São {report.medsConsidered} MEDs no sistema e nenhum com o nome de quem pagou,
                então não há por onde ligar as linhas deste arquivo. O problema está do lado dos
                MEDs, não deste arquivo: reimporte o lote no passo 1 conferindo se a coluna do
                nome (“Nome Debitado”) foi reconhecida.
              </AlertDescription>
            </Alert>
          ) : null}

          {report.withoutMessageId > 0 ? (
            <Alert>
              <AlertTitle>
                {report.withoutMessageId} envio
                {report.withoutMessageId > 1 ? 's' : ''} sem message-id
              </AlertTitle>
              <AlertDescription>
                O dado entrou no caso — destinatário, horário, URL —, mas sem o message-id o
                envio não é conferível na origem, e por isso não virou comprovante. Se o seu
                provedor exporta essa coluna, suba o arquivo com ela e a peça sai.
              </AlertDescription>
            </Alert>
          ) : null}

          {report.anachronistic > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>
                {report.anachronistic} liberaç
                {report.anachronistic > 1 ? 'ões anteriores' : 'ão anterior'} à cobrança
              </AlertTitle>
              <AlertDescription>
                Nesses casos o acesso foi liberado antes da transação contestada existir, então
                não serve como prova de entrega dela — nada é entregue antes de ser comprado. O
                acesso é do mesmo comprador, mas veio de outra operação: outra compra, uma
                renovação ou um plano. Nenhum comprovante foi gerado. Só o estabelecimento sabe
                qual operação foi, e é isso que a defesa precisa dizer.
              </AlertDescription>
            </Alert>
          ) : null}

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
