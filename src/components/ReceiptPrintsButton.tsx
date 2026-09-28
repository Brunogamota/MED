'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Baixa cada comprovante da pagina como PNG, todos num .zip.
 *
 * Quem gera a imagem e o navegador de quem opera, a partir do que a pagina ja
 * mostra: nada e montado de novo aqui. A peca sai larga (1000px, em 2x), com os
 * campos em tres colunas, como a instituicao costuma pedir.
 */
export function ReceiptPrintsButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function baixar() {
    setBusy(true);
    const lote = document.querySelector<HTMLElement>('[data-lote-comprovantes]');
    try {
      const [{ toBlob }, { default: JSZip }] = await Promise.all([
        import('html-to-image'),
        import('jszip'),
      ]);
      const cards = [...document.querySelectorAll<HTMLElement>('[data-print-name]')];
      if (cards.length === 0) {
        setStatus('Nenhum comprovante nesta página.');
        return;
      }
      lote?.style.setProperty('max-width', '1000px');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const zip = new JSZip();
      const usados = new Map<string, number>();
      for (const [index, card] of cards.entries()) {
        setStatus(`Gerando ${index + 1} de ${cards.length}…`);
        const base = card.dataset.printName ?? `comprovante-${index + 1}`;
        const vez = (usados.get(base) ?? 0) + 1;
        usados.set(base, vez);
        const blob = await toBlob(card, { pixelRatio: 2, cacheBust: true });
        if (blob) zip.file(`${vez > 1 ? `${base}_${vez}` : base}.png`, blob);
      }
      const arquivo = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'comprovantes.zip';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`${cards.length} print${cards.length > 1 ? 's' : ''} baixado${cards.length > 1 ? 's' : ''}.`);
    } catch {
      setStatus('Não foi possível gerar os prints. Tente de novo.');
    } finally {
      lote?.style.removeProperty('max-width');
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" size="sm" onClick={baixar} disabled={busy}>
        {busy ? 'Gerando…' : 'Baixar prints (.zip)'}
      </Button>
      {status ? <span className="text-muted-foreground text-xs">{status}</span> : null}
    </div>
  );
}
