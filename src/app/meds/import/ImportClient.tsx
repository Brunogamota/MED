'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  confirmImportAction,
  previewImportAction,
  type ImportPreviewState,
} from '@/app/meds/actions';

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
  CREATED: 'bg-[var(--color-success-subtle)] text-[var(--color-success)]',
  DUPLICATE: 'bg-[#f4f4f5] text-[#3f3f46]',
  SKIPPED: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]',
  FAILED: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]',
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex h-11 items-center border-b border-[var(--color-border)] px-4">
        <h2 className="text-[13px] font-semibold text-[var(--color-text)]">{title}</h2>
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
              <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Arquivo CSV
              </span>
              <input
                type="file"
                name="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-2 py-1 text-xs"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Data de abertura do lote
              </span>
              <input
                type="datetime-local"
                name="defaultOpenedAt"
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 text-sm"
              />
              <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">
                Usada só nas linhas em que o arquivo não traz a data.
              </span>
            </label>
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Referência do lote
              </span>
              <input
                type="text"
                name="batchReference"
                placeholder="lote-29-08 / arquivo da adquirente"
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 text-sm"
              />
              <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">
                Fica gravada na procedência das evidências importadas.
              </span>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Ou cole o conteúdo aqui
            </span>
            <textarea
              name="csv"
              rows={6}
              placeholder={'MED ID;Valor;Data da compra;Data abertura;Prazo;Motivo;Nome do cliente;CPF\nMED-001;R$ 349,90;10/08/2026 14:32;20/08/2026;05/09/2026;Produto não recebido;Maria Souza;12345678909'}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 font-mono text-xs"
            />
          </label>

          <button
            type="submit"
            disabled={previewPending}
            className="mt-3 inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {previewPending ? 'Analisando…' : 'Analisar arquivo'}
          </button>
        </Panel>
      </form>

      {state?.error ? (
        <p className="rounded-md bg-[var(--color-danger-subtle)] px-3 py-2 text-[13px] text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      {parsed?.fatalError ? (
        <p className="rounded-md bg-[var(--color-danger-subtle)] px-3 py-2 text-[13px] text-[var(--color-danger)]">{parsed.fatalError}</p>
      ) : null}

      {parsed && !parsed.fatalError ? (
        <Panel title="2. Conferencia">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-[var(--color-text-muted)]">Colunas reconhecidas: </span>
              {parsed.recognized.map((entry) => (
                <span
                  key={entry.field}
                  className="mr-1 inline-block rounded bg-[var(--color-success-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--color-success)]"
                >
                  {entry.header} &rarr; {entry.field}
                </span>
              ))}
            </div>
            {parsed.ignored.length > 0 ? (
              <div>
                <span className="text-[var(--color-text-muted)]">Colunas ignoradas: </span>
                {parsed.ignored.map((header) => (
                  <span
                    key={header}
                    className="mr-1 inline-block rounded bg-[#f4f4f5] px-1.5 py-0.5 text-[11px] text-[#3f3f46]"
                  >
                    {header}
                  </span>
                ))}
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  Colunas não reconhecidas são ignoradas em vez de encaixadas em algum campo.
                </span>
              </div>
            ) : null}
            <p className="text-[var(--color-text-muted)]">
              {parsed.rows.length} linha(s) lida(s), {importable} pronta(s) para importar,{' '}
              {parsed.rows.length - importable} com pendência.
            </p>
          </div>

          <div className="mt-3 max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface)]">
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
                    <tr key={row.line} className={row.errors.length > 0 ? 'bg-[var(--color-warning-subtle)]' : ''}>
                      <Td>{row.line}</Td>
                      <Td>
                        {result?.id ? (
                          <Link
                            href={`/meds/${result.id}`}
                            className="text-[var(--color-primary)] hover:underline"
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
                          <span className="text-[10px] text-[var(--color-text-muted)]">pronta</span>
                        )}
                        {(result?.messages ?? row.errors).map((message) => (
                          <span
                            key={message}
                            className="block text-[10px] text-[var(--color-text-muted)]"
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
                className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-40"
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
            className="mt-2 inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
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
    <th className="h-9 border-b border-[var(--color-border)] px-2 text-left text-xs font-medium text-[var(--color-text-muted)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-[var(--color-border)] px-2 py-1.5 align-top">
      {children}
    </td>
  );
}
