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
import { importDeliveryLogAction, type DeliveryImportState } from '@/app/(console)/meds/actions';
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

/**
 * `texts` vem preenchido quando o log subiu pela importacao de MEDs: o arquivo
 * ja foi lido la, e aqui so falta dizer que mensagem ele registra.
 */
export function DeliveryImportClient({ texts }: { texts?: string[] } = {}) {
  const [state, action] = useActionState<DeliveryImportState | null, FormData>(
    importDeliveryLogAction,
    null,
  );
  const report = state?.report ?? null;
  const touched = report?.touchedMedIds ?? [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {texts ? null : (
      <Alert>
        <AlertTitle>Suba os arquivos todos de uma vez</AlertTitle>
        <AlertDescription>
          O export costuma vir partido: um arquivo de cobranças (tem valor, horário e id da
          transação) e um de entregas (tem a URL do produto e o primeiro acesso). É a cobrança
          que identifica o MED — o de entregas sozinho não casa com nada. Arraste os dois
          juntos, ou o export único se o seu vier assim.
        </AlertDescription>
      </Alert>
      )}

      <Panel title="Arquivo do provedor">
        <form action={action} className="space-y-4">
          {texts ? (
            <>
              {texts.map((conteudo, index) => (
                <input key={index} type="hidden" name="csv" value={conteudo} />
              ))}
              <p className="text-muted-foreground text-sm">
                {texts.length} arquivo{texts.length > 1 ? 's' : ''} já lido
                {texts.length > 1 ? 's' : ''}. Escolha a mensagem e registre.
              </p>
            </>
          ) : (
          <FileDropField
            name="file"
            label="Export do provedor"
            extensions={['.csv', '.tsv', '.txt', '.xlsx', '.zip']}
            maxBytes={MAX_BYTES}
            multiple
            hint="Pode subir os arquivos de uma vez — cobranças e entregas juntos, ou um export único. Se vier zipado, sobe o .zip mesmo. Cada coluna que existir é aproveitada: id da transação, e-mail, message-id, URL do produto, primeiro acesso."
          />
          )}
          <div className="grid gap-2">
            <Label htmlFor="modelo">Que mensagem este log registra</Label>
            <select
              id="modelo"
              name="modelo"
              defaultValue="AUTO"
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="AUTO">Automático: físico ou digital de cada venda</option>
              <option value="ACCESS_DELIVERY">Entrega de acesso (digital)</option>
              <option value="ORDER_TRACKING">Acompanhamento do pedido (físico)</option>
              <option value="PURCHASE_CONFIRMATION">Confirmação de compra</option>
              <option value="DELIVERY_CONFIRMATION">Confirmação de entrega</option>
              <option value="GENERIC">Mensagem ao cliente</option>
            </select>
            <p className="text-muted-foreground text-sm">
              No automático, cada venda sai com a mensagem do tipo do produto: digital com o
              acesso liberado, físico com o botão para acompanhar o pedido até a entrega. O tipo
              vem da coluna do arquivo, quando existe, ou do MED; sem tipo, sai como digital.
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
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox id="substituirComprovantes" name="substituirComprovantes" />
            <div className="grid gap-1 leading-snug">
              <Label htmlFor="substituirComprovantes">
                Substituir os comprovantes antigos destes casos
              </Label>
              <p className="text-muted-foreground text-sm">
                Apaga os comprovantes que o caso já tinha e que não vieram deste arquivo. Use
                quando este log é o certo e o anterior estava errado: duas versões do mesmo
                envio, com message-ids diferentes, derrubam a defesa na conferência.
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
            {report.receiptsPhysical > 0 ? (
              <MetricCell label="Físicos (acompanhamento)" value={report.receiptsPhysical} />
            ) : null}
            {report.receiptsDigital > 0 ? (
              <MetricCell label="Digitais (acesso)" value={report.receiptsDigital} />
            ) : null}
            <MetricCell
              label="Acessos ligados"
              value={report.accessLinked}
              tone={report.accessLinked > 0 ? 'success' : 'neutral'}
            />
            {report.duplicated > 0 ? (
              <MetricCell label="Repetidos entre arquivos" value={report.duplicated} />
            ) : null}
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

          {report.duplicated > 0 ? (
            <Alert>
              <AlertTitle>
                {report.duplicated} linha{report.duplicated > 1 ? 's' : ''} repetida
                {report.duplicated > 1 ? 's' : ''} entre os arquivos
              </AlertTitle>
              <AlertDescription>
                O export do provedor costuma vir partido <em>e</em> junto — um arquivo de
                cobranças, um de entregas, e um “completo” que é os dois somados. Subir os três é
                o certo a fazer, e o mesmo envio aparece mais de uma vez. Cada envio entrou uma
                vez só, pelo message-id, que não muda depois que a mensagem é enfileirada. Nada
                foi perdido: são {report.total} envios distintos.
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

          {touched.length > 0 ? (
            <Panel title="Próximo passo: conferir">
              {/*
                Importar entrega nao envia nada a instituicao, e o status
                continua o que a evidencia diz. Marcar como Enviado e ato
                separado, na fila, depois da conferencia.
              */}
              <p className="text-muted-foreground text-sm">
                Registro anexado a {touched.length} caso{touched.length > 1 ? 's' : ''}. Nenhum
                foi marcado como enviado à instituição. Confira os comprovantes antes de enviar.
              </p>
              {report?.replacedReceipts ? (
                <p className="mt-2 text-sm">
                  {report.replacedReceipts} comprovante{report.replacedReceipts > 1 ? 's' : ''}{' '}
                  antigo{report.replacedReceipts > 1 ? 's' : ''} apagado
                  {report.replacedReceipts > 1 ? 's' : ''}.
                </p>
              ) : null}
              {report?.returnedToQueue ? (
                <p className="mt-2 text-sm">
                  {report.returnedToQueue} caso{report.returnedToQueue > 1 ? 's' : ''} que estava
                  {report.returnedToQueue > 1 ? 'm' : ''} como Enviado voltou
                  {report.returnedToQueue > 1 ? 'ram' : ''} para a fila.{' '}
                  <Link href="/meds" className="font-medium hover:underline">
                    Ver a fila
                  </Link>
                </p>
              ) : null}
              <Link
                href={`/meds/comprovantes?ids=${touched.join(',')}`}
                className="mt-3 inline-block font-medium text-sm hover:underline"
              >
                Conferir os comprovantes ({touched.length})
              </Link>
            </Panel>
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
