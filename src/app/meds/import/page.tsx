import Link from 'next/link';
import { ImportClient } from '@/app/meds/import/ImportClient';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/meds" className="text-xs text-[var(--color-ink-muted)] hover:underline">
          &larr; MEDs
        </Link>
        <h1 className="text-lg font-semibold">Importar MEDs em lote</h1>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)]">
        Suba o arquivo que a adquirente envia. O sistema reconhece cabecalhos em portugues, aceita
        separador por ponto e virgula ou virgula, e interpreta datas no formato brasileiro. Linha
        com dado ilegivel e reportada e nao entra: importar um valor adivinhado seria inventar um
        fato. Reimportar o mesmo arquivo nao duplica nada.
      </p>

      <ImportClient />
    </div>
  );
}
