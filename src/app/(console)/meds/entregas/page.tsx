import { PageHeader } from '@/components/layout/page-header';
import { DeliveryImportClient } from './DeliveryImportClient';

export const dynamic = 'force-dynamic';

/**
 * Importacao do log de envio do provedor.
 *
 * Separada da importacao de MEDs de proposito: aquela **cria** casos, esta so
 * anexa registro a casos que ja existem. Misturar as duas numa tela so faria o
 * operador subir o arquivo errado e nao entender por que nada aconteceu.
 */
export default function EntregasPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        parent={{ href: '/meds', label: 'MEDs' }}
        title="Importar log de envio"
        description="O export do provedor de e-mail vira registro de entrega em cada MED: destino, horário, message-id e, quando o arquivo traz, o primeiro acesso do comprador."
      />
      <DeliveryImportClient />
    </div>
  );
}
