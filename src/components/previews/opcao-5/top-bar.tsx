'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, ChevronsUpDown, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import { O5_FONT_VARS } from './fonts';
import { HEADING, O5_VARS } from './theme';

const BASE = '/preview/bulls/opcao-5';

type Aba = 'painel' | 'meds' | 'comprovantes';

const ABAS: { id: Aba; label: string; href: string }[] = [
  { id: 'painel', label: 'Painel', href: BASE },
  { id: 'meds', label: 'MEDs', href: `${BASE}#fila` },
  { id: 'comprovantes', label: 'Comprovantes', href: `${BASE}/comprovante` },
];

/**
 * Barra superior em vez de trilho lateral: marca à esquerda, abas em pílula no
 * centro e a troca de conta à direita. Abaixo de `md` as pílulas descem para
 * uma segunda linha e rolam na horizontal.
 */
export function TopBar({ active }: { active: Aba }) {
  return (
    <header
      data-print-hide
      className="sticky top-0 z-40 border-b border-border bg-background/55 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
        <Link
          href={BASE}
          className="order-1 flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-(--o5-brand) to-(--o5-violet) shadow-[0_0_24px_-4px_rgb(168_85_247/0.8)]">
            <ShieldCheck className="size-4.5 text-white" strokeWidth={2.25} aria-hidden />
          </span>
          <span className={cn(HEADING, 'text-[15px] font-semibold text-foreground')}>
            Defesa de MED
          </span>
        </Link>

        <nav
          aria-label="Seções do console"
          className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:order-2 md:mx-auto md:w-auto md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max items-center gap-1 rounded-full border border-border bg-white/[0.03] p-1">
            {ABAS.map((aba) => {
              const isActive = aba.id === active;
              return (
                <li key={aba.id} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="o5-aba-ativa"
                      aria-hidden
                      className="absolute inset-0 rounded-full border border-white/15 bg-linear-to-b from-white/[0.14] to-white/[0.06] shadow-[0_0_20px_-6px_rgb(168_85_247/0.9)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Link
                    href={aba.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative z-10 flex h-8 items-center rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {aba.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="order-2 ml-auto md:order-3 md:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="group flex h-10 items-center gap-2.5 rounded-full border border-border bg-white/[0.04] py-1 pr-3 pl-1 text-left transition-colors outline-none hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Trocar de conta. Conta ativa: Bulls Cash"
            >
              <span
                aria-hidden
                className={cn(
                  HEADING,
                  'flex size-8 items-center justify-center rounded-full bg-linear-to-br from-(--o5-lilac) to-(--o5-violet) text-[11px] font-bold text-white',
                )}
              >
                BC
              </span>
              <span className="hidden flex-col leading-tight sm:flex">
                <span className="text-[13px] font-semibold text-foreground">Bulls Cash</span>
                <span className="text-[11px] text-muted-foreground">Conta ativa</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              style={O5_VARS}
              className={cn(O5_FONT_VARS, 'w-56 border border-border p-1.5 backdrop-blur-2xl')}
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Contas
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2.5 rounded-lg px-2 py-2">
                <span
                  aria-hidden
                  className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-(--o5-lilac) to-(--o5-violet) text-[10px] font-bold text-white"
                >
                  BC
                </span>
                <span className="flex-1 text-sm font-medium">Bulls Cash</span>
                <Check className="size-4 text-(--o5-lilac)" aria-label="Conta ativa" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
