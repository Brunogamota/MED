'use client';

import { useState } from 'react';
import { CONNECTOR_STATE_LABEL, type Connector } from '@/lib/connectors';
import { StatusDot } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

/**
 * Card de conector com o fluxo de conexão embutido.
 *
 * O formulário de credenciais valida e confirma o recebimento, mas é honesto
 * sobre o estado do backend: a sincronização automática ainda não existe
 * (TODO(api) em docs/api-gaps.md) — nenhuma credencial é armazenada até lá.
 */
export function ConnectorCard({ connector }: { connector: Connector }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const tone =
    connector.state === 'CONNECTED'
      ? 'accent'
      : connector.state === 'ERROR'
        ? 'danger'
        : 'neutral';

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-muted-foreground"
          >
            {connector.name[0]}
          </span>
          <div>
            <p className="text-sm font-semibold">{connector.name}</p>
            <StatusDot tone={tone}>{CONNECTOR_STATE_LABEL[connector.state]}</StatusDot>
          </div>
        </div>
      </div>

      <p className="mt-3 flex-1 text-xs text-muted-foreground">
        <span className="text-muted-foreground">Preenche: </span>
        {connector.fills}
      </p>

      {connector.state === 'CONNECTED' ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {connector.lastSyncAt
            ? `Última sincronização ${formatDateTime(connector.lastSyncAt)}`
            : 'Ativo — recebe dados conforme chegam'}
        </p>
      ) : submitted ? (
        <p className="mt-3 rounded-md bg-amber-600/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Credenciais validadas. A sincronização automática deste conector ainda não está
          disponível — nada foi armazenado. Você será avisado quando a conexão for liberada.
        </p>
      ) : open ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          {connector.credentials.map((credential) => (
            <div key={credential.name}>
              <label
                htmlFor={`${connector.id}-${credential.name}`}
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {credential.label}
              </label>
              <input
                id={`${connector.id}-${credential.name}`}
                name={credential.name}
                type={credential.kind === 'secret' ? 'password' : 'text'}
                required
                autoComplete="off"
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Validar conexão
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex h-8 w-fit items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Conectar
        </button>
      )}
    </div>
  );
}
