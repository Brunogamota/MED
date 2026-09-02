'use client';

import { useState, type ReactNode } from 'react';

/**
 * Campos vazios atrás de um clique (briefing 2.6): o peso visual do bloco
 * reflete o que está preenchido, não o esquema do banco. Os campos ocultos
 * continuam no DOM do lado do servidor — só a exibição é adiada.
 */
export function HiddenFields({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return <>{children}</>;
  return (
    <>
      <div hidden={!open}>{children}</div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mt-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open
          ? 'Ocultar campos vazios'
          : `Mostrar ${count} ${count === 1 ? 'campo vazio' : 'campos vazios'}`}
      </button>
    </>
  );
}
