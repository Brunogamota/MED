'use client';

import Link from 'next/link';

/**
 * Erro recuperável: diz o que aconteceu em linguagem do operador e oferece a
 * saída — tentar de novo ou voltar à fila. Nunca um código de status seco.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 py-24 text-center">
      <p className="text-[14px] font-semibold text-[var(--color-text)]">
        Não foi possível carregar esta tela
      </p>
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Algo falhou ao buscar os dados. Nada foi perdido — os registros do caso continuam
        intactos.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Tentar de novo
        </button>
        <Link
          href="/meds"
          className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium hover:bg-[var(--color-surface-hover)]"
        >
          Voltar à fila
        </Link>
      </div>
    </div>
  );
}
