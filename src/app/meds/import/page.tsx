import { ImportClient } from '@/app/meds/import/ImportClient';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Importar MEDs em lote"
        parent={{ href: '/meds', label: 'MEDs' }}
        description="Suba o arquivo que a adquirente envia. O sistema reconhece cabeçalhos em português, aceita separador por ponto e vírgula ou vírgula, e interpreta datas no formato brasileiro. Linha com dado ilegível é reportada e não entra: importar um valor adivinhado seria inventar um fato. Reimportar o mesmo arquivo não duplica nada."
      />
      <ImportClient />
    </div>
  );
}
