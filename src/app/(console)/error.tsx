'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Erro recuperável: diz o que aconteceu em linguagem do operador e oferece a
 * saída — tentar de novo ou voltar à fila. Nunca um código de status seco.
 *
 * E mostra o identificador da falha. Sem ele, "algo falhou" e tudo o que
 * sobra de uma quebra em produção: quem opera não tem o que reportar, e quem
 * mantém não tem o que procurar no log. O `digest` e o que o servidor registra
 * junto do erro de verdade — a mensagem em si o Next apaga em produção, de
 * proposito, para nao vazar interno numa tela.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No navegador de quem opera isto e o unico registro que sobra.
    console.error('Falha ao carregar a tela:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 py-24 text-center">
      <p className="text-sm font-semibold text-foreground">
        Não foi possível carregar esta tela
      </p>
      <p className="text-sm text-muted-foreground">
        Algo falhou ao buscar os dados. Nada foi perdido — os registros do caso continuam
        intactos.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tentar de novo
        </button>
        <Link
          href="/meds"
          className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Voltar à fila
        </Link>
      </div>

      {error.digest || error.message ? (
        <div className="mt-6 w-full rounded-md border bg-muted/40 p-3 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Para reportar
          </p>
          <p className="mt-1 select-all break-all font-mono text-[11px] text-muted-foreground">
            {error.digest ? `digest ${error.digest}` : error.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
