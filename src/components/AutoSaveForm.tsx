'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Fim dos botões "Salvar seção" (briefing 3.5): o formulário salva sozinho.
 *
 * - Campo alterado + blur → submit silencioso quando o formulário é válido.
 * - `Salvo` discreto por 2 segundos após persistir; altura reservada, sem
 *   layout shift.
 * - Formulário sujo e inválido → aviso do que falta, sem popup nativo.
 * - Cmd/Ctrl+S salva; Esc descarta a edição do campo atual (volta ao valor
 *   persistido) — sem tocar no que já foi salvo.
 *
 * O submit vai para a mesma server action de antes: validação Zod, auditoria
 * e transição de status continuam idênticas às da API.
 */

type SaveState = 'idle' | 'saving' | 'saved' | 'invalid';

function StatusText({ state }: { state: SaveState }) {
  const { pending } = useFormStatus();
  if (pending || state === 'saving') {
    return <span className="text-xs text-[var(--color-text-muted)]">Salvando…</span>;
  }
  if (state === 'saved') {
    return <span className="text-xs text-[var(--color-success)]">Salvo</span>;
  }
  if (state === 'invalid') {
    return (
      <span className="text-xs text-[var(--color-warning)]">
        Preencha os campos obrigatórios para salvar
      </span>
    );
  }
  return null;
}

function PendingWatcher({ onSettle }: { onSettle: () => void }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) onSettle();
    wasPending.current = pending;
  }, [pending, onSettle]);
  return null;
}

export function AutoSaveForm({
  action,
  children,
  className,
}: {
  action: (form: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const [state, setState] = useState<SaveState>('idle');

  const trySubmit = useCallback(() => {
    const form = formRef.current;
    if (!form || !dirtyRef.current) return;
    if (form.checkValidity()) {
      dirtyRef.current = false;
      setState('saving');
      form.requestSubmit();
    } else {
      setState('invalid');
    }
  }, []);

  const onSettle = useCallback(() => {
    setState('saved');
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onInput = () => {
      dirtyRef.current = true;
      setState((current) => (current === 'invalid' ? 'idle' : current));
    };

    const onFocusOut = () => {
      // Deixa o foco assentar (clique em outro campo/elemento) antes de salvar.
      setTimeout(trySubmit, 0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        trySubmit();
      }
      if (event.key === 'Escape') {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.value = target.defaultValue;
          dirtyRef.current = false;
          setState('idle');
          target.blur();
        }
      }
    };

    form.addEventListener('input', onInput);
    form.addEventListener('focusout', onFocusOut);
    form.addEventListener('keydown', onKeyDown);
    return () => {
      form.removeEventListener('input', onInput);
      form.removeEventListener('focusout', onFocusOut);
      form.removeEventListener('keydown', onKeyDown);
    };
  }, [trySubmit]);

  return (
    <form ref={formRef} action={action} className={className} data-autosave>
      <PendingWatcher onSettle={onSettle} />
      <div className="flex h-4 justify-end" aria-live="polite">
        <StatusText state={state} />
      </div>
      {children}
    </form>
  );
}
