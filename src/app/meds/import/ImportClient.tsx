'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  confirmImportAction,
  previewImportAction,
  type ImportPreviewState,
} from '@/app/meds/actions';
import { DateTimeField } from '@/components/fields';

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
    <section className="rounded-lg border bg-card">
      <header className="flex h-11 items-center border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
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
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block md:col-span-1">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Arquivo CSV
              </span>
              <input
                type="file"
                name="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs"
              />
            </label>
            <DateTimeField
              label="Data de abertura do lote"
              name="defaultOpenedAt"
              hint="Usada só nas linhas em que o arquivo não traz a data."
            />
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Referência do lote
              </span>
              <input
                type="text"
                name="batchReference"
                placeholder="lote-29-08 / arquivo da adquirente"
                className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm"
              />
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Fica gravada na procedência das evidências importadas.
              </span>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ou cole o conteúdo aqui
            </span>
            <textarea
              name="csv"
              rows={6}
              placeholder={'MED ID;Valor;Data da compra;Data abertura;Prazo;Motivo;Nome do cliente;CPF\nMED-001;R$ 349,90;10/08/2026 14:32;20/08/2026;05/09/2026;Produto não recebido;Maria Souza;12345678909'}
              className="mt-1 w-full rounded border bg-background px-2 py-1.5 font-mono text-xs"
            />
          </label>

          <button
            type="submit"
            disabled={previewPending}
            className="mt-3 inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {previewPending ? 'Analisando…' : 'Analisar arquivo'}
          </button>
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
