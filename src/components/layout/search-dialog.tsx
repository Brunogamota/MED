'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { NAV_GROUPS } from '@/navigation/sidebar-items';
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

const NAV_TARGETS = NAV_GROUPS.flatMap((group) =>
  group.items
    .filter((item) => item.url)
    .map((item) => ({ id: item.id, group: group.label, title: item.title, url: item.url as string, icon: item.icon })),
);

export function SearchDialog() {
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
      <Button
        onClick={() => setOpen(true)}
        variant="link"
        className="px-0! font-normal text-muted-foreground hover:no-underline"
      >
        <Search data-icon="inline-start" />
        Buscar
        <kbd className="ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

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
                  <Icon />
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
