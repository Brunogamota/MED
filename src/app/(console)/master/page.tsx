import { listAccounts } from '@/services/accountService';
import { MasterClient } from './MasterClient';

export const dynamic = 'force-dynamic';
// Importação em blocos e lote de defesa: cada chamada é curta, mas os envios
// de todas as empresas rodam numa só.
export const maxDuration = 300;

/** Conta Master: importar, registrar envios e defender todas as empresas juntas. */
export default async function MasterPage() {
  const accounts = await listAccounts();
  return (
    <MasterClient
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        skin: account.skin,
        brandColor: account.brandColor,
      }))}
    />
  );
}
