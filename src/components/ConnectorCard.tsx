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
    <div className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-active)] text-[13px] font-semibold text-[var(--color-text-secondary)]"
          >
            {connector.name[0]}
          </span>
          <div>
            <p className="text-[13px] font-semibold">{connector.name}</p>
            <StatusDot tone={tone}>{CONNECTOR_STATE_LABEL[connector.state]}</StatusDot>
          </div>
        </div>
      </div>

      <p className="mt-3 flex-1 text-xs text-[var(--color-text-secondary)]">
        <span className="text-[var(--color-text-muted)]">Preenche: </span>
        {connector.fills}
      </p>

      {connector.state === 'CONNECTED' ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          {connector.lastSyncAt
            ? `Última sincronização ${formatDateTime(connector.lastSyncAt)}`
            : 'Ativo — recebe dados conforme chegam'}
        </p>
      ) : submitted ? (
        <p className="mt-3 rounded-md bg-[var(--color-warning-subtle)] px-3 py-2 text-xs text-[var(--color-warning)]">
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
                className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {credential.label}
              </label>
              <input
                id={`${connector.id}-${credential.name}`}
                name={credential.name}
                type={credential.kind === 'secret' ? 'password' : 'text'}
                required
                autoComplete="off"
                className="h-8 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-[13px]"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)]"
            >
              Validar conexão
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-md px-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex h-8 w-fit items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)]"
        >
          Conectar
        </button>
      )}
    </div>
  );
}
