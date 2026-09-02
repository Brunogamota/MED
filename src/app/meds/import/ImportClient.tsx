'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  confirmImportAction,
  previewImportAction,
  type ImportPreviewState,
} from '@/app/meds/actions';
import { DateTimeField } from '@/components/fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Importacao em dois passos: analisar e depois confirmar.
 *
 * A analise nao grava nada. O operador ve quais colunas foram reconhecidas,
 * quais foram ignoradas e quais linhas nao serao importadas, antes de qualquer
 * escrita — e nenhuma linha com problema entra "consertada".
 */

const OUTCOME_LABEL: Record<string, string> = {
  CREATED: 'Criado',
  DUPLICATE: 'Já existia',
  SKIPPED: 'Não importado',
  FAILED: 'Falhou',
};

const OUTCOME_TONE: Record<string, string> = {
  CREATED: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  DUPLICATE: 'bg-accent text-muted-foreground',
  SKIPPED: 'bg-amber-600/10 text-amber-700 dark:text-amber-400',
  FAILED: 'bg-destructive/10 text-destructive',
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ImportClient() {
  const [preview, runPreview, previewPending] = useActionState<ImportPreviewState | null, FormData>(
    previewImportAction,
    null,
  );
  const [confirmed, runConfirm, confirmPending] = useActionState<
    ImportPreviewState | null,
    FormData
  >(confirmImportAction, null);

  const state = confirmed ?? preview;
  const parsed = state?.parsed ?? null;
  const report = confirmed?.report ?? null;
  const importable = parsed?.rows.filter((row) => row.errors.length === 0).length ?? 0;

  return (
    <div className="space-y-4">
      <form action={runPreview} className="space-y-4">
        <Panel title="1. Arquivo da adquirente">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="import-file">Arquivo CSV</Label>
              <Input id="import-file" type="file" name="file" accept=".csv,.tsv,.txt,text/csv" />
            </div>

            <DateTimeField
              label="Data de abertura do lote"
              name="defaultOpenedAt"
              hint="Usada só nas linhas em que o arquivo não traz a data."
            />

            <div className="grid gap-1.5">
              <Label htmlFor="import-reference">Referência do lote</Label>
              <Input
                id="import-reference"
                name="batchReference"
                placeholder="lote-29-08 / arquivo da adquirente"
              />
              <p className="text-muted-foreground text-xs">
                Fica gravada na procedência das evidências importadas.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-1.5">
            <Label htmlFor="import-csv">Ou cole o conteúdo aqui</Label>
            <Textarea
              id="import-csv"
              name="csv"
              rows={6}
              className="font-mono text-xs"
              placeholder={'MED ID;Valor;Data da compra;Data abertura;Prazo;Motivo;Nome do cliente;CPF\nMED-001;R$ 349,90;10/08/2026 14:32;20/08/2026;05/09/2026;Produto não recebido;Maria Souza;12345678909'}
            />
          </div>

          <Button type="submit" variant="outline" disabled={previewPending} className="mt-4">
            {previewPending ? 'Analisando…' : 'Analisar arquivo'}
          </Button>
        </Panel>
      </form>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      {parsed?.fatalError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{parsed.fatalError}</p>
      ) : null}

      {parsed && !parsed.fatalError ? (
        <Panel title="2. Conferencia">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Colunas reconhecidas: </span>
              {parsed.recognized.map((entry) => (
                <span
                  key={entry.field}
                  className="mr-1 inline-block rounded bg-emerald-600/10 px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                >
                  {entry.header} &rarr; {entry.field}
                </span>
              ))}
            </div>
            {parsed.ignored.length > 0 ? (
              <div>
                <span className="text-muted-foreground">Colunas ignoradas: </span>
                {parsed.ignored.map((header) => (
                  <span
                    key={header}
                    className="mr-1 inline-block rounded bg-accent px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {header}
                  </span>
                ))}
                <span className="block text-xs text-muted-foreground">
                  Colunas não reconhecidas são ignoradas em vez de encaixadas em algum campo.
                </span>
              </div>
            ) : null}
            <p className="text-muted-foreground">
              {parsed.rows.length} linha(s) lida(s), {importable} pronta(s) para importar,{' '}
              {parsed.rows.length - importable} com pendência.
            </p>
          </div>

          <div className="mt-3 max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <Th>Linha</Th>
                  <Th>MED</Th>
                  <Th>Valor</Th>
                  <Th>Compra</Th>
                  <Th>Cliente</Th>
                  <Th>Motivo</Th>
                  <Th>Situação</Th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row) => {
                  const result = report?.results.find((entry) => entry.line === row.line);
                  const outcome = result?.outcome ?? (row.errors.length > 0 ? 'SKIPPED' : null);
                  return (
                    <tr key={row.line} className={row.errors.length > 0 ? 'bg-amber-600/10' : ''}>
                      <Td>{row.line}</Td>
                      <Td>
                        {result?.id ? (
                          <Link
                            href={`/meds/${result.id}`}
                            className="font-medium hover:underline"
                          >
                            {row.medId}
                          </Link>
                        ) : (
                          (row.medId ?? '-')
                        )}
                      </Td>
                      <Td>
                        {row.amount === null
                          ? '-'
                          : row.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                      </Td>
                      <Td>
                        {row.transactionAt
                          ? new Date(row.transactionAt).toLocaleString('pt-BR', {
                              timeZone: 'America/Sao_Paulo',
                            })
                          : '-'}
                      </Td>
                      <Td>{row.payerName ?? '-'}</Td>
                      <Td>{row.reason}</Td>
                      <Td>
                        {outcome ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${OUTCOME_TONE[outcome]}`}
                          >
                            {OUTCOME_LABEL[outcome]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">pronta</span>
                        )}
                        {(result?.messages ?? row.errors).map((message) => (
                          <span
                            key={message}
                            className="block text-[10px] text-muted-foreground"
                          >
                            {message}
                          </span>
                        ))}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!report ? (
            <form action={runConfirm} className="mt-3">
              <input type="hidden" name="csv" value={state?.csv ?? ''} />
              <input type="hidden" name="defaultOpenedAt" value={state?.defaultOpenedAt ?? ''} />
              <input type="hidden" name="batchReference" value={state?.batchReference ?? ''} />
              <button
                type="submit"
                disabled={confirmPending || importable === 0}
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {confirmPending ? 'Importando…' : `Importar ${importable} MED(s)`}
              </button>
            </form>
          ) : null}
        </Panel>
      ) : null}

      {report ? (
        <Panel title="3. Resultado">
          <p className="text-sm">
            {report.created} criado(s), {report.duplicated} já existia(m), {report.skipped} não
            importado(s), {report.failed} com falha.
          </p>
          <Link
            href="/meds"
            className="mt-2 inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver os MEDs
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-9 border-b border-border px-2 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-border px-2 py-1.5 align-top">
      {children}
    </td>
  );
}
