'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/format';

/**
 * Paleta de comandos (briefing 3.9).
 *
 * Cmd/Ctrl+K abre; busca MED por número, nome, CPF, e-mail ou end-to-end e
 * lista ações de navegação (mais as do caso aberto). `g m` vai para MEDs,
 * `g i` para Integrações, `/` abre a busca, `?` mostra os atalhos, Esc fecha.
 */

interface SearchRow {
  id: string;
  medId: string;
  payerName: string | null;
  payerDocument: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface Action {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Cmd K', label: 'Abrir a paleta de comandos' },
  { keys: 'g m', label: 'Ir para MEDs' },
  { keys: 'g i', label: 'Ir para Integrações' },
  { keys: '/', label: 'Buscar' },
  { keys: 'j / k', label: 'Navegar na fila' },
  { keys: 'Enter', label: 'Abrir o item focado' },
  { keys: 'Cmd S', label: 'Salvar o formulário em edição' },
  { keys: 'Esc', label: 'Fechar / descartar edição' },
  { keys: '?', label: 'Esta lista' },
];

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingG = useRef(false);

  const medIdOnPage = useMemo(() => {
    const match = pathname?.match(/^\/meds\/([^/?]+)/);
    return match && match[1] !== 'new' && match[1] !== 'import' ? match[1] : null;
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    setShowShortcuts(false);
    setQuery('');
    setRows([]);
    setActive(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const actions: Action[] = useMemo(() => {
    const list: Action[] = [
      { id: 'go-meds', label: 'Ir para MEDs', hint: 'g m', run: () => navigate('/meds') },
      { id: 'go-integracoes', label: 'Ir para Integrações', hint: 'g i', run: () => navigate('/integracoes') },
      { id: 'go-import', label: 'Importar lote da adquirente', run: () => navigate('/meds/import') },
      { id: 'go-new', label: 'Registrar MED manualmente', run: () => navigate('/meds/new') },
    ];
    if (medIdOnPage) {
      list.unshift(
        {
          id: 'case-defense',
          label: 'Abrir a defesa deste caso',
          run: () => navigate(`/meds/${medIdOnPage}?tab=defesa`),
        },
        {
          id: 'case-pdf',
          label: 'Baixar PDF da defesa',
          run: () => {
            close();
            window.open(`/api/meds/${medIdOnPage}/pdf`, '_blank', 'noreferrer');
          },
        },
        {
          id: 'case-submit',
          label: 'Preparar envio deste caso',
          run: () => navigate(`/meds/${medIdOnPage}?tab=envio`),
        },
      );
    }
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return list;
    return list.filter((action) => action.label.toLowerCase().includes(trimmed));
  }, [close, medIdOnPage, navigate, query]);

  // Busca com debounce.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const timer = setTimeout(() => setRows([]), 0);
      return () => clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ui/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { data: SearchRow[] };
        setRows(payload.data);
        setActive(0);
      } catch {
        // Busca cancelada ou rede indisponível: a paleta continua utilizável.
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, query]);

  // Atalhos globais.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
        setShowShortcuts(false);
        return;
      }
      if (open || isTypingTarget(event.target)) {
        pendingG.current = false;
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setOpen(true);
        setShowShortcuts(true);
        return;
      }
      if (event.key === 'g') {
        pendingG.current = true;
        setTimeout(() => {
          pendingG.current = false;
        }, 800);
        return;
      }
      if (pendingG.current) {
        pendingG.current = false;
        if (event.key === 'm') {
          event.preventDefault();
          router.push('/meds');
        }
        if (event.key === 'i') {
          event.preventDefault();
          router.push('/integracoes');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, router]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const items: { id: string; render: React.ReactNode; run: () => void }[] = [
    ...rows.map((row) => ({
      id: `med-${row.id}`,
      run: () => navigate(`/meds/${row.id}`),
      render: (
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="min-w-0">
            <span className="font-medium">{row.medId}</span>
            <span className="ml-2 text-[var(--color-text-muted)]">
              {row.payerName ?? row.payerDocument ?? ''}
            </span>
          </span>
          <span className="tabular shrink-0 text-xs text-[var(--color-text-secondary)]">
            {formatAmount(row.amount, row.currency)} · {row.status}
          </span>
        </span>
      ),
    })),
    ...actions.map((action) => ({
      id: action.id,
      run: action.run,
      render: (
        <span className="flex w-full items-center justify-between gap-3">
          {action.label}
          {action.hint ? (
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-muted)]">
              {action.hint}
            </kbd>
          ) : null}
        </span>
      ),
    })),
  ];

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(items.length - 1, current + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(28_27_25/0.32)] px-4 pt-[12vh]"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="w-full max-w-[560px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-popover)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {showShortcuts ? (
          <div className="p-4">
            <p className="mb-3 text-[13px] font-semibold">Atalhos de teclado</p>
            <ul className="divide-y divide-[var(--color-border)]">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.keys} className="flex h-9 items-center justify-between text-[13px]">
                  <span className="text-[var(--color-text-secondary)]">{shortcut.label}</span>
                  <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-[11px]">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar MED por número, nome, CPF, e-mail ou end-to-end…"
              aria-label="Buscar"
              className="h-12 w-full border-b border-[var(--color-border)] px-4 text-[14px] outline-none placeholder:text-[var(--color-text-muted)]"
            />
            <ul role="listbox" aria-label="Resultados" className="max-h-[320px] overflow-y-auto p-1.5">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-[var(--color-text-muted)]">
                  {query.trim().length >= 2
                    ? 'Nada encontrado com esse termo.'
                    : 'Digite para buscar um MED, ou escolha uma ação.'}
                </li>
              ) : (
                items.map((item, index) => (
                  <li key={item.id} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onClick={item.run}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] ${
                        index === active
                          ? 'bg-[var(--color-surface-active)]'
                          : 'hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      {item.render}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex h-8 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 text-[11px] text-[var(--color-text-muted)]">
              <span>↑↓ navega · Enter abre · Esc fecha</span>
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="hover:text-[var(--color-text)]"
              >
                Atalhos ?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
