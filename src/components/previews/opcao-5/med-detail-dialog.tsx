'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Clock, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  COMPROVANTE,
  STATUS_LABEL,
  brl,
  prazo,
  type PreviewMed,
} from '@/components/previews/fixtures';
import { cn } from '@/lib/cn';
import { O5_FONT_VARS } from './fonts';
import { ProdutoBadge, StatusDot, iniciais } from './med-bits';
import { HEADING, MONO, O5_VARS, TONE_CHIP, TONE_TEXT, prazoTone, scoreTone } from './theme';
import { Tracker } from './tracker';

/**
 * Modal de detalhe do Stocks Dashboard (21st.dev 29424): número de destaque e
 * uma lista de definição em vez de seis cartões. As etapas do pedido só
 * aparecem para o caso que tem registro de envio (mesmo end-to-end do
 * comprovante); nos demais, só os campos do próprio caso.
 */
export function MedDetailDialog({
  med,
  open,
  onOpenChange,
}: {
  med: PreviewMed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const temEnvio = med?.e2e === COMPROVANTE.e2e;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={O5_VARS}
        className={cn(
          O5_FONT_VARS,
          'max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 shadow-[0_40px_120px_-30px_rgb(168_85_247/0.45)] backdrop-blur-2xl sm:max-w-[520px]',
        )}
      >
        {med && (
          <>
            <div className="relative overflow-hidden border-b border-border px-6 pt-6 pb-5">
              <span
                aria-hidden
                className="absolute -top-20 -right-10 size-56 rounded-full bg-(--o5-brand)/25 blur-3xl"
              />
              <DialogClose
                className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full border border-border bg-white/[0.04] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
              >
                <X className="size-4" aria-hidden />
              </DialogClose>
              <DialogHeader className="relative flex-row items-center gap-3.5">
                <span
                  aria-hidden
                  className={cn(
                    HEADING,
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-linear-to-br from-(--o5-brand)/40 to-(--o5-violet)/20 text-sm font-bold text-white',
                  )}
                >
                  {iniciais(med.pagador)}
                </span>
                <div className="min-w-0 text-left">
                  <DialogTitle className={cn(HEADING, 'text-xl font-semibold text-foreground')}>
                    {med.pagador}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 flex items-center gap-2 text-[13px]">
                    <StatusDot status={med.status} />
                    {STATUS_LABEL[med.status]}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="relative mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className={cn(HEADING, 'text-[32px] leading-none font-semibold text-foreground tabular-nums')}>
                  {brl(med.valor)}
                </span>
                <div className="flex items-center gap-2 pb-0.5">
                  <ProdutoBadge produto={med.produto} />
                  <span
                    className={cn(
                      MONO,
                      'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium',
                      TONE_CHIP[prazoTone(med.prazoHoras)],
                    )}
                  >
                    <Clock className="size-3" aria-hidden />
                    {prazo(med.prazoHoras)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-semibold text-(--o5-text-2)">Score de evidência</span>
                  <span className={cn(MONO, 'text-muted-foreground')}>
                    <span className={cn('text-base font-semibold', TONE_TEXT[scoreTone(med.score)])}>
                      {med.score}
                    </span>
                    /100
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label="Score de evidência"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={med.score}
                  className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]"
                >
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-(--o5-violet) via-(--o5-brand) to-(--o5-lilac) shadow-[0_0_16px_rgb(168_85_247/0.7)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${med.score}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">End-to-end</dt>
                  <dd className={cn(MONO, 'mt-1 text-[13px] break-all text-foreground')}>{med.e2e}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Prazo de resposta</dt>
                  <dd className={cn(MONO, 'mt-1 text-sm font-semibold', TONE_TEXT[prazoTone(med.prazoHoras)])}>
                    {prazo(med.prazoHoras)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Produto</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{med.produto}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{STATUS_LABEL[med.status]}</dd>
                </div>
              </dl>

              {temEnvio && (
                <section aria-labelledby="o5-etapas" className="border-t border-border pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 id="o5-etapas" className={cn(HEADING, 'text-sm font-semibold text-foreground')}>
                      {COMPROVANTE.tipo}
                    </h3>
                    <span className={cn(MONO, 'text-[11px] text-muted-foreground')}>
                      {COMPROVANTE.idMensagem}
                    </span>
                  </div>
                  <Tracker etapas={COMPROVANTE.etapas} variant="dark" label={COMPROVANTE.tipo} />
                  <Link
                    href="/preview/bulls/opcao-5/comprovante"
                    className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-(--o5-violet) to-(--o5-brand) text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(168_85_247/0.9)] transition-[filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Abrir comprovante de envio
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </section>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
