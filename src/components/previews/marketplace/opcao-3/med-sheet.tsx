'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Package, ReceiptText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { COMPROVANTE, brl, prazo, type PreviewMed } from '@/components/previews/marketplace/fixtures';
import { NOITE_FONT_CLASS, NOITE_STYLE } from './theme';
import { COMPROVANTE_HREF, ScoreMeter, StatusBadge } from './shared';

interface MedSheetProps {
  med: PreviewMed | null;
  onOpenChange: (open: boolean) => void;
  onGerar: (ids: string[]) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[13px] text-(--nc-text-3)">{label}</dt>
      <dd className="text-right text-[13.5px] text-(--nc-text)">{children}</dd>
    </div>
  );
}

export function MedSheet({ med, onOpenChange, onGerar }: MedSheetProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Sheet open={med !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={NOITE_STYLE}
        className={cn(
          NOITE_FONT_CLASS,
          'gap-0 border-(--nc-line) bg-(--nc-surface) font-sans text-(--nc-text) data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]',
        )}
      >
        {med ? (
          <>
            <SheetHeader className="gap-3 border-b border-(--nc-line) p-6 pr-12">
              <p className="text-[11px] font-medium tracking-[0.1em] text-(--nc-coral) uppercase">Contestação MED</p>
              <SheetTitle className="text-xl font-semibold tracking-[-0.02em] text-(--nc-text)">{med.pagador}</SheetTitle>
              <SheetDescription className="sr-only">Resumo do MED de {med.pagador}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={med.status} />
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-full px-2.5 font-mono text-xs tabular-nums ring-1 ring-inset',
                    med.prazoHoras < 24
                      ? 'bg-(--nc-warning)/10 text-(--nc-warning) ring-(--nc-warning)/25'
                      : 'bg-(--nc-surface-3) text-(--nc-text-2) ring-(--nc-line)',
                  )}
                >
                  vence em {prazo(med.prazoHoras)}
                </span>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">Valor contestado</p>
              <p className="mt-1.5 font-mono text-[32px] leading-none font-medium tracking-[-0.02em] tabular-nums">
                {brl(med.valor)}
              </p>

              <div className="mt-6 rounded-(--radius) border border-(--nc-line) bg-(--nc-bg) p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] tracking-[0.08em] text-(--nc-text-3) uppercase">End-to-end</p>
                  <button
                    type="button"
                    onClick={() => copiar(med.e2e)}
                    className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-3) hover:text-(--nc-text)"
                  >
                    {copiado ? <Check aria-hidden className="size-3.5 text-(--nc-success)" /> : <Copy aria-hidden className="size-3.5" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="mt-2 font-mono text-[13px] break-all text-(--nc-text)">{med.e2e}</p>
              </div>

              <dl className="mt-4 divide-y divide-(--nc-line)">
                <Row label="Produto">
                  <span className="inline-flex items-center gap-1.5">
                    {med.produto === 'Físico' ? (
                      <Package aria-hidden className="size-3.5 text-(--nc-text-3)" />
                    ) : (
                      <Download aria-hidden className="size-3.5 text-(--nc-text-3)" />
                    )}
                    {med.produto}
                  </span>
                </Row>
                <Row label="Prazo para resposta">
                  <span className="font-mono tabular-nums">{prazo(med.prazoHoras)}</span>
                </Row>
              </dl>

              <div className="mt-4 rounded-(--radius) border border-(--nc-line) p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] text-(--nc-text-2)">Score de evidência</p>
                  <p className="text-[11px] text-(--nc-text-3)">0–100</p>
                </div>
                <div className="mt-3">
                  <ScoreMeter score={med.score} wide />
                </div>
              </div>
            </div>

            <footer className="flex flex-col gap-2 border-t border-(--nc-line) p-6">
              <button
                type="button"
                onClick={() => onGerar([med.id])}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-(--nc-coral) text-[14px] font-medium text-(--primary-foreground) shadow-[0_8px_24px_-10px_var(--nc-coral)] transition-colors hover:bg-(--nc-coral-hover)"
              >
                <Sparkles aria-hidden className="size-4" />
                Gerar defesa
              </button>
              {med.e2e === COMPROVANTE.e2e ? (
                <Link
                  href={COMPROVANTE_HREF}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-(--nc-line) text-[14px] text-(--nc-text-2) transition-colors hover:bg-(--nc-surface-2) hover:text-(--nc-text)"
                >
                  <ReceiptText aria-hidden className="size-4" />
                  Ver comprovante de envio
                </Link>
              ) : null}
            </footer>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
