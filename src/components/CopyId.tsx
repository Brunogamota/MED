'use client';

import { useState } from 'react';

/**
 * Id técnico: mono 12px, truncado no meio, botão de copiar no hover.
 * O valor completo vive no title e no clipboard — a tela mostra o suficiente
 * para reconhecer, não para transcrever.
 */
export function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const display = value.length > 20 ? `${value.slice(0, 9)}…${value.slice(-8)}` : value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard indisponível (permissão/contexto): sem fallback ruidoso.
    }
  };

  return (
    <span className="group inline-flex items-center gap-1">
      <span className="font-mono text-xs text-[var(--color-text-secondary)]" title={value}>
        {display}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copiado' : `Copiar ${value}`}
        className="rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity duration-[120ms] hover:text-[var(--color-text)] focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    </span>
  );
}
