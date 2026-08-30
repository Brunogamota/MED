import Link from 'next/link';
import { ImportClient } from '@/app/meds/import/ImportClient';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-3">
          <Link
            href="/meds"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ← MEDs
          </Link>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Importar MEDs em lote</h1>
        </div>
        <p className="mt-1 max-w-[75ch] text-[13px] text-[var(--color-text-muted)]">
          Suba o arquivo que a adquirente envia. O sistema reconhece cabeçalhos em português,
          aceita separador por ponto e vírgula ou vírgula, e interpreta datas no formato
          brasileiro. Linha com dado ilegível é reportada e não entra: importar um valor adivinhado
          seria inventar um fato. Reimportar o mesmo arquivo não duplica nada.
        </p>
      </div>

      <ImportClient />
    </div>
  );
}
