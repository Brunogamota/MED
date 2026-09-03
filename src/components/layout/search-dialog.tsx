'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { RAIL_SECTIONS } from '@/navigation/sidebar-sections';
import { formatAmount } from '@/lib/format';

/**
 * Busca do console (Cmd/Ctrl+K).
 *
 * Duas coisas ao mesmo tempo: navegação pelas telas e busca de MED por
 * número, nome, CPF ou end-to-end, servida por `/api/ui/search`. A busca só
 * dispara com 2+ caracteres e é cancelada quando o operador continua
 * digitando — nenhuma resposta atrasada sobrescreve uma consulta mais nova.
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

/** Toda tela que existe de verdade, achatada a partir da navegação. */
const NAV_TARGETS = RAIL_SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) =>
    group.items
      .filter((item) => item.href && !item.href.includes('#'))
      .map((item) => ({
        id: `${section.id}-${item.id}`,
        group: section.title,
        title: item.label,
        url: item.href as string,
        icon: item.icon,
      })),
  ),
);

export function SearchTrigger() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  // O resultado carrega o termo que o produziu: assim uma resposta que chega
  // atrasada nunca aparece sob um texto que o operador já mudou.
  const [result, setResult] = React.useState<{ term: string; rows: SearchRow[] }>({
    term: '',
    rows: [],
  });

  const term = query.trim();
  const rows = result.term === term ? result.rows : [];

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/ui/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { data: [] }))
        .then((body: { data?: SearchRow[] }) => setResult({ term, rows: body.data ?? [] }))
        .catch(() => {
          /* Busca cancelada ou fora do ar: a lista de navegação continua servindo. */
        });
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const go = (url: string) => {
    setOpen(false);
    setQuery('');
    router.push(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="flex h-10 w-full items-center rounded-lg border border-neutral-800 px-3 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
      >
        <Search className="size-4 shrink-0" />
        <span className="ml-2 flex-1 text-left text-sm">Buscar</span>
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-800 px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setQuery('');
        }}
        title="Buscar"
        description="Busque um MED ou vá para uma tela"
      >
        {/* A filtragem é do servidor: o cmdk não pode reordenar nem esconder
            resultados que a busca já decidiu. */}
        <Command shouldFilter={false}>
        <CommandInput
          placeholder="Número do MED, nome, CPF, end-to-end…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>

          {rows.length > 0 ? (
            <>
              <CommandGroup heading="MEDs">
                {rows.map((row) => (
                  <CommandItem key={row.id} value={row.id} onSelect={() => go(`/meds/${row.id}`)}>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="font-medium tabular-nums">{row.medId}</span>
                      <span className="truncate text-muted-foreground">
                        {row.payerName ?? 'Pagador não informado'}
                        {row.payerDocument ? ` · ${row.payerDocument}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                      {formatAmount(row.amount, row.currency)} · {row.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          <CommandGroup heading="Ir para">
            {NAV_TARGETS.filter(
              (target) => term.length < 2 || target.title.toLowerCase().includes(term.toLowerCase()),
            ).map((target) => {
              const Icon = target.icon;
              return (
                <CommandItem key={target.id} value={target.id} onSelect={() => go(target.url)}>
                  {Icon ? <Icon size={16} /> : null}
                  <span>{target.title}</span>
                  <span className="ml-auto text-muted-foreground text-xs">{target.group}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
