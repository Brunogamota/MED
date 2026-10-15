'use client';

import { motion, type Variants } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MEDS, brl, prazo } from '@/components/previews/fixtures';
import { StatusBadge, iniciais, prazoTone } from '@/components/previews/opcao-3/status';
import { cn } from '@/lib/cn';

/* "Recent activity" do 21st.dev 8253, como extrato das contestações. */

const list: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } };
const row: Variants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export function Op3RecentList() {
  const recentes = MEDS.slice(0, 5);
  return (
    <Card className="op3-elev h-full gap-3 rounded-2xl border border-border py-5 ring-0">
      <CardHeader className="px-5">
        <CardTitle className="text-[15px] font-semibold text-foreground">Contestações recentes</CardTitle>
        <CardDescription className="text-(--op3-ink-3)">Pagador, valor e prazo de resposta</CardDescription>
        <CardAction>
          <a
            href="#fila"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            Ver todas
            <ArrowUpRight className="size-3.5" />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
        <motion.ul initial="hidden" animate="visible" variants={list}>
          {recentes.map((med) => (
            <motion.li
              key={med.id}
              variants={row}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary"
              >
                {iniciais(med.pagador)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{med.pagador}</p>
                <p className="truncate text-xs text-(--op3-ink-3)">
                  {med.produto}
                  <span aria-hidden className="mx-1.5">
                    ·
                  </span>
                  <span className={cn('font-medium', prazoTone(med.prazoHoras))}>prazo {prazo(med.prazoHoras)}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold text-foreground tabular-nums">{brl(med.valor)}</span>
                <StatusBadge status={med.status} className="h-5 px-2 text-[11px]" />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </CardContent>
    </Card>
  );
}
